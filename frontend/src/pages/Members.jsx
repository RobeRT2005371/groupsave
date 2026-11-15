import { useState } from 'react';
import { api } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { confirmBox, promptBox } from '../dialogs.jsx';

const LANGS = [['en', 'English'], ['bem', 'Bemba'], ['nya', 'Nyanja'], ['toi', 'Tonga'], ['loz', 'Lozi'], ['kqn', 'Kaonde'], ['lun', 'Lunda'], ['lue', 'Luvale']];

function JoinRequests() {
  const t = useT();
  const { data: requests, error, reload } = useLoad(() => api('/membership-requests'));
  const { msg, err, run } = useAction();
  const [busyId, setBusyId] = useState(null);

  const decide = async (request, decision) => {
    setBusyId(request.id);
    await run(async () => {
      await api(`/membership-requests/${request.id}/${decision}`, { method: 'POST' });
      await reload();
    }, decision === 'approve' ? 'Member approved' : 'Request declined');
    setBusyId(null);
  };

  return (
    <section className="card">
      <h2>{t('Requests to join')}</h2>
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      {(requests || []).map((request) => (
        <div key={request.id} className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', padding: '10px 0' }}>
          <span><b>{request.full_name}</b> · {request.phone}<br /><span className="muted">{t('Requested')} {new Date(request.created_at).toLocaleDateString()} · {request.group_name}{request.location ? ` · ${request.location}` : ''}</span></span>
          <span>
            <button disabled={busyId !== null} onClick={() => decide(request, 'approve')}>{t('Approve')}</button>{' '}
            <button className="secondary" disabled={busyId !== null} onClick={() => decide(request, 'reject')}>{t('Reject')}</button>
          </span>
        </div>
      ))}
      {requests && !requests.length && <p className="muted">{t('No pending group requests.')}</p>}
    </section>
  );
}

export default function Members({ me }) {
  const t = useT();
  const { data: members, error, reload } = useLoad(() => api('/members'));
  const [f, setF] = useState({ fullName: '', phone: '', role: 'member', password: '' });
  const { msg, err, run } = useAction();
  const canAdd = ['chairperson', 'secretary'].includes(me.role);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const add = (e) => {
    e.preventDefault();
    run(async () => { await api('/members', { method: 'POST', body: f }); setF({ fullName: '', phone: '', role: 'member', password: '' }); await reload(); }, 'Member added');
  };
  const del = async (m) => { if (await confirmBox(t('Permanently delete {name}? This only works for members with no ledger history.', { name: m.full_name }))) run(async () => { await api(`/members/${m.id}`, { method: 'DELETE' }); await reload(); }, 'Member deleted'); };
  const patch = (id, body, ok) => run(async () => { await api(`/members/${id}`, { method: 'PATCH', body }); await reload(); }, ok);

  return (
    <>
      <h1>{t("Members")}</h1>
      <p className="sub">{t("Members choose their own language when they first dial, and can change it any time from the USSD menu (option 6). Officers can also set it here. SMS receipts use the same language.")}</p>
      {['chairperson', 'secretary'].includes(me.role) && <JoinRequests />}
      {canAdd && (
        <form className="card row" onSubmit={add}>
          <label>{t("Full name")}<input value={f.fullName} onChange={set('fullName')} required /></label>
          <label>{t("Phone")}<input value={f.phone} onChange={set('phone')} placeholder="0971234567" required /></label>
          {me.role === 'chairperson' && (
            <label>{t("Role")}
              <select value={f.role} onChange={set('role')}>
                <option value="member">{t("member")}</option><option value="treasurer">{t("treasurer")}</option><option value="secretary">{t("secretary")}</option><option value="auditor">{t("auditor")}</option><option value="chairperson">{t("chairperson")}</option>
              </select>
            </label>
          )}
          {f.role !== 'member' && <label>{t("Officer password")}<input type="password" value={f.password} onChange={set('password')} minLength={8} required /></label>}
          <button>{t("Add member")}</button>
        </form>
      )}
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      <div className="card">
        <table>
          <thead><tr><th>{t("Name")}</th><th>{t("Phone")}</th><th>{t("Role")}</th><th>USSD PIN</th><th>{t("Language")}</th><th></th></tr></thead>
          <tbody>{(members || []).map((m) => (
            <tr key={m.id}>
              <td>{m.full_name} {m.status === 'exited' && <span className="tag">{t("exited")}</span>}</td>
              <td>{m.phone}</td><td>{t(m.role)}</td>
              <td>{m.locked ? <span className="tag bad">{t("locked")}</span> : m.pin_set ? <span className="tag good">{t("set")}</span> : <span className="tag">{t("not set")}</span>}</td>
              <td>{canAdd ? (
                <select value={m.language} onChange={(e) => patch(m.id, { language: e.target.value }, 'Language updated')} aria-label={`Language for ${m.full_name}`}>
                  {LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
                </select>
              ) : LANGS.find(([c]) => c === m.language)?.[1]}</td>
              <td>{canAdd && <>
                {m.setup_open
                  ? <span className="tag open">{t("Setup open")}</span>
                  : <button className="link" onClick={() => patch(m.id, { allowSetup: true }, 'The member can now choose their own PIN or password for the next 24 hours')}>{t("Allow PIN setup")}</button>}{' '}
                <button className="link" onClick={async () => { const pin = await promptBox(t('Enter a 4-digit PIN for {name}', { name: m.full_name })); if (pin) patch(m.id, { setPin: pin }, 'PIN set; tell the member their PIN'); }}>{t("Set PIN")}</button>{' '}
                {m.pin_set && <button className="link" onClick={() => patch(m.id, { resetPin: true }, 'PIN reset; member chooses a new one on next dial')}>{t("Reset PIN")}</button>}{' '}
                <button className="link" onClick={() => patch(m.id, { status: m.status === 'active' ? 'exited' : 'active' }, 'Updated')}>{m.status === 'active' ? 'Mark exited' : 'Reactivate'}</button>{' '}
                {me.role === 'chairperson' && m.id !== me.id && <button className="link neg" onClick={() => del(m)}>{t("Delete")}</button>}
              </>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
