import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { confirmBox } from '../dialogs.jsx';

const when = (d) => new Date(d).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' });
const initials = (n) => (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** Conversation bubbles + a send box. `mine(m)` says which side a message is on. */
export function Thread({ messages, mine, onSend, placeholder, canDelete, onDelete, canReport, onReport }) {
  const t = useT();
  const [text, setText] = useState('');
  const { err, run } = useAction();
  const box = useRef(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [messages?.length]);
  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    run(async () => { await onSend(text.trim()); setText(''); });
  };
  return (
    <>
      <div className="chat-msgs" ref={box}>
        {(messages || []).map((m) => (
          <div key={m.id} className={'chat-row ' + (mine(m) ? 'mine' : 'theirs')}>
            <div className="chat-bubble">{m.body}</div>
            <div className="chat-time">{mine(m) ? '' : m.sender_name + ' · '}{when(m.created_at)}{canDelete && canDelete(m) && <> · <button type="button" className="link neg" onClick={() => onDelete(m)}>{t('Delete')}</button></>}{canReport && canReport(m) && <> · <button type="button" className="link" onClick={() => onReport(m)}>{t('Report')}</button></>}</div>
          </div>
        ))}
        {messages && !messages.length && <div className="chat-empty">{t('No messages yet.')}</div>}
      </div>
      {err && <div className="error">{err}</div>}
      <form className="chat-send" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={placeholder} aria-label={placeholder} />
        <button>{t('Send')}</button>
      </form>
    </>
  );
}

/** Officer view: pick a member, read the thread, reply. */
function MemberMessages() {
  const t = useT();
  const { data: members, error, reload } = useLoad(() => api('/chat'));
  const [sel, setSel] = useState(null);
  const [thread, setThread] = useState(null);

  const open = async (id) => {
    setSel(id);
    try { setThread(await api(`/chat/${id}`)); reload(); } catch { setThread(null); }
  };
  // Pick up new messages while a conversation is open.
  useEffect(() => {
    if (!sel) return undefined;
    const id = setInterval(() => { api(`/chat/${sel}`).then(setThread).catch(() => {}); reload(); }, 15000);
    return () => clearInterval(id);
  }, [sel, reload]);

  return (
    <>
      <h1>{t('Messages')}</h1>
      <p className="sub">{t('Talk with members of your group. Every officer can see and answer these messages.')}</p>
      {error && <div className="error">{error}</div>}
      <div className={'chat' + (sel ? ' has-sel' : '')}>
        <div className="card chat-list">
          {(members || []).map((m) => (
            <div key={m.id} role="button" tabIndex={0} className={'chat-item' + (sel === m.id ? ' on' : '')}
              onClick={() => open(m.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(m.id); } }}>
              <div className="chat-av" aria-hidden="true">{initials(m.full_name)}</div>
              <div className="chat-meta"><b>{m.full_name}</b><small>{m.last_body || t('No messages yet.')}</small></div>
              {m.unread > 0 && <span className="chat-unread">{m.unread}</span>}
            </div>
          ))}
          {members && !members.length && <p className="muted" style={{ padding: 10 }}>{t('No members yet.')}</p>}
        </div>
        <div className="card">
          {!sel && <p className="chat-empty" style={{ padding: '60px 0' }}>{t('Choose a member to start.')}</p>}
          {sel && thread && (
            <>
              <div className="chat-head"><button type="button" className="link chat-back" onClick={() => { setSel(null); setThread(null); }} aria-label={t('Back')}>←</button><div className="chat-av" aria-hidden="true">{initials(thread.member.full_name)}</div><h2>{thread.member.full_name}</h2></div>
              <Thread messages={thread.messages} mine={(m) => m.from_officer}
                onSend={async (body) => { await api(`/chat/${sel}`, { method: 'POST', body: { body } }); await open(sel); }}
                placeholder={t('Write a reply…')} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Officers can also take part in the group's open room. */
function GroupRoom({ me }) {
  const t = useT();
  const { data, reload } = useLoad(() => api('/chat/community'));
  useEffect(() => { const id = setInterval(reload, 15000); return () => clearInterval(id); }, [reload]);
  return (
    <div className="card">
      <h2>{t('Group chat')}</h2>
      <p className="muted">{t('Everyone in the group can read this room.')}</p>
      <Thread messages={data} mine={(m) => m.mine}
        canDelete={(m) => me?.role === 'chairperson' || m.mine} onDelete={async (m) => { if (await confirmBox(t('Delete this message?'))) { await api('/chat/community/' + m.id, { method: 'DELETE' }); reload(); } }}
        onSend={async (body) => { await api('/chat/community', { method: 'POST', body: { body } }); await reload(); }}
        placeholder={t('Write to the group…')} />
    </div>
  );
}

function Reports() {
  const t = useT();
  const { data, error, reload } = useLoad(() => api('/extras/reports'));
  const { msg, err, run } = useAction();
  return (
    <div className="card">
      <h2>{t('Reported messages')}</h2>
      <p className="muted">{t('Members can report messages in the group chat. Remove the message or dismiss the report.')}</p>
      {(error || err) && <div className="error">{error || err}</div>}{msg && <div className="ok">{msg}</div>}
      {(data || []).map((r) => (
        <div key={r.id} style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>“{r.message_body}”</div>
          <div className="muted" style={{ fontSize: '.8rem' }}>{r.author_name} · {t('reported by')} {r.reporter_name}{r.reason ? ' · ' + r.reason : ''} · <span className={'tag ' + (r.status === 'open' ? 'open' : r.status === 'removed' ? 'bad' : '')}>{t(r.status)}</span></div>
          {r.status === 'open' && <p style={{ margin: '6px 0 0' }}>
            <button className="danger" onClick={() => run(async () => { await api('/extras/reports/' + r.id + '/remove', { method: 'POST' }); await reload(); }, 'Message removed')}>{t('Remove message')}</button>{' '}
            <button className="secondary" onClick={() => run(async () => { await api('/extras/reports/' + r.id + '/dismiss', { method: 'POST' }); await reload(); }, 'Report dismissed')}>{t('Dismiss')}</button>
          </p>}
        </div>
      ))}
      {data && !data.length && <p className="muted">{t('No reports. Everything looks fine.')}</p>}
    </div>
  );
}

export default function Chat({ me }) {
  const t = useT();
  const [view, setView] = useState('members');
  return (
    <>
      <div className="tabs" role="tablist" style={{ position: 'static', boxShadow: 'none', padding: 0, background: 'none', borderTop: 0, marginBottom: 14 }}>
        {[['members', 'Member messages'], ['room', 'Group chat'], ...(me?.role === 'chairperson' ? [['reports', 'Reported messages']] : [])].map(([k, label]) => <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'tab on' : 'tab'} onClick={() => setView(k)}><span className="tl">{t(label)}</span></button>)}
      </div>
      {view === 'members' ? <MemberMessages /> : view === 'reports' ? <><h1>{t('Reported messages')}</h1><Reports /></> : <><h1>{t('Group chat')}</h1><GroupRoom me={me} /></>}
    </>
  );
}
