# GroupSave ZM – Documentation

GroupSave ZM is a village-banking (chilimba) ledger for savings groups in Zambia. Officers manage the group in a React web app, and members use a member portal, SMS and a USSD menu.

## Contents
1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Getting started](#3-getting-started)
4. [Configuration](#4-configuration)
5. [User guide](#5-user-guide)
6. [API reference](#6-api-reference)
7. [Data model](#7-data-model)
8. [Security](#8-security)
9. [Testing](#9-testing)
10. [Deployment](#10-deployment)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

| Capability | Description |
|---|---|
| Contributions and savings | Record contributions, fines and payouts in an append-only ledger. |
| Loans | Loan requests, guarantors, approval, repayment schedules, late fines. |
| Cycles and share-out | Rules are frozen when a cycle opens. Share-out uses largest-remainder so payouts sum exactly to the pool. |
| Rotating groups | Turn order for the pot, payout per meeting, deferral if the recipient is absent. |
| Meetings | Scheduling, attendance, minutes, online meetings (Jitsi), SMS reminders. |
| Communication | Announcements, group chat, direct messages, polls and votes. |
| Member channels | Member portal (web), SMS codes and confirmations, USSD menu (Africa's Talking). |
| Offline entry | Contributions and attendance queue in the browser (IndexedDB) and sync later. |
| Audit and integrity | Hash-chained postings, reversals of mistakes (including loans), audit log, dispute handling, auditor role. |
| Data retention | A daily job purges short-lived personal data and anonymizes long-gone members. |
| Languages and themes | Web app, SMS and USSD menus in English, Bemba, Nyanja, Tonga, Lozi, Kaonde, Lunda and Luvale (local-language texts are first drafts that need native-speaker review), with light/dark themes. |

Roles: **chairperson**, **treasurer**, **secretary**, **auditor** (read-only) and **member**.

## 2. Architecture

```
 Browser (React + Vite, PWA)          Phone (USSD / SMS)
          │                                  │
          ▼                                  ▼
   nginx / Vite dev  ──►  Express API (Node, ES modules)  ◄── Africa's Talking gateway
                                   │
                                   ▼
                            PostgreSQL 16
```

```
app/
├─ backend/            Express API
│  └─ src/
│     ├─ app.js        Route mounting, rate limits, health check
│     ├─ server.js     Entry point
│     ├─ config.js     Environment configuration
│     ├─ schema.sql    Database schema (applied by migrate)
│     ├─ rules.js      Cycle rules engine, share-out maths
│     ├─ ledger.js     Append-only postings and hash chain
│     ├─ security.js   Encryption, hashing, TOTP
│     ├─ sms.js        SMS sending (Africa's Talking or console)
│     ├─ reminders.js  Scheduled reminders
│     ├─ idempotency.js  Duplicate-request protection (offline retries)
│     ├─ routes/       One file per API area
│     ├─ migrate.js, seed.js, devdb.js
│     └─ test/         Node test runner tests
├─ frontend/           React app (src/pages, offlineQueue.js, i18n, theme)
├─ docker-compose.yml  Local Postgres
├─ compose.prod.yml    Production stack (API, web, db, daily backups)
└─ .env.production.example
```

Frontend routes: `/` dashboard, `/pot`, `/ledger`, `/members`, `/meetings`, `/loans`, `/receipts`, `/disputes`, `/shareout`, `/statements`, `/votes`, `/chat`, `/announcements`, `/notifications`, `/outbox`, `/audit`, `/settings`, `/privacy`.

## 3. Getting started

Prerequisites: Node.js 18+ (the project has been run on a recent Node), npm, and either Docker Desktop or the bundled embedded Postgres.

**1. Database** (pick one)
```powershell
docker compose up -d            # Postgres 16 on port 5432
# or, without Docker:
cd backend; node devdb.js       # embedded Postgres, data stored in ../.pgdata
```

**2. Backend** (http://localhost:4000)
```powershell
cd backend
copy .env.example .env          # then edit the secrets
npm install
npm run migrate                 # create tables
npm run seed                    # demo data (first run only)
npm run dev
```

**3. Frontend** (http://localhost:5173)
```powershell
cd frontend
npm install
npm run dev
```

**Demo accounts** (after seeding), password `password123`:
- Chairperson: `0971000001`
- Treasurer: `0971000002`

Check the API: `GET http://localhost:4000/health`.

## 4. Configuration

Set these in `backend/.env`:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `DATABASE_URL` | `postgres://groupsave:groupsave@localhost:5432/groupsave` | Postgres connection |
| `JWT_SECRET` | dev value | Signs login tokens. **Required in production.** |
| `ENC_KEY` | dev value | Encrypts phone numbers and derives lookup hashes. **Required in production.** |
| `GATEWAY_SECRET` | dev value | Shared secret the USSD gateway sends. **Required in production.** |
| `AT_USERNAME` / `AT_API_KEY` / `AT_SENDER_ID` | `sandbox` / empty / empty | Africa's Talking SMS. With no API key, SMS is printed to the server console. |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origin |
| `APP_URL` | `http://localhost:5173` | Public site address used in SMS join links |
| `RETENTION_*_DAYS`, `RETENTION_ENABLED` | see Data retention | How long each kind of data is kept. See [Data retention](#data-retention). |
| `JITSI_BASE_URL` | `https://meet.jit.si` | Video meeting server. Use your own to keep video private. |

In production the API refuses to start unless `JWT_SECRET`, `ENC_KEY` and `GATEWAY_SECRET` are set. Changing `ENC_KEY` later makes existing encrypted phone numbers unreadable, so back it up.

## 5. User guide

### Officers
- **Register a group / sign in:** the Auth page (phone number and password). Officers can enable TOTP two-factor in Settings/Security.
- **Members:** the chairperson or secretary adds, edits and removes members. Join requests from new members appear here for approval or rejection.
- **Cycles:** the chairperson opens a cycle with its rules (rules are frozen once opened) and closes it to run the share-out. A cycle cannot close while loans are unsettled.
- **Ledger:** officers record contributions, fines and payouts. Postings can't be edited or deleted. Mistakes are corrected with a reversing entry (**Reverse**), including loan payouts and loan repayments.
- **Pot and payments:** see what is collected, who hasn't paid, send reminders, and confirm or reject online payments.
- **Meetings:** create meetings, take attendance, write minutes, send reminders, start an online meeting. In rotating groups, set the turn order and pay out the pot to the next member.
- **Loans:** approve or reject member loan requests, issue loans, record repayments, apply late fines. A loan issued by mistake is undone with **Reverse** on the Ledger page (see [Loan reversals](#loan-reversals)).
- **Receipts:** record mobile-money receipts and match them to members.
- **Disputes:** members raise disputes. The chairperson resolves them.
- **Announcements, polls, chat:** broadcast to the group, optionally by SMS.
- **Reports:** CSV exports of the ledger and savings, per-member statements, and a full JSON group backup (chairperson only).
- **Audit and outbox:** review sign-ins and actions, and retry or delete queued SMS messages.

### Members
- **Sign in** with an SMS code, then set a password. A PIN is set on the first USSD dial.
- **Portal:** balance and savings summary, ledger entries, loans, meetings (join online), announcements, polls, savings goals, chat.
- **Loan requests:** use the loan calculator, submit a request, cancel while pending, and accept or decline guarantor requests.
- **Join a group:** new members search groups by name or location and send a join request.
- **Your data:** download your own data from the portal.

### USSD
Members choose their language on first dial (or with option 6): English, Bemba, Nyanja, Tonga, Lozi, Kaonde, Lunda or Luvale. Menu: 1 balance, 2 loan, 3 next share-out, 4 query last entry, 5 help, 6 language.

Point the Africa's Talking callback at `POST https://<host>/ussd?secret=<GATEWAY_SECRET>`. Local test:
```bash
curl -X POST "http://localhost:4000/ussd?secret=dev-gateway-secret" -d "phoneNumber=+260971000004" -d "text="
```

### Offline entry
Contribution and attendance entries are saved in the browser when offline and sync automatically when the app is open and online. Idempotency keys prevent duplicates. Failed validations show as conflicts to review. Resolve conflicts before closing a cycle or switching devices.

## 6. API reference

All endpoints are JSON and use `Authorization: Bearer <token>` unless noted. Roles listed are the minimum allowed. Auditors can only make GET requests. Officer endpoints reject member-portal tokens, and the reverse. Money is in integer ngwee.

### Public / authentication
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness check |
| POST | `/api/auth/register-group` | Create a group and chairperson |
| POST | `/api/auth/login` | Officer login (rate limited, lockout after 5 failures) |
| GET | `/api/auth/me` | Current officer |
| POST | `/api/auth/password` | Change password |
| POST | `/api/auth/2fa/setup`, `/enable`, `/disable` | TOTP two-factor |
| POST | `/api/portal-auth/request-code`, `/verify-code`, `/login`, `/set-credentials` | Member sign-in |
| GET | `/api/group-join/groups` | Search groups |
| POST | `/api/group-join/requests` | Request to join a group |
| POST | `/ussd?secret=…` | USSD gateway callback |

### Officer API (`/api/...`)
| Area | Endpoints |
|---|---|
| Members `/members` | `GET /`, `POST /` (chair, sec), `PATCH /:id` (chair, sec), `DELETE /:id` (chair) |
| Membership requests `/membership-requests` | `GET /`, `POST /:id/approve`, `POST /:id/reject` (chair, sec) |
| Cycles `/cycles` | `GET /`, `POST /` (chair), `GET/PUT /:id/rotation-order`, `GET /:id/summary`, `GET/POST /:id/meetings`, `GET /:id/verify`, `GET /:id/shareout`, `POST /:id/close` (chair), `DELETE /:id` (chair) |
| Postings `/postings` | `GET /`, `POST /`, `POST /:id/reverse` (contributions, fines, loan payouts and repayments) |
| Loans `/loans` | `GET /`, `GET /:id/schedule`, `POST /`, `POST /:id/repay`, `POST /late-fines` |
| Loan requests `/loan-requests` | `GET /`, `POST /:id/approve`, `POST /:id/reject` |
| Meetings `/meetings` | `GET /`, `GET /:id`, `POST /:id/join`, `/remind`, `/attendance`, `/rotation-payout`, `DELETE /:id` |
| Payments `/payments` | `GET /`, `/pot`, `/unpaid`, `/trend`, `POST /remind-unpaid`, `/:id/confirm`, `/:id/reject` |
| Receipts `/receipts` | `GET /`, `POST /`, `POST /:id/match`, `DELETE /:id` |
| Disputes `/disputes` | `GET /`, `POST /:id/resolve` (chair) |
| Announcements `/announcements` | `GET /`, `POST /`, `DELETE /:id` |
| Chat `/chat` | `/unread`, `/community` (GET, POST, DELETE), `/`, `/:memberId` (GET, POST) |
| Extras `/extras` | `/settings`, `/leaderboard`, `/polls` (+ `/:id/vote`, `/:id/close`), `/minutes/:meetingId`, `/reports` (moderation) |
| Reports `/reports` | `GET /ledger.csv`, `/savings.csv`, `/member/:id`, `/backup.json` (chair) |
| Audit `/audit`, Outbox `/outbox`, Alerts `/alerts`, Ops `/ops/errors` | Audit log, SMS queue (+ `/usage`, `/:id/retry`), alert dismissals, error log (chair) |

### Member portal API (`/api/portal/...`)
`/me`, `/summary`, `/postings`, `/loans`, `/meetings` (+ `/:id/join`), `/messages`, `/announcements`, `/payments` (GET, POST, `/:id/cancel`), `/loan-requests` (GET, POST, `/:id/cancel`), `/loan-calc`, `/guarantee-requests`, `/goals`, `/minutes`, `/polls`, `/leaderboard`, `/chat`, `/community`, `/people`, `/dm/:id`, `/disputes`, `/language`, `/change-pin`, `/change-password`, `/my-data`.

Errors return `{ "error": "message" }` with status 401 (login required or expired), 403 (role not permitted), 404, 409 (duplicate, such as an existing phone number) or 500.

## 7. Data model

Main tables (see `backend/src/schema.sql`): `groups`, `members`, `cycles`, `meetings`, `rotation_turns`, `postings`, `loans`, `schedule_items`, `loan_requests`, `loan_request_approvals`, `payment_receipts`, `online_payments`, `attendance`, `disputes`, `announcements`, `polls`, `poll_votes`, `member_goals`, `group_chat`, `direct_messages`, `chat_messages`, `chat_reports`, `notifications`, `group_join_requests`, `group_applicants`, `member_otps`, `idempotency_keys`, `audit_log`, `error_log`, `alert_dismissals`.

Key design points:
- **Money** is stored as integer ngwee (1 kwacha = 100 ngwee).
- **`postings`** is append-only. A database trigger blocks UPDATE and DELETE. Each row stores a hash of the previous one, and `GET /api/cycles/:id/verify` checks the chain. Posting SMS messages carry a 4-character chain code.
- **Cycle rules** are frozen at open.
- **Phone numbers** are AES-256-GCM encrypted. Lookups use an HMAC hash.

### Loan reversals
Use **Reverse** on a loan payout or loan repayment in the Ledger. A correcting entry is added, and nothing is edited or deleted.
- **Repayment:** the amount is taken back from the latest paid instalments. A settled loan becomes active again. It is refused if the pool no longer holds that money.
- **Loan payout:** allowed only while nothing has been repaid. Reverse the repayments first. The loan then shows as **reversed** and its schedule is removed.
- Both are refused once the cycle is closed, and each entry can be reversed only once.

### Data retention
A daily job (`backend/src/retention.js`) removes personal data that is no longer needed. The ledger, loans and audit log are never touched.

| Data | Kept for (default) | Setting |
|---|---|---|
| SMS log (message text) | 90 days | `RETENTION_NOTIFICATIONS_DAYS` |
| Expired sign-in codes | 1 day | `RETENTION_OTP_DAYS` |
| Offline-retry keys | 30 days | `RETENTION_IDEMPOTENCY_DAYS` |
| Server error log | 90 days | `RETENTION_ERROR_LOG_DAYS` |
| Join requests and applicant phone numbers | 90 days | `RETENTION_JOIN_REQUEST_DAYS` |
| Chat and direct messages | 365 days | `RETENTION_MESSAGES_DAYS` |
| Exited members | anonymized after 365 days | `RETENTION_EXITED_MEMBER_DAYS` |

Anonymizing a member replaces their name with "Former member #id" and wipes their phone number, PIN, passwords, goals and messages. Their ledger entries stay, so the books still add up. It is skipped while the member has an active loan or entries in an open cycle. Each run is recorded in the `retention_runs` table, and each anonymization in the audit log.

Preview with `cd backend; npm run retention -- --dry-run`, apply by hand with `npm run retention`. Set `RETENTION_ENABLED=false` to turn off the daily run.

## 8. Security

- Passwords hashed with bcrypt (cost 12), with password rules.
- Optional TOTP two-factor for officers.
- Lockout for 15 minutes after 5 failed sign-ins. All sign-ins are audited.
- Rate limits on the API (300 requests per window), portal (120) and USSD (300), plus stricter limits on auth endpoints.
- Helmet security headers and a CORS allow-list.
- Separate token scopes for officers and members, so a member token can't reach officer endpoints.
- 15-minute idle sign-out in the browser.
- CSV exports are protected against formula injection.
- Server errors never expose database details.
- Backups contain personal data, so store them securely.

## 9. Testing

```powershell
cd backend
npm test
```

Covers the rules engine, share-out property tests, the hash chain and receipt parsing.

## 10. Deployment

1. Copy `.env.production.example` to `.env.production` and replace every placeholder with a unique, long random value. Keep `DB_PASSWORD` URL-safe (hex is recommended).
2. Set `CORS_ORIGIN` to your public HTTPS origin and put a TLS-terminating reverse proxy in front. The web service listens on `127.0.0.1:8080`.
3. Start the stack:
   ```bash
   docker compose --env-file .env.production -f compose.prod.yml up -d --build
   ```
4. Check health:
   ```bash
   docker compose --env-file .env.production -f compose.prod.yml ps
   ```

Backups: a compressed `pg_dump` is written daily to the `backups` volume and kept for 30 days. The volume is on the same host as the database, so copy backups off-host and test restores regularly. Restore with:
```bash
docker compose --env-file .env.production -f compose.prod.yml exec -T db pg_restore -U groupsave -d groupsave --clean --if-exists < backup.dump
```

There is also a Render config (`.env.render`) and a root `Dockerfile`.

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| `docker` is not recognised | Install Docker Desktop, or use `node devdb.js` in `backend`. |
| `EADDRINUSE` on port 4000 or 5432 | Another instance is already running. Stop it or change `PORT`. |
| Vite opens on 5174 or 5175 | Port 5173 is in use. Use the printed URL, but set `CORS_ORIGIN` to match. |
| Seed fails with a unique-key error | The demo data is already there. Skip `npm run seed`. |
| Login says session expired | The token lasts 12 hours. Sign in again. |
| SMS not arriving | With no `AT_API_KEY`, messages print in the API console. Check the Outbox page for failures. |
| API won't start in production | Set `JWT_SECRET`, `ENC_KEY` and `GATEWAY_SECRET`. |

## Not yet built
Native-speaker review of the local-language texts (see `translations-review.csv`). The audit log and ledger are deliberately kept, so they have no retention job.
