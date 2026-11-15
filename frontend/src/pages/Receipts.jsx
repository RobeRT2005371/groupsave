import { useState } from 'react';
import { api, kwacha } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { confirmBox } from '../dialogs.jsx';

export default function Receipts({ me }) {
  const t = useT();
  const allowed = ['chairperson', 'treasurer'].includes(me.role);
  const { data, error, reload } = useLoad(() => (allowed ? api('/receipts') : Promise.resolve([])));
  const { data: members } = useLoad(() => (allowed ? api('/members') : Promise.resolve([])));
  const [text, setText] = useState('');
  const [pick, setPick] = useState({});
  const { msg, err, run } = useAction();
  if (!allowed) return <p>{t("Only the chairperson and treasurer can match payments.")}</p>;

  return (
    <>
      <h1>{t("Mobile money payments")}</h1>
      <p className="muted">{t("Paste a confirmation SMS, then choose the member it belongs to. Nothing is posted until you confirm.")}</p>
      <form className="card" onSubmit={(e) => { e.preventDefault(); run(async () => { await api('/receipts', { method: 'POST', body: { text } }); setText(''); await reload(); }, 'Receipt added'); }}>
        <label>{t("Confirmation text")}<input value={text} onChange={(e) => setText(e.target.value)} placeholder="You have received K200.00 from 0971… Transaction ID: MP26…" required /></label>
        <p><button>{t("Read receipt")}</button></p>
      </form>
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>{t("Amount")}</th><th>Reference</th><th>{t("Status")}</th><th>{t("Match to member")}</th></tr></thead>
          <tbody>{(data || []).map((r) => (
            <tr key={r.id}>
              <td>{kwacha(r.amount)}</td><td>{r.reference || '—'}</td>
              <td>{r.matched_posting_id ? <span className="tag good">{t("posted")} #{r.matched_posting_id}</span> : <span className="tag open">{t("unmatched")}</span>}</td>
              <td>{!r.matched_posting_id && (
                <div className="row">
                  <select value={pick[r.id] || ''} onChange={(e) => setPick({ ...pick, [r.id]: e.target.value })}>
                    <option value="">{t("Choose…")}</option>{(members || []).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                  <button disabled={!pick[r.id]} onClick={() => run(async () => { await api(`/receipts/${r.id}/match`, { method: 'POST', body: { memberId: Number(pick[r.id]) } }); await reload(); }, 'Contribution posted')}>{t("Post")}</button>
                  <button className="link neg" onClick={async () => { if (await confirmBox(t('Delete this receipt?'))) run(async () => { await api(`/receipts/${r.id}`, { method: 'DELETE' }); await reload(); }, 'Receipt deleted'); }}>{t("Delete")}</button>
                </div>)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
