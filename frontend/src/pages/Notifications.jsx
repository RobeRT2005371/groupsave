import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';

const ICON = { alert: '!', warn: '⚑', info: 'i' };

export default function Notifications({ refreshAlerts }) {
  const t = useT();
  const { data, error, reload } = useLoad(() => api('/alerts'));
  const { err, run } = useAction();
  const items = data?.items || [];

  const dismiss = (keys) => run(async () => { await api('/alerts/dismiss', { method: 'POST', body: { keys } }); await reload(); refreshAlerts?.(); });

  return (
    <>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{t('Notifications')}</h1>
        {items.length > 1 && <button className="secondary" onClick={() => dismiss(items.map((i) => i.key))}>{t('Dismiss all')}</button>}
      </div>
      {(err || error) && <div className="error">{err || error}</div>}
      {data && !items.length && <div className="card muted">{t('You are all caught up.')}</div>}
      {items.map((i) => (
        <div key={i.key} className={'note ' + i.severity}>
          <span className="note-ico" aria-hidden="true">{ICON[i.severity]}</span>
          <div className="note-body">
            <div>{t(i.template, i.vars)}</div>
            <div className="muted" style={{ fontSize: '.8rem' }}>{new Date(i.at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</div>
          </div>
          <div className="note-actions">
            <Link to={i.link}>{t('View')}</Link>
            <button className="link" onClick={() => dismiss([i.key])}>{t('Dismiss')}</button>
          </div>
        </div>
      ))}
    </>
  );
}
