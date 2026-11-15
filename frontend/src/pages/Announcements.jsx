import { useState } from 'react';
import { api, fmtDate } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { confirmBox } from '../dialogs.jsx';

export default function Announcements({ me }) {
  const t = useT();
  const canPost = ['chairperson', 'treasurer', 'secretary'].includes(me.role);
  const { data, error, reload } = useLoad(() => api('/announcements'));
  const [body, setBody] = useState('');
  const [sms, setSms] = useState(false);
  const { msg, err, run } = useAction();

  const post = (e) => {
    e.preventDefault();
    run(async () => { await api('/announcements', { method: 'POST', body: { body, sms } }); setBody(''); setSms(false); await reload(); }, 'Announcement posted');
  };
  const remove = async (a) => { if (await confirmBox(t('Delete this announcement?'))) run(async () => { await api(`/announcements/${a.id}`, { method: 'DELETE' }); await reload(); }, 'Announcement deleted'); };

  return (
    <>
      <h1>{t('Announcements')}</h1>
      {canPost && (
        <form className="card" onSubmit={post}>
          <label>{t('Announcements')}
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} rows={3} required />
          </label>
          <div className="muted" style={{ fontSize: '.8rem', textAlign: 'right' }}>{body.length}/300</div>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />{t('Also send as SMS to all members')}</label>
          <p className="muted" style={{ fontSize: '.82rem' }}>{t('Avoid names and personal details. Phones are often shared and SMS is not private.')}</p>
          <button>{t('Post announcement')}</button>
        </form>
      )}
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      {(data || []).map((a) => (
        <div className="card" key={a.id}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{a.body}</div>
          <div className="muted" style={{ fontSize: '.8rem', marginTop: 8 }}>
            {a.author} · {fmtDate(a.created_at)} {a.sms_sent && <span className="tag good">SMS</span>}
            {canPost && <> · <button className="link neg" onClick={() => remove(a)}>{t('Delete')}</button></>}
          </div>
        </div>
      ))}
    </>
  );
}
