import { useEffect, useState } from 'react';
import { api, kwacha, fmtDate, openMeeting } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { meetingInviteUrl } from '../joinLink.jsx';
import { confirmBox, promptBox } from '../dialogs.jsx';

function RotationOrder({ cycle, me }) {
  const t = useT();
  const { data, error, reload } = useLoad(() => api(`/cycles/${cycle.id}/rotation-order`), [cycle.id]);
  const [order, setOrder] = useState([]);
  const { msg, err, run } = useAction();
  const canEdit = ['chairperson', 'treasurer'].includes(me.role) && cycle.status === 'open';

  useEffect(() => {
    if (!data) return;
    const active = new Set(data.members.map((member) => Number(member.id)));
    const saved = data.turns.filter((turn) => active.has(Number(turn.member_id))).map((turn) => Number(turn.member_id));
    const included = new Set(saved);
    setOrder([...saved, ...data.members.map((member) => Number(member.id)).filter((id) => !included.has(id))]);
  }, [data]);

  if (!data || data.groupType !== 'rotating') return error ? <div className="error">{error}</div> : null;
  const names = new Map(data.members.map((member) => [Number(member.id), member.full_name]));
  const move = (index, offset) => {
    const next = [...order];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setOrder(next);
  };
  const save = () => run(async () => {
    await api(`/cycles/${cycle.id}/rotation-order`, { method: 'PUT', body: { memberIds: order } });
    await reload();
  }, 'Rotation order saved');

  return (
    <div className="card">
      <h2>{t('Rotation order')}</h2>
      <p className="muted">{t('The next active member in this order receives the meeting pot. If they are absent, their turn is deferred.')}</p>
      {error && <div className="error">{error}</div>}{(err || msg) && <div className={err ? 'error' : 'ok'}>{err || msg}</div>}
      {!data.turns.length && <p className="muted">{t('No rotation order has been saved yet.')}</p>}
      {!!data.missingMembers.length && <p className="error">{t('The active membership has changed. Save the updated order before paying out.')}</p>}
      <ol>
        {order.map((id, index) => (
          <li key={id} style={{ padding: '4px 0' }}>
            {names.get(id) || t('Member no longer active')}
            {data.turns.find((turn) => Number(turn.member_id) === id)?.received && <span className="tag good"> {t('Turn paid')}</span>}
            {canEdit && !data.hasPayouts && <>
              {' '}<button className="link" aria-label={t('Move up')} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
              <button className="link" aria-label={t('Move down')} disabled={index === order.length - 1} onClick={() => move(index, 1)}>↓</button>
            </>}
          </li>
        ))}
      </ol>
      {canEdit && (!data.hasPayouts || data.missingMembers.length > 0) && (
        <button disabled={!order.length} onClick={save}>{t(data.hasPayouts ? 'Add new active members to the end' : 'Save rotation order')}</button>
      )}
      {data.hasPayouts && !data.missingMembers.length && <p className="muted">{t('The order is locked after the first payout.')}</p>}
    </div>
  );
}

function MinutesEditor({ id, me }) {
  const t = useT();
  const canEdit = ['chairperson', 'secretary'].includes(me.role);
  const { data, reload } = useLoad(() => api('/extras/minutes/' + id), [id]);
  const [text, setText] = useState(null);
  const { msg, err, run } = useAction();
  if (!data) return null;
  const value = text ?? data.minutes ?? '';
  if (!canEdit && !data.minutes) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <h2>{t('Minutes')}</h2>
      {canEdit ? (
        <>
          <textarea value={value} onChange={(e) => setText(e.target.value)} rows={6} maxLength={8000} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--ink)', font: 'inherit' }} placeholder={t('What was discussed and decided? Members can read this in their account.')} />
          <p><button onClick={() => run(async () => { await api('/extras/minutes/' + id, { method: 'PUT', body: { minutes: value } }); setText(null); await reload(); }, 'Minutes saved')}>{t('Save minutes')}</button>
            {data.minutes_at && <span className="muted" style={{ marginLeft: 10, fontSize: '.8rem' }}>{t('Last saved by')} {data.minutes_by} · {new Date(data.minutes_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span>}</p>
          {msg && <div className="ok">{msg}</div>}{err && <div className="error">{err}</div>}
        </>
      ) : <div style={{ whiteSpace: 'pre-wrap' }}>{data.minutes}</div>}
    </div>
  );
}

