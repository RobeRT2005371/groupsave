# GroupSave ZM

Village banking (chilimba) ledger. React officer app + Node/Express API + PostgreSQL, with a USSD/SMS member channel.

## Run

```bash
docker compose up -d                      # Postgres (or point DATABASE_URL at your own)
cd backend && cp .env.example .env        # then edit the secrets
npm install && npm run migrate && npm run seed && npm run dev
cd ../frontend && npm install && npm run dev   # http://localhost:5173
```

Demo login after seeding: `0971000002` (treasurer) or `0971000001` (chairperson), password `password123`.

## Tests
`cd backend && npm test` (rules engine, share-out property tests, hash chain, receipt parsing).

## Member requests, announcements and exports
- Members can request loans in the member portal; chairpersons and treasurers can approve or reject them on the Loans page.
- New members can enter their name and phone, search groups by name or location, and send a join request without an SMS code. Chairpersons and secretaries review pending requests on the Members page; approval creates the member account, which can then use the regular SMS-code sign-in.
- Officers can post group announcements, optionally queueing an SMS notification for active members.
- Officers can export the ledger as CSV. The chairperson can download a JSON group backup or a member can download their own data from the portal.
- Group backups contain personally identifiable information and should be stored securely.

## Rotating groups and offline entry
- In a rotating group, a chairperson or treasurer sets the active members' turn order on the Meetings page. The next active member in that order receives the meeting's contribution pot; if absent, their turn is deferred. Paid turns are recorded in the ledger, and the order locks after the first payout (new active members are appended).
- Every active member must receive a turn, and all loans must be settled, before a rotating cycle can close. Rotating groups do not receive the accumulating group's cycle-end share-out.
- Contribution entries and attendance submissions are saved in the browser's IndexedDB when the network is unavailable and automatically sync when the app is online. Server idempotency keys protect retries against duplicate ledger entries and fines. Failed validations appear as conflicts for officer review.
- The app caches the signed-in officer profile, roster, cycles, and meetings for up to seven days to support offline entry. This data and unsent entries remain on that browser/device; sign-out warns when writes are still queued. Keep devices locked and avoid shared devices.
- Automatic sync requires the app to be open in the browser. Review and resolve queued conflicts before closing a cycle or switching to a different device.

## Production deployment
The production Docker Compose stack builds the API and frontend images, keeps PostgreSQL off the public network, and writes a compressed `pg_dump` backup daily to the `backups` volume (retained for 30 days).

1. Copy `.env.production.example` to `.env.production` and replace every placeholder with a unique, long random value. Keep `DB_PASSWORD` URL-safe (hex is recommended).
2. Set `CORS_ORIGIN` to the public HTTPS origin and configure a TLS-terminating reverse proxy in front of the stack. The Compose web service listens on `127.0.0.1:8080` by default for a host-local reverse proxy.
3. Start the stack with `docker compose --env-file .env.production -f compose.prod.yml up -d --build`.
4. Confirm service health with `docker compose --env-file .env.production -f compose.prod.yml ps`.

The daily backup volume is on the same host as the database; copy backups off-host and test restore procedures regularly. Restore a dump with `docker compose --env-file .env.production -f compose.prod.yml exec -T db pg_restore -U groupsave -d groupsave --clean --if-exists < backup.dump`.

## Member USSD channel
Point your Africa's Talking USSD callback at `POST https://<host>/ussd?secret=<GATEWAY_SECRET>`.
Without `AT_API_KEY`, SMS confirmations are printed to the server console.
Local test:
```bash
curl -X POST "http://localhost:4000/ussd?secret=dev-gateway-secret" -d "phoneNumber=+260971000004" -d "text="
```

## Design notes
- Money is integer ngwee everywhere. Share-outs use largest-remainder so payouts sum exactly to the pool.
- `postings` is append-only (DB trigger blocks UPDATE/DELETE); corrections are reversing entries; each row hashes the previous one. Every posting SMS carries a 4-character chain code.
- Phone numbers are AES-256-GCM encrypted; lookups use an HMAC hash. Members choose their own PIN on first USSD dial.
- Cycle rules are frozen when the cycle opens.

## Security
- Optional TOTP two-factor for officers (Security page), 5-attempt lockout (15 min), password rules, bcrypt cost 12, 15-minute idle sign-out, rate limits on the API and USSD, CSV export protected against formula injection, all sign-ins audited.

## Not yet built
Bemba/Nyanja menus, reversal of loan postings, data-retention jobs beyond the 90-day notification purge.
