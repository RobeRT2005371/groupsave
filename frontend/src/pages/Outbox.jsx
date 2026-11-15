import { useState } from 'react';
import { api, kwacha } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';

export default function Outbox({ me }) {
  const t = useT();
  const allowed = ['chairperson', 'treasurer', 'secretary'].includes(me.role);
  const { data, error, reload } = useLoad(() => (allowed ? api('/outbox') : Promise.resolve([])));
  const { data: usage } = useLoad(() => (allowed ? api('/outbox/usage') : Promise.resolve(null)));
  const [rate, setRate] = useState(() => { try { return localStorage.getItem('gs_sms_rate') || ''; } catch { return ''; } });
  const setRateSaved = (v) => { setRate(v); try { localStorage.setItem('gs_sms_rate', v); } catch { /* storage unavailable */ } };
  const { msg, err, run } = useAction();
  if (!allowed) return <p>{t("Only officers can view the SMS log.")}</p>;
  const counts = (data || []).reduce((a, n) => ({ ...a, [n.status]: (a[n.status] || 0) + 1 }), {});
  return (
    <>
      <h1>{t("SMS log")}</h1>
      <p className="sub">{t("Every posting sends the member a confirmation. Failed messages can be retried.")}</p>
      <div className="grid">
        <div className="stat"><div className="ico" aria-hidden="true">✔</div><div className="n">{counts.sent || 0}</div><div className="l">{t("Delivered")}</div></div>
        <div className="stat"><div className="ico" aria-hidden="true">◷</div><div className="n">{counts.pending || 0}</div><div className="l">{t("Queued")}</div></div>
        <div className="stat"><div className="ico" aria-hidden="true">!</div><div className="n">{counts.failed || 0}</div><div className="l">{t("Failed")}</div></div>
      </div>
      {usage && (
        <div className="card">
          <div className="row">
            <div><div className="muted">{t('Messages this month')}</div><b style={{ fontSize: '1.3rem' }}>{usage.monthMessages}</b></div>
            <div><div className="muted">{t('SMS parts (billed)')}</div><b style={{ fontSize: '1.3rem' }}>{usage.monthParts}</b></div>
            <label>{t('Cost per SMS part (K)')}<input value={rate} onChange={(e) => setRateSaved(e.target.value)} inputMode="decimal" size="6" placeholder="0.25" /></label>
            {Number(rate) > 0 && <div><div className="muted">{t('Estimated cost this month')}</div><b style={{ fontSize: '1.3rem' }}>{kwacha(Math.round(usage.monthParts * Number(rate) * 100))}</b></div>}
          </div>
          <p className="muted" style={{ fontSize: '.82rem' }}>{t('Enter the rate your SMS provider charges. Messages with local-language letters are spelled in plain letters so each stays one part.')}</p>
          <p className="muted" style={{ fontSize: '.82rem' }}>{t('Reminders: loan payments are reminded automatically the day before they are due.')}</p>
        </div>
      )}
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>{t("When")}</th><th>{t("To")}</th><th>{t("Message")}</th><th>{t("Status")}</th><th></th></tr></thead>
          <tbody>{(data || []).map((n) => (
            <tr key={n.id}>
              <td>{new Date(n.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td>{n.member_name}</td><td className="muted">{n.body}</td>
              <td><span className={'tag ' + (n.status === 'sent' ? 'good' : n.status === 'failed' ? 'bad' : 'open')}>{t(n.status)}</span></td>
              <td>{n.status === 'failed' && <button className="link" onClick={() => run(async () => { await api(`/outbox/${n.id}/retry`, { method: 'POST' }); await reload(); }, 'Queued for retry')}>{t("Retry")}</button>}{n.status !== 'pending' && <button className="link neg" onClick={() => run(async () => { await api(`/outbox/${n.id}`, { method: 'DELETE' }); await reload(); }, 'Message removed from log')}>{t("Delete")}</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
