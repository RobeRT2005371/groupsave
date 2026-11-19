CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'accumulating' CHECK (type IN ('accumulating','rotating')),
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  full_name TEXT NOT NULL,
  phone_enc TEXT NOT NULL,
  phone_hash TEXT NOT NULL UNIQUE,
  password_hash TEXT,            -- officers only
  pin_hash TEXT,                 -- set by the member on first USSD dial
  pin_failures INT NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('chairperson','treasurer','secretary','member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','exited')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cycles (
  id SERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  rules JSONB NOT NULL,          -- fixed when the cycle opens
  closed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_cycle ON cycles(group_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  cycle_id INT NOT NULL REFERENCES cycles(id),
  date DATE NOT NULL,
  recorded_by INT NOT NULL REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS rotation_turns (
  cycle_id INT NOT NULL REFERENCES cycles(id),
  member_id INT NOT NULL REFERENCES members(id),
  turn_order INT NOT NULL CHECK (turn_order > 0),
  PRIMARY KEY (cycle_id, member_id),
  UNIQUE (cycle_id, turn_order)
);

-- Append-only ledger. Amounts are signed ngwee from the group's cash perspective.
CREATE TABLE IF NOT EXISTS postings (
  id BIGSERIAL PRIMARY KEY,
  cycle_id INT NOT NULL REFERENCES cycles(id),
  member_id INT NOT NULL REFERENCES members(id),
  meeting_id INT REFERENCES meetings(id),
  type TEXT NOT NULL CHECK (type IN ('contribution','fine','loan_disbursement','loan_repayment','payout')),
  amount BIGINT NOT NULL,
  reverses_id BIGINT REFERENCES postings(id),
  note TEXT,
  recorded_by INT NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ NOT NULL,
  running_balance BIGINT NOT NULL,   -- member's savings after this posting
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS postings_cycle ON postings(cycle_id, id);
CREATE INDEX IF NOT EXISTS postings_member ON postings(member_id);
CREATE UNIQUE INDEX IF NOT EXISTS one_reversal ON postings(reverses_id) WHERE reverses_id IS NOT NULL;

-- Block UPDATE/DELETE on the ledger at the database level.
CREATE OR REPLACE FUNCTION postings_immutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'postings are append-only'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS postings_no_change ON postings;
CREATE TRIGGER postings_no_change BEFORE UPDATE OR DELETE ON postings
  FOR EACH ROW EXECUTE FUNCTION postings_immutable();

CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  cycle_id INT NOT NULL REFERENCES cycles(id),
  member_id INT NOT NULL REFERENCES members(id),
  principal BIGINT NOT NULL,
  rate_bps INT NOT NULL,
  basis TEXT NOT NULL,
  instalments INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','settled')),
  disbursed_at DATE NOT NULL,
  approved_by INT NOT NULL REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS schedule_items (
  id SERIAL PRIMARY KEY,
  loan_id INT NOT NULL REFERENCES loans(id),
  seq INT NOT NULL,
  due_date DATE NOT NULL,
  principal_due BIGINT NOT NULL,
  interest_due BIGINT NOT NULL,
  paid_amount BIGINT NOT NULL DEFAULT 0,
  paid_at DATE,
  late_fined BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS payment_receipts (
  id SERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  text TEXT,                       -- cleared once matched
  amount BIGINT,
  reference TEXT,
  matched_posting_id BIGINT REFERENCES postings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS receipt_ref ON payment_receipts(group_id, reference) WHERE reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  posting_id BIGINT NOT NULL REFERENCES postings(id),
  member_id INT NOT NULL REFERENCES members(id),
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','upheld','rejected')),
  resolution_note TEXT,
  resolved_by INT REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  group_id INT,
  actor INT,
  action TEXT NOT NULL,
  entity TEXT,
  before JSONB,
  after JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id),
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security hardening: lockout and optional TOTP two-factor for officers
ALTER TABLE members ADD COLUMN IF NOT EXISTS failed_logins INT NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;

-- Meetings: attendance and absence fines
CREATE TABLE IF NOT EXISTS attendance (
  meeting_id INT NOT NULL REFERENCES meetings(id),
  member_id INT NOT NULL REFERENCES members(id),
  present BOOLEAN NOT NULL,
  fined BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (meeting_id, member_id)
);

-- Member language for USSD and SMS (en, bem, nya, toi, loz, kqn, lun, lue)
ALTER TABLE members ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'en';

-- One-time SMS codes for member portal sign-in
CREATE TABLE IF NOT EXISTS member_otps (
  id BIGSERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_otps_member ON member_otps(member_id, created_at);

-- Prospective members can request to join one group before receiving a member account.
CREATE TABLE IF NOT EXISTS group_applicants (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_enc TEXT NOT NULL,
  phone_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_join_requests (
  id BIGSERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  applicant_id INT NOT NULL REFERENCES group_applicants(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  decided_by INT REFERENCES members(id),
  member_id INT UNIQUE REFERENCES members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS group_join_requests_one_pending_applicant
  ON group_join_requests(applicant_id) WHERE status='pending';
CREATE INDEX IF NOT EXISTS group_join_requests_applicant ON group_join_requests(applicant_id, created_at);
CREATE INDEX IF NOT EXISTS group_join_requests_group ON group_join_requests(group_id, status, created_at);

-- Online meetings: each gets an unguessable room name on a Jitsi Meet server
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS online BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS room TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS start_time TEXT;

-- Reminders
ALTER TABLE schedule_items ADD COLUMN IF NOT EXISTS reminded BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ;

-- Notifications an officer has dismissed
CREATE TABLE IF NOT EXISTS alert_dismissals (
  member_id INT NOT NULL REFERENCES members(id),
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, key)
);

-- Idempotency keys make offline writes safe to retry after an uncertain connection failure.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  group_id INT NOT NULL REFERENCES groups(id),
  actor_id INT NOT NULL REFERENCES members(id),
  key TEXT NOT NULL,
  route TEXT NOT NULL,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, actor_id, key)
);

-- Loan requests (members ask, officers decide) and announcements
CREATE TABLE IF NOT EXISTS loan_requests (
  id BIGSERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id),
  cycle_id INT NOT NULL REFERENCES cycles(id),
  amount BIGINT NOT NULL,
  instalments INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  note TEXT,
  decided_by INT REFERENCES members(id),
  decided_at TIMESTAMPTZ,
  loan_id INT REFERENCES loans(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loan_requests_member ON loan_requests(member_id, status);

CREATE TABLE IF NOT EXISTS announcements (
  id BIGSERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  author_id INT NOT NULL REFERENCES members(id),
  body TEXT NOT NULL,
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS announcements_group ON announcements(group_id, id);
CREATE INDEX IF NOT EXISTS members_group ON members(group_id);
CREATE INDEX IF NOT EXISTS cycles_group ON cycles(group_id, status);
CREATE INDEX IF NOT EXISTS notifications_pending ON notifications(status, next_attempt_at);

-- Members choose their PIN when they sign up; it is copied to the member record on approval.
ALTER TABLE group_applicants ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- Members report mobile-money contributions made online; an officer confirms them against the real money before they hit the ledger.
CREATE TABLE IF NOT EXISTS online_payments (
  id BIGSERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  cycle_id INT NOT NULL REFERENCES cycles(id),
  member_id INT NOT NULL REFERENCES members(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','cancelled')),
  posting_id BIGINT REFERENCES postings(id),
  decided_by INT REFERENCES members(id),
  decided_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS online_payments_group ON online_payments(group_id, status, id);
CREATE INDEX IF NOT EXISTS online_payments_member ON online_payments(member_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS online_payments_ref ON online_payments(group_id, lower(reference)) WHERE status IN ('pending','confirmed');

-- Two-way messages between a member and their group's officers. One thread per member.
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  member_id INT NOT NULL REFERENCES members(id),   -- whose thread this is
  sender_id INT NOT NULL REFERENCES members(id),
  from_officer BOOLEAN NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_thread ON chat_messages(member_id, id);
CREATE INDEX IF NOT EXISTS chat_group ON chat_messages(group_id, id);

-- Optional longer password a member can choose for the web portal (the 4-digit PIN keeps working for USSD).
ALTER TABLE members ADD COLUMN IF NOT EXISTS portal_password_hash TEXT;

-- An officer opens a 24-hour window in which a member may choose their own PIN/password from the sign-in screen.
ALTER TABLE members ADD COLUMN IF NOT EXISTS pin_setup_until TIMESTAMPTZ;

-- Read-only auditor role: can view the books but never change anything.
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
ALTER TABLE members ADD CONSTRAINT members_role_check CHECK (role IN ('chairperson','treasurer','secretary','auditor','member'));

-- Unexpected server errors, so officers hear about problems before members report them.
CREATE TABLE IF NOT EXISTS error_log (
  id BIGSERIAL PRIMARY KEY,
  method TEXT, path TEXT, message TEXT, stack TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Member-to-member talk: one open room per group, plus private one-to-one messages (officers cannot read those).
CREATE TABLE IF NOT EXISTS group_chat (
  id BIGSERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  sender_id INT NOT NULL REFERENCES members(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_chat_group ON group_chat(group_id, id);
CREATE TABLE IF NOT EXISTS direct_messages (
  id BIGSERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  sender_id INT NOT NULL REFERENCES members(id),
  recipient_id INT NOT NULL REFERENCES members(id),
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dm_pair ON direct_messages(sender_id, recipient_id, id);
CREATE INDEX IF NOT EXISTS dm_inbox ON direct_messages(recipient_id, read_at);

-- ===== Loans: two-officer approval, guarantors, online loan repayments =====
ALTER TABLE groups ADD COLUMN IF NOT EXISTS loan_two_approvals_over BIGINT;       -- ngwee; NULL = a single officer may approve
ALTER TABLE groups ADD COLUMN IF NOT EXISTS show_leaderboard BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS guarantor_id INT REFERENCES members(id);
ALTER TABLE loan_requests ADD COLUMN IF NOT EXISTS guarantor_status TEXT CHECK (guarantor_status IN ('pending','accepted','declined'));
CREATE TABLE IF NOT EXISTS loan_request_approvals (
  request_id BIGINT NOT NULL REFERENCES loan_requests(id) ON DELETE CASCADE,
  officer_id INT NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, officer_id)
);
ALTER TABLE online_payments ADD COLUMN IF NOT EXISTS loan_id INT REFERENCES loans(id);

-- ===== Group life: goals, minutes, votes, reports =====
CREATE TABLE IF NOT EXISTS member_goals (
  id BIGSERIAL PRIMARY KEY,
  member_id INT NOT NULL REFERENCES members(id),
  title TEXT NOT NULL,
  target BIGINT NOT NULL CHECK (target > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS member_goals_member ON member_goals(member_id);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS minutes TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS minutes_by INT REFERENCES members(id);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS minutes_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS polls (
  id BIGSERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  created_by INT NOT NULL REFERENCES members(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS polls_group ON polls(group_id, id);
CREATE TABLE IF NOT EXISTS poll_votes (
  poll_id BIGINT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  member_id INT NOT NULL REFERENCES members(id),
  option_idx INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, member_id)
);
CREATE TABLE IF NOT EXISTS chat_reports (
  id BIGSERIAL PRIMARY KEY,
  group_id INT NOT NULL REFERENCES groups(id),
  message_id BIGINT NOT NULL,
  message_body TEXT NOT NULL,
  author_id INT NOT NULL REFERENCES members(id),
  reporter_id INT NOT NULL REFERENCES members(id),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, reporter_id)
);

-- ===== Loan reversals =====
-- A loan issued by mistake can be reversed (only while nothing has been repaid); its status becomes 'reversed'.
ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_status_check;
ALTER TABLE loans ADD CONSTRAINT loans_status_check CHECK (status IN ('active','settled','reversed'));
-- Which loan a ledger entry belongs to, so a repayment can be undone exactly (older rows fall back to the "Loan N" note).
ALTER TABLE postings ADD COLUMN IF NOT EXISTS loan_id INT REFERENCES loans(id);
CREATE INDEX IF NOT EXISTS postings_loan ON postings(loan_id) WHERE loan_id IS NOT NULL;

-- ===== Data retention =====
ALTER TABLE members ADD COLUMN IF NOT EXISTS exited_at TIMESTAMPTZ;
ALTER TABLE members ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;
UPDATE members SET exited_at = now() WHERE status = 'exited' AND exited_at IS NULL;
CREATE TABLE IF NOT EXISTS retention_runs (
  id BIGSERIAL PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dry_run BOOLEAN NOT NULL DEFAULT false,
  result JSONB NOT NULL
);