function Detail({ id, me, onChanged }) {
  const t = useT();
  const canAct = ['chairperson', 'treasurer', 'secretary'].includes(me.role);
  const { data, error, reload } = useLoad(() => api(`/meetings/${id}`), [id]);
  const [absent, setAbsent] = useState(null); // Set of absent ids, null = use saved state
  const { msg, err, run } = useAction();
  if (error) return <div className="error">{error}</div>;
  if (!data) return <p>{t("Loading…")}</p>;
  const { meeting, members, paid, rotation } = data;
  const isAbsent = (m) => (absent ? absent.has(m.id) : m.present === false);
  const toggle = (m) => { const s = new Set(absent || members.filter((x) => x.present === false).map((x) => x.id)); s.has(m.id) ? s.delete(m.id) : s.add(m.id); setAbsent(s); };
  const save = () => run(async () => {
    const present = members.filter((m) => !isAbsent(m)).map((m) => m.id);
    const r = await api(`/meetings/${id}/attendance`, { method: 'POST', body: { present } });
    if (!r.queued) setAbsent(null);
    await reload(); onChanged();
    return r;
  }, (result) => result?.queued ? 'Attendance saved on this device; waiting to sync.' : 'Attendance saved. New absentees were fined and notified.');
  const payout = () => run(async () => { await api(`/meetings/${id}/rotation-payout`, { method: 'POST', body: {} }); await reload(); onChanged(); }, 'Pot paid out. Member notified by SMS.');
  const pot = members.reduce((a, m) => a + m.contributed, 0);

  return (
    <div className="card">
      <h2>{t('Meeting on {date}', { date: fmtDate(meeting.date) })}{meeting.start_time ? ' ' + meeting.start_time : ''}</h2>
      {canAct && meeting.cycle_status === 'open' && <p><button className="secondary" onClick={() => run(async () => { await api('/meetings/' + id + '/remind', { method: 'POST' }); }, 'Reminder sent by SMS to all members')}>{t('Send reminder')}</button></p>}
      {meeting.online && <p><button onClick={() => run(() => openMeeting('/meetings/' + id + '/join'), 'Done')}>{t('Join online meeting')}</button></p>}
      <MinutesEditor id={id} me={me} />
      <table>
        <thead><tr><th>{t("Member")}</th><th>{t("Attendance")}</th><th className="num">{t("Contributed")}</th></tr></thead>
        <tbody>{members.map((m) => (
          <tr key={m.id}>
            <td>{m.full_name}</td>
            <td>
              <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" disabled={!canAct || meeting.cycle_status !== 'open'} checked={!isAbsent(m)} onChange={() => toggle(m)} />
                {isAbsent(m) ? <span className="tag bad">{t('absent')}{m.fined ? ' · ' + t('Fine') : ''}</span> : <span className="tag good">{t("present")}</span>}
              </label>
            </td>
            <td className="num">{kwacha(m.contributed)}</td>
          </tr>
        ))}</tbody>
      </table>
      {canAct && meeting.cycle_status === 'open' && (
        <p><button onClick={save}>{t("Save attendance")}</button> <span className="muted">{t('Absentees are fined {amount} once.', { amount: kwacha(meeting.fine_absence) })}</span></p>
      )}
      {meeting.group_type === 'rotating' && (
        <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          {paid ? <span className="tag good">{t('Pot of {amount} paid to {name}', { amount: kwacha(paid.amount), name: paid.full_name })}</span> : (
            <>
              <span>{t('Pot collected:')} <b>{kwacha(pot)}</b></span>
              {!rotation?.configured && <span className="tag bad">{t('Set the rotation order before paying out.')}</span>}
              {rotation?.configured && !rotation.nextTurn && <span className="tag good">{t('All active members have received a turn.')}</span>}
              {rotation?.nextTurn && (() => {
                const recipient = members.find((member) => Number(member.id) === Number(rotation.nextTurn.member_id));
                const attendanceRecorded = recipient?.present === true || recipient?.present === false;
                return (
                  <>
                    <span>{t('Next turn:')} <b>{rotation.nextTurn.full_name}</b></span>
                    {recipient?.present === false && <span className="tag open">{t('Absent; payout deferred.')}</span>}
                    {!attendanceRecorded && <span className="tag open">{t('Record attendance before paying out.')}</span>}
                    {['chairperson', 'treasurer'].includes(me.role) && meeting.cycle_status === 'open' && (
                      <button disabled={pot <= 0 || !attendanceRecorded || recipient?.present !== true} onClick={payout}>{t("Pay out pot")}</button>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}
      {msg && <div className="ok">{msg}</div>}{err && <div className="error">{err}</div>}
    </div>
  );
}

export default function Meetings({ me, cycle }) {
  const t = useT();
  const { data: meetings, error, reload } = useLoad(() => api('/meetings'));
  const [sel, setSel] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [online, setOnline] = useState(false);
  const [time, setTime] = useState('14:00');
  const { msg, err, run } = useAction();
  const canAct = ['chairperson', 'treasurer', 'secretary'].includes(me.role);

  return (
    <>
      <h1>{t("Meetings")}</h1>
      <p className="sub">{t("Record who attended. Absence fines post automatically and members get an SMS.")}</p>
      <p className="muted" style={{ fontSize: '.85rem' }}>{t('Online meetings use a private video link that only members of your group receive. Joining marks you present.')}</p>
      {cycle?.group_type === 'rotating' && <RotationOrder cycle={cycle} me={me} />}
      {canAct && cycle && (
        <form className="card row" onSubmit={(e) => { e.preventDefault(); run(async () => { const m = await api(`/cycles/${cycle.id}/meetings`, { method: 'POST', body: { date, online, time: online ? time : undefined } }); await reload(); setSel(m.id); }, 'Meeting created'); }}>
          <label>{t("Meeting date")}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center' }}><input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />{t('Online meeting')}</label>
          {online && <label>{t('Meeting time')}<input type="time" value={time} onChange={(e) => setTime(e.target.value)} required /></label>}
          <button>{t("Start meeting")}</button>
        </form>
      )}
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      {sel && <Detail key={sel} id={sel} me={me} onChanged={reload} />}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>{t("Date")}</th><th></th><th>{t("Present")}</th><th>{t("Absent")}</th><th className="num">{t("Contributions")}</th><th></th></tr></thead>
          <tbody>{(meetings || []).map((m) => (
            <tr key={m.id}><td>{fmtDate(m.date)}{m.start_time ? ' ' + m.start_time : ''}</td><td>{m.online && <span className="tag good">{t('Online')}</span>}</td><td>{m.present}</td><td>{m.absent}</td><td className="num">{kwacha(m.contributions)}</td>
              <td>{m.online && <button className="link" onClick={() => run(() => openMeeting('/meetings/' + m.id + '/join'), 'Done')}>{t('Join')}</button>}{' '}{m.online && <button className="link" onClick={() => { const u = meetingInviteUrl(m.id); (navigator.clipboard?.writeText(u) || Promise.reject()).then(() => alert(t('Invite link copied. Paste it in WhatsApp or SMS.') + '\n' + u)).catch(async () => await promptBox(t('Copy this invite link'), u)); }}>{t('Copy invite link')}</button>}{' '}<button className="link" onClick={() => setSel(m.id)}>{t("Open")}</button>{canAct && <>{' '}<button className="link neg" onClick={async () => { if (await confirmBox(t('Delete this meeting? Only possible if nothing was recorded at it.'))) run(async () => { await api(`/meetings/${m.id}`, { method: 'DELETE' }); if (sel === m.id) setSel(null); await reload(); }, 'Meeting deleted'); }}>{t("Delete")}</button></>}</td></tr>
          ))}</tbody>
        </table>
        {meetings && !meetings.length && <p className="muted">{t("No meetings yet.")}</p>}
      </div>
    </>
  );
}
