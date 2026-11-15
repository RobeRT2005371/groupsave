import { useState } from 'react';
import QRCode from 'qrcode';
import { api, toNgwee, kwacha } from '../api.js';
import { useAction, useLoad } from '../hooks.js';
import { useT } from '../i18n.jsx';

function Password() {
  const t = useT();
  const [f, setF] = useState({ current: '', next: '' });
  const { msg, err, run } = useAction();
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/auth/password', { method: 'POST', body: f }); setF({ current: '', next: '' }); }, 'Password changed'); }}>
      <h2>{t("Change password")}</h2>
      <div className="row">
        <label>{t("Current password")}<input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required /></label>
        <label>{t("New password")}<input type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} minLength={8} required /></label>
        <button>{t("Update")}</button>
      </div>
      <p className="muted" style={{ fontSize: '.82rem' }}>{t("At least 8 characters with letters and numbers.")}</p>
      {msg && <div className="ok">{msg}</div>}{err && <div className="error">{err}</div>}
    </form>
  );
}

function TwoFactor({ me, reload }) {
  const t = useT();
  const [setup, setSetup] = useState(null);
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const { msg, err, run } = useAction();

  const start = () => run(async () => {
    const s = await api('/auth/2fa/setup', { method: 'POST' });
    setQr(await QRCode.toDataURL(s.uri, { width: 200, margin: 1 }));
    setSetup(s);
  }, 'Scan the code with your authenticator app, then enter the 6-digit code below.');

  const enable = (e) => { e.preventDefault(); run(async () => { await api('/auth/2fa/enable', { method: 'POST', body: { code } }); setSetup(null); setCode(''); await reload(); }, 'Two-factor sign-in is now on'); };
  const disable = (e) => { e.preventDefault(); run(async () => { await api('/auth/2fa/disable', { method: 'POST', body: { password, code } }); setPassword(''); setCode(''); await reload(); }, 'Two-factor sign-in turned off'); };

  return (
    <div className="card">
      <h2>{t('Two-factor authentication')} {me.totp_enabled ? <span className="tag good">{t("on")}</span> : <span className="tag open">{t("off")}</span>}</h2>
      <p className="muted">{t("Protects the ledger even if your password is stolen. Works with Google Authenticator, Microsoft Authenticator or Authy.")}</p>
      {!me.totp_enabled && !setup && <button onClick={start}>{t("Set up two-factor")}</button>}
      {setup && (
        <form onSubmit={enable} className="row">
          <img src={qr} alt="QR code for your authenticator app" width="160" height="160" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <p className="muted" style={{ fontSize: '.82rem' }}>{t("Can't scan? Enter this key manually:")}<br /><code style={{ wordBreak: 'break-all' }}>{setup.secret}</code></p>
            <label>{t("6-digit code")}<input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required /></label>
            <p><button>{t("Turn on")}</button></p>
          </div>
        </form>
      )}
      {me.totp_enabled && (
        <form onSubmit={disable} className="row">
          <label>{t("Password")}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <label>{t("Authenticator code")}<input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} required /></label>
          <button className="danger">{t("Turn off")}</button>
        </form>
      )}
      {msg && <div className="ok">{msg}</div>}{err && <div className="error">{err}</div>}
    </div>
  );
}

function GroupSettings() {
  const t = useT();
  const { data, reload } = useLoad(() => api('/extras/settings'));
  const [over, setOver] = useState(null);
  const [board, setBoard] = useState(null);
  const { msg, err, run } = useAction();
  if (!data) return null;
  const overVal = over ?? (data.loanTwoApprovalsOver == null ? '' : String(data.loanTwoApprovalsOver / 100));
  const boardVal = board ?? data.showLeaderboard;
  const save = (e) => {
    e.preventDefault();
    run(async () => {
      const amount = overVal.trim() === '' ? null : toNgwee(overVal);
      if (overVal.trim() !== '' && !amount) throw new Error('Enter a valid amount');
      await api('/extras/settings', { method: 'PUT', body: { loanTwoApprovalsOver: amount, showLeaderboard: boardVal } });
      setOver(null); setBoard(null); await reload();
    }, 'Settings saved');
  };
  return (
    <form className="card" onSubmit={save}>
      <h2>{t('Group rules')}</h2>
      <label>{t('Loans above this amount need two officers to approve (K). Leave empty for one.')}
        <input value={overVal} onChange={(e) => setOver(e.target.value)} inputMode="decimal" placeholder={t('e.g. 500')} style={{ maxWidth: 220 }} />
      </label>
      {data.loanTwoApprovalsOver != null && <p className="muted" style={{ margin: '6px 0' }}>{t('Now: above {amount}', { amount: kwacha(data.loanTwoApprovalsOver) })}</p>}
      <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, margin: '14px 0' }}>
        <input type="checkbox" checked={boardVal} onChange={(e) => setBoard(e.target.checked)} />
        {t('Show members an "on-time savers" board (names and streaks only, never amounts)')}
      </label>
      <button>{t('Save')}</button>
      {msg && <div className="ok">{msg}</div>}{err && <div className="error">{err}</div>}
    </form>
  );
}

export default function Settings({ me, reload }) {
  const t = useT();
  return (
    <>
      <h1>{t("Security")}</h1>
      <p className="sub">{t('Signed in as {name}. Sessions end after 15 minutes of inactivity.', { name: me.full_name })}</p>
      {me.role === 'chairperson' && <GroupSettings />}
      <Password />
      <TwoFactor me={me} reload={reload} />
      {/* Error log card hidden for now. Logging still runs on the server; re-enable by uncommenting:
      {me.role === 'chairperson' && <ErrorLog />} */}
      <div className="card muted">
        {t('Accounts lock for 15 minutes after 5 wrong passwords. Every sign-in, failed attempt and security change is written to the audit log.')}
      </div>
    </>
  );
}

function ErrorLog() {
  const t = useT();
  const { data, error } = useLoad(() => api('/ops/errors'));
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <h2>{t('Recent server errors')}</h2>
      <p className="muted">{t('Unexpected problems in the last 7 days. If this list grows, something needs fixing.')}</p>
      {error && <div className="error">{error}</div>}
      {data && !data.length && <p className="ok">{t('No errors. Everything is running well.')}</p>}
      {data && data.length > 0 && (
        <table><thead><tr><th>{t('When')}</th><th>{t('Where')}</th><th>{t('Problem')}</th></tr></thead>
          <tbody>{data.map((e) => <tr key={e.id}><td>{new Date(e.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td><td>{e.method} {e.path}</td><td>{e.message}</td></tr>)}</tbody></table>
      )}
    </div>
  );
}
