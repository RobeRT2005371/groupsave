import { api } from '../api.js';
import { useLoad } from '../hooks.js';
import { useT } from '../i18n.jsx';

export default function Audit({ me }) {
  const t = useT();
  const { data, error } = useLoad(() => (me.role === 'member' ? Promise.resolve([]) : api('/audit')));
  return (
    <>
      <h1>{t("Audit log")}</h1>
      <p className="muted">{t("Every action, who did it and when. This log is append-only.")}</p>
      {error && <div className="error">{error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>{t("When")}</th><th>{t("Who")}</th><th>{t("Action")}</th><th>{t("Entity")}</th><th>{t("Details")}</th></tr></thead>
          <tbody>{(data || []).map((a) => (
            <tr key={a.id}>
              <td>{new Date(a.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td>{a.actor_name || '—'}</td><td>{t(a.action)}</td><td>{a.entity}</td>
              <td className="muted">{a.after ? JSON.stringify(a.after) : ''}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
