import { api, kwacha, fmtDate } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { promptBox } from '../dialogs.jsx';

export default function Disputes({ me }) {
  const t = useT();
  const { data, error, reload } = useLoad(() => api('/disputes'));
  const { msg, err, run } = useAction();
  const resolve = async (d, status) => {
    const note = await promptBox(t('Resolution note ({status})', { status: t(status) }));
    if (note) run(async () => { await api(`/disputes/${d.id}/resolve`, { method: 'POST', body: { status, note } }); await reload(); }, 'Dispute resolved');
  };
  return (
    <>
      <h1>{t("Disputes")}</h1>
      <p className="muted">{t("Members flag entries from their phone (USSD option 4). Resolution notes are kept as history.")}</p>
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>{t("Raised")}</th><th>{t("Member")}</th><th>{t("Entry")}</th><th>{t("Status")}</th><th>{t("Resolution")}</th><th></th></tr></thead>
          <tbody>{(data || []).map((d) => (
            <tr key={d.id}>
              <td>{fmtDate(d.raised_at)}</td><td>{d.member_name}</td>
              <td>#{d.posting_id} {t(d.type)} {kwacha(d.amount)}</td>
              <td><span className={'tag ' + (d.status === 'open' ? 'open' : d.status === 'upheld' ? 'good' : '')}>{t(d.status)}</span></td>
              <td>{d.resolution_note}</td>
              <td>{me.role === 'chairperson' && d.status === 'open' && <>
                <button className="link" onClick={() => resolve(d, 'upheld')}>{t("Uphold")}</button>{' '}
                <button className="link" onClick={() => resolve(d, 'rejected')}>{t("Reject")}</button></>}</td>
            </tr>
          ))}</tbody>
        </table>
        {data && !data.length && <p className="muted">{t("No disputes.")}</p>}
      </div>
    </>
  );
}
