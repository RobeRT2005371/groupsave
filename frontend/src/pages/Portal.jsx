import { useEffect, useState } from 'react';
import { Thread } from './Chat.jsx';
import Privacy from './Privacy.jsx';
import { JoinBanner, takeGo } from '../joinLink.jsx';
import { api, kwacha, fmtDate, openMeeting, download, toNgwee } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT, useLang, LANGS } from '../i18n.jsx';
import { ThemeToggle } from '../theme.jsx';
import { confirmBox, promptBox } from '../dialogs.jsx';

const TYPE = { contribution: 'Contribution', fine: 'Fine', loan_disbursement: 'Loan paid out', loan_repayment: 'Loan repayment', payout: 'Share-out' };

function Goals() {
  const t = useT();
  const { data, reload } = useLoad(() => api('/portal/goals'));
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const { err, run } = useAction();
  const add = (e) => {
    e.preventDefault();
    run(async () => {
      const v = toNgwee(target);
      if (!v) throw new Error('Enter a valid target amount');
      await api('/portal/goals', { method: 'POST', body: { title, target: v } });
      setTitle(''); setTarget(''); await reload();
    }, '');
  };
  if (!data) return null;
  return (
    <div className="card">
      <h2>{t('My savings goals')}</h2>
      {data.goals.map((g) => {
        const pct = Math.min(100, Math.round((data.saved / g.target) * 100));
        return (
          <div key={g.id} style={{ margin: '12px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <b>{g.title}</b>
              <span className="muted">{kwacha(Math.min(data.saved, g.target))} / {kwacha(g.target)} {pct >= 100 && '🎉'}</span>
            </div>
            <div className="bars"><div className="track" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label={g.title}><div className="fill" style={{ width: pct + '%' }} /></div></div>
            <div className="muted" style={{ fontSize: '.78rem' }}>{pct}% · {pct >= 100 ? t('Goal reached!') : t('{amount} to go', { amount: kwacha(g.target - data.saved) })} · <button className="link neg" onClick={async () => { if (await confirmBox(t('Delete this goal?'))) { await api('/portal/goals/' + g.id, { method: 'DELETE' }); reload(); } }}>{t('Delete')}</button></div>
          </div>
        );
      })}
      {!data.goals.length && <p className="muted">{t('Set a target, like school fees, and watch your savings grow towards it.')}</p>}
      <form className="row" onSubmit={add}>
        <label>{t('Goal')}<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={t('School fees')} required /></label>
        <label>{t('Target (K)')}<input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" size="8" required /></label>
        <button>{t('Add goal')}</button>
      </form>
      {err && <div className="error">{err}</div>}
    </div>
  );
}

function Leaderboard() {
  const t = useT();
  const { data } = useLoad(() => api('/portal/leaderboard'));
  if (!data || !data.enabled || !data.rows.length) return null;
  return (
    <div className="card">
      <h2>{t('On-time savers')}</h2>
      <p className="muted">{t('Periods in a row with a contribution. Amounts are never shown.')}</p>
      {data.rows.map((r, i) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)' }}>
          <span style={{ width: 22, textAlign: 'center' }}>{['🥇', '🥈', '🥉'][i] || i + 1}</span>
          <span style={{ flex: 1 }}>{r.name}</span>
          {r.paidThisPeriod && <span className="tag good">{t('Paid this period')}</span>}
          <b>{r.streak}</b>
        </div>
      ))}
    </div>
  );
}

function Overview() {
  const t = useT();
  const { data: s, error } = useLoad(() => api('/portal/summary'));
  if (error) return <div className="error">{error}</div>;
  if (!s) return <><div className="skeleton h-hero" /><div className="grid">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-stat" />)}</div></>;
  if (!s.cycle) return <p>{t('No open cycle.')}</p>;
  return (
    <>
      <div className="hero">
        <div className="lbl">{t('Savings')}</div>
        <div className="big">{kwacha(s.savings)}</div>
        <div className="sm">{t('Projected share-out')}: <b>{kwacha(s.projectedShareout)}</b></div>
      </div>
      <div className="grid">
        <div className="stat"><div className="ico" aria-hidden="true">₭</div><div className="n">{kwacha(s.loanOwed)}</div><div className="l">{t('Loan balance')}</div></div>
        <div className="stat"><div className="ico" aria-hidden="true">⚑</div><div className="n">{kwacha(s.fines)}</div><div className="l">{t('Fines')}</div></div>
      </div>
      {s.nextPayment && (
        <div className="banner"><span><b>{t('Next payment')}:</b> {kwacha(s.nextPayment.amount)} · {fmtDate(s.nextPayment.due_date)}</span></div>
      )}
      <div className="card muted">
        {t('Group pool')}: <b>{kwacha(s.group.pool)}</b> · {fmtDate(s.cycle.start_date)} – {fmtDate(s.cycle.end_date)}
      </div>
    </>
  );
}

function printReceipt(p, group, name) {
  const esc = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const w = window.open('', '_blank', 'width=480,height=640');
  if (!w) return;
  w.document.write('<!doctype html><title>Receipt #' + esc(p.id) + '</title><body style="font-family:system-ui,sans-serif;max-width:380px;margin:24px auto;color:#14213d">'
    + '<h2 style="margin:0">' + esc(group) + '</h2><p style="color:#667085;margin-top:2px">Receipt</p><hr>'
    + '<p><b>Member:</b> ' + esc(name) + '</p>'
    + '<p><b>Receipt no.:</b> ' + esc(p.id) + '</p>'
    + '<p><b>Date:</b> ' + esc(fmtDate(p.created_at)) + '</p>'
    + '<p><b>Type:</b> ' + esc(TYPE[p.type] || p.type) + '</p>'
    + '<p style="font-size:1.4rem"><b>Amount:</b> ' + esc(kwacha(p.amount)) + '</p>'
    + '<p><b>Savings after:</b> ' + esc(kwacha(p.running_balance)) + '</p>'
    + '<p><b>Check code:</b> ' + esc(p.code) + '</p><hr><p style="color:#667085;font-size:.8rem">Keep this receipt. The check code matches the SMS you received.</p>'
    + '<script>window.onload=function(){window.print()}<\/script></body>');
  w.document.close();
}

function Entries({ group, name }) {
  const t = useT();
  const { data, error, reload } = useLoad(() => api('/portal/postings'));
  const { msg, err, run } = useAction();
  const query = async (p) => { if (await confirmBox(t('Ask the chairperson to review entry #{id}?', { id: p.id }))) run(async () => { await api('/portal/disputes', { method: 'POST', body: { postingId: p.id } }); await reload(); }, t('Query sent')); };
  return (
    <>
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Ref</th><th>{t('Date')}</th><th>{t('Type')}</th><th className="num">{t('Amount')}</th><th className="num">{t('Savings after')}</th><th>Code</th><th></th><th></th></tr></thead>
          <tbody>{(data || []).map((p) => (
            <tr key={p.id} style={p.reversed ? { opacity: 0.55 } : undefined}>
              <td>{p.id}</td><td>{fmtDate(p.created_at)}</td>
              <td>{t(TYPE[p.type])} {p.reversed && <span className="tag">{t('Reversed')}</span>}</td>
              <td className={'num ' + (p.amount < 0 ? 'neg' : '')}>{kwacha(p.amount)}</td>
              <td className="num">{kwacha(p.running_balance)}</td>
              <td className="muted">{p.code}</td>
              <td><button className="link" onClick={() => printReceipt(p, group, name)}>{t('Receipt')}</button></td>
              <td>{p.dispute_status === 'open' ? <span className="tag open">{t('Under review')}</span> : <button className="link" onClick={() => query(p)}>{t('Query')}</button>}</td>
            </tr>
          ))}</tbody>
        </table>
        {data && !data.length && <p className="muted">{t('No entries yet.')}</p>}
        <p className="muted" style={{ fontSize: '.8rem' }}>{t("The code beside each entry should match the code in the SMS you received for it.")}</p>
      </div>
    </>
  );
}

function OnlineMeetings() {
  const t = useT();
  const { data, error } = useLoad(() => api('/portal/meetings'));
  const { err, run } = useAction();
  return (
    <div className="card">
      <p className="muted">{t('Online meetings use a private video link that only members of your group receive. Joining marks you present.')}</p>
      {(err || error) && <div className="error">{err || error}</div>}
      <table><tbody>{(data || []).map((m) => (
        <tr key={m.id}><td>{fmtDate(m.date)}{m.start_time ? ' ' + m.start_time : ''}</td><td className="num"><button onClick={() => run(() => openMeeting('/portal/meetings/' + m.id + '/join'), 'Done')}>{t('Join online meeting')}</button></td></tr>
      ))}</tbody></table>
      {data && !data.length && <p className="muted">{t('No online meetings.')}</p>}
    </div>
  );
}

function Minutes() {
  const t = useT();
  const { data } = useLoad(() => api('/portal/minutes'));
  if (!data || !data.length) return null;
  return (
    <div className="card">
      <h2>{t('Meeting minutes')}</h2>
      {data.map((m) => (
        <details key={m.id} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{fmtDate(m.date)}</summary>
          <div style={{ whiteSpace: 'pre-wrap', margin: '8px 0' }}>{m.minutes}</div>
          <div className="muted" style={{ fontSize: '.78rem' }}>{t('Recorded by')} {m.minutes_by}</div>
        </details>
      ))}
    </div>
  );
}

function Votes() {
  const t = useT();
  const { data, reload } = useLoad(() => api('/portal/polls'));
  const { err, run } = useAction();
  if (!data || !data.length) return null;
  return (
    <div className="card">
      <h2>{t('Votes')}</h2>
      {err && <div className="error">{err}</div>}
      {data.map((p) => (
        <div key={p.id} style={{ borderTop: '1px solid var(--line)', padding: '12px 0' }}>
          <b>{p.question}</b> <span className={'tag ' + (p.status === 'open' ? 'open' : '')}>{t(p.status)}</span>
          {p.options.map((o, i) => (
            <div key={i} style={{ margin: '8px 0' }}>
              {p.counts ? (
                <div className="bars"><div className="b" style={{ gridTemplateColumns: '1fr 90px' }}>
                  <div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{o}{p.myVote === i ? ' ✓' : ''}</span><span className="muted">{p.counts[i]}</span></div>
                    <div className="track"><div className="fill" style={{ width: (p.total ? (p.counts[i] / p.total) * 100 : 0) + '%' }} /></div></div>
                  <span className="muted num">{p.total ? Math.round((p.counts[i] / p.total) * 100) : 0}%</span></div></div>
              ) : (
                <button className="secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => run(async () => { await api('/portal/polls/' + p.id + '/vote', { method: 'POST', body: { option: i } }); await reload(); }, 'Vote recorded')}>{o}</button>
              )}
            </div>
          ))}
          {p.counts && <div className="muted" style={{ fontSize: '.8rem' }}>{p.total} {t('votes')}</div>}
          {!p.counts && <div className="muted" style={{ fontSize: '.8rem' }}>{t('Results appear after you vote.')}</div>}
        </div>
      ))}
    </div>
  );
}

function Messages() {
  const t = useT();
  const { data, error } = useLoad(() => api('/portal/messages'));
  const { data: news } = useLoad(() => api('/portal/announcements'));
  return (
    <>
    {(news || []).map((a) => (
      <div className="card" key={'a' + a.id}>
        <div className="muted" style={{ fontSize: '.8rem' }}>{t('Announcements')} · {fmtDate(a.created_at)}</div>
        <div style={{ whiteSpace: 'pre-wrap' }}>{a.body}</div>
      </div>
    ))}
    <div className="card">
      <p className="muted">{t('Messages sent to you')}</p>
      {error && <div className="error">{error}</div>}
      {(data || []).map((m) => (
        <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
          <div>{m.body}</div>
          <div className="muted" style={{ fontSize: '.8rem' }}>{new Date(m.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</div>
        </div>
      ))}
      {data && !data.length && <p className="muted">{t('No messages yet.')}</p>}
    </div>
    </>
  );
}

function LoanCalculator() {
  const t = useT();
  const [amount, setAmount] = useState('');
  const [inst, setInst] = useState('4');
  const [res, setRes] = useState(null);
  const { err, run } = useAction();
  const calc = (e) => {
    e.preventDefault();
    run(async () => {
      const a = toNgwee(amount);
      if (!a) throw new Error('Enter a valid amount');
      setRes(await api('/portal/loan-calc', { method: 'POST', body: { amount: a, instalments: Number(inst) } }));
    }, '');
  };
  return (
    <div className="card">
      <h2>{t('Loan calculator')}</h2>
      <p className="muted">{t('See what a loan would cost before you ask for it. This does not send a request.')}</p>
      <form className="row" onSubmit={calc}>
        <label>{t('Amount (K)')}<input value={amount} onChange={(e) => { setAmount(e.target.value); setRes(null); }} inputMode="decimal" size="8" required /></label>
        <label>{t('Instalments')}<input type="number" min="1" max="60" value={inst} onChange={(e) => { setInst(e.target.value); setRes(null); }} style={{ width: 80 }} /></label>
        <button>{t('Calculate')}</button>
      </form>
      {err && <div className="error">{err}</div>}
      {res && (
        <>
          <div className="grid" style={{ marginTop: 14 }}>
            <div className="stat"><div className="ico" aria-hidden="true">₭</div><div className="n">{kwacha(res.items[0].principalDue + res.items[0].interestDue)}</div><div className="l">{t('Each instalment')}</div></div>
            <div className="stat"><div className="ico" aria-hidden="true">％</div><div className="n">{kwacha(res.interest)}</div><div className="l">{t('Total interest')}</div></div>
            <div className="stat"><div className="ico" aria-hidden="true">∑</div><div className="n">{kwacha(res.total)}</div><div className="l">{t('You repay in total')}</div></div>
          </div>
          <div className={res.withinLimit ? 'ok' : 'error'}>{res.withinLimit ? t('This is within what you can borrow ({limit}).', { limit: kwacha(res.limit) }) : t('This is more than you can borrow right now ({limit}). Save more or ask for less.', { limit: kwacha(res.limit) })}</div>
          <table><thead><tr><th>#</th><th>{t('Due')}</th><th className="num">{t('Principal')}</th><th className="num">{t('Interest')}</th></tr></thead>
            <tbody>{res.items.map((i) => <tr key={i.seq}><td>{i.seq}</td><td>{fmtDate(i.dueDate)}</td><td className="num">{kwacha(i.principalDue)}</td><td className="num">{kwacha(i.interestDue)}</td></tr>)}</tbody></table>
        </>
      )}
    </div>
  );
}

function GuaranteeRequests() {
  const t = useT();
  const { data, reload } = useLoad(() => api('/portal/guarantee-requests'));
  const { err, run } = useAction();
  if (!data || !data.length) return null;
  const answer = (r, verb) => run(async () => { await api('/portal/guarantee-requests/' + r.id + '/' + verb, { method: 'POST' }); await reload(); }, 'Done');
  return (
    <div className="card">
      <h2>{t('Asked to be a guarantor')}</h2>
      <p className="muted">{t('A guarantor promises to help the group if the borrower cannot repay. Only agree if you trust them.')}</p>
      {err && <div className="error">{err}</div>}
      {data.map((r) => (
        <div key={r.id} style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
          <b>{r.borrower}</b> · {kwacha(r.amount)} · {r.instalments} {t('instalments')}
          <p style={{ margin: '6px 0 0' }}><button onClick={() => answer(r, 'accept')}>{t('Accept')}</button> <button className="secondary" onClick={() => answer(r, 'decline')}>{t('Decline')}</button></p>
        </div>
      ))}
    </div>
  );
}

function RequestLoan() {
  const t = useT();
  const { data, reload } = useLoad(() => api('/portal/loan-requests'));
  const [amount, setAmount] = useState('');
  const [inst, setInst] = useState('4');
  const [guarantor, setGuarantor] = useState('');
  const { data: people } = useLoad(() => api('/portal/people'));
  const { msg, err, run } = useAction();
  const send = (e) => {
    e.preventDefault();
    run(async () => {
      const a = toNgwee(amount);
      if (!a) throw new Error('Enter a valid amount');
      await api('/portal/loan-requests', { method: 'POST', body: { amount: a, instalments: Number(inst), guarantorId: guarantor ? Number(guarantor) : undefined } });
      setAmount(''); setGuarantor(''); await reload();
    }, 'Request sent');
  };
  const cancel = (r) => run(async () => { await api('/portal/loan-requests/' + r.id + '/cancel', { method: 'POST' }); await reload(); }, 'Done');
  return (
    <div className="card">
      <h2>{t('Request a loan')}</h2>
      <form className="row" onSubmit={send}>
        <label>{t('Amount (K)')}<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" size="8" required /></label>
        <label>{t('Instalments')}<input type="number" min="1" max="60" value={inst} onChange={(e) => setInst(e.target.value)} style={{ width: 80 }} /></label>
        <label>{t('Guarantor (optional)')}
          <select value={guarantor} onChange={(e) => setGuarantor(e.target.value)}>
            <option value="">{t('No guarantor')}</option>
            {(people || []).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select></label>
        <button>{t('Send request')}</button>
      </form>
      {msg && <div className="ok">{msg}</div>}{err && <div className="error">{err}</div>}
      {(data || []).slice(0, 5).map((r) => (
        <div key={r.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
          {kwacha(r.amount)} · {r.instalments} · <span className={'tag ' + (r.status === 'approved' ? 'good' : r.status === 'pending' ? 'open' : 'bad')}>{t(r.status)}</span>
          {r.guarantor_name && <span className="muted"> · {t('Guarantor')}: {r.guarantor_name} ({t(r.guarantor_status)})</span>}
          {r.status === 'pending' && r.approvals > 0 && <span className="muted"> · {t('1 officer has approved; waiting for a second')}</span>}
          {r.status === 'pending' && <> <button className="link neg" onClick={() => cancel(r)}>{t('Cancel')}</button></>}
          {r.note && <div className="muted" style={{ fontSize: '.82rem' }}>{r.note}</div>}
        </div>
      ))}
    </div>
  );
}

function MyLoans() {
  const t = useT();
  const { data, error } = useLoad(() => api('/portal/loans'));
  if (error) return <div className="error">{error}</div>;
  if (data && !data.length) return <><GuaranteeRequests /><RequestLoan /><LoanCalculator /><p className="muted">{t('No loans.')}</p></>;
  return [<GuaranteeRequests key="gr" />, <RequestLoan key="req" />, <LoanCalculator key="calc" />, ...(data || []).map((l) => (
    <div className="card" key={l.id} style={{ overflowX: 'auto' }}>
      <h2>{kwacha(l.principal)} · {fmtDate(l.disbursed_at)} <span className={'tag ' + (l.status === 'settled' ? 'good' : 'open')}>{t(l.status)}</span></h2>
      <table>
        <thead><tr><th>#</th><th>{t('Due')}</th><th className="num">{t('Principal')}</th><th className="num">{t('Interest')}</th><th className="num">{t('Paid')}</th></tr></thead>
        <tbody>{l.schedule.map((s) => (
          <tr key={s.seq}><td>{s.seq}</td><td>{fmtDate(s.due_date)}</td><td className="num">{kwacha(s.principal_due)}</td><td className="num">{kwacha(s.interest_due)}</td><td className="num">{kwacha(s.paid_amount)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  ))];
}

function GroupRoomMember() {
  const t = useT();
  const { data, reload } = useLoad(() => api('/portal/community'));
  useEffect(() => { const id = setInterval(reload, 12000); return () => clearInterval(id); }, [reload]);
  return (
    <div className="card">
      <h2>{t('Group chat')}</h2>
      <p className="muted">{t('Everyone in your group can read this room. Be kind and keep it about the group.')}</p>
      <Thread messages={data} mine={(m) => m.mine}
        canDelete={(m) => m.mine} onDelete={async (m) => { if (await confirmBox(t('Delete this message?'))) { await api('/portal/community/' + m.id, { method: 'DELETE' }); reload(); } }}
        canReport={(m) => !m.mine} onReport={async (m) => { const reason = await promptBox(t('Why are you reporting this message? (optional)')); if (reason !== null) { await api('/portal/community/' + m.id + '/report', { method: 'POST', body: { reason } }); alert(t('Thank you. The chairperson will review it.')); } }}
        onSend={async (body) => { await api('/portal/community', { method: 'POST', body: { body } }); await reload(); }}
        placeholder={t('Write to the group…')} />
    </div>
  );
}

function People() {
  const t = useT();
  const { data, reload } = useLoad(() => api('/portal/people'));
  const [sel, setSel] = useState(null);
  const [thread, setThread] = useState(null);
  const open = async (id) => { setSel(id); try { setThread(await api('/portal/dm/' + id)); reload(); } catch { setThread(null); } };
  useEffect(() => {
    if (!sel) return undefined;
    const id = setInterval(() => api('/portal/dm/' + sel).then(setThread).catch(() => {}), 12000);
    return () => clearInterval(id);
  }, [sel]);
  const initials = (n) => (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  if (sel && thread) {
    return (
      <div className="card">
        <div className="chat-head"><button type="button" className="link" style={{ fontSize: '1.4rem' }} onClick={() => { setSel(null); setThread(null); reload(); }} aria-label={t('Back')}>←</button><div className="chat-av" aria-hidden="true">{initials(thread.person.full_name)}</div><h2>{thread.person.full_name}</h2></div>
        <p className="muted" style={{ fontSize: '.8rem' }}>{t('Private: only you and {name} can read this.', { name: thread.person.full_name })}</p>
        <Thread messages={thread.messages} mine={(m) => m.mine}
          onSend={async (body) => { await api('/portal/dm/' + sel, { method: 'POST', body: { body } }); await open(sel); }}
          placeholder={t('Write a message…')} />
      </div>
    );
  }
  return (
    <div className="card chat-list" style={{ maxHeight: 'none' }}>
      <h2 style={{ padding: '10px 10px 0' }}>{t('Message a member')}</h2>
      {(data || []).map((m) => (
        <div key={m.id} role="button" tabIndex={0} className="chat-item" onClick={() => open(m.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(m.id); } }}>
          <div className="chat-av" aria-hidden="true">{initials(m.full_name)}</div>
          <div className="chat-meta"><b>{m.full_name}</b><small>{m.last_body || t('No messages yet.')}</small></div>
          {m.unread > 0 && <span className="chat-unread">{m.unread}</span>}
        </div>
      ))}
      {data && !data.length && <p className="muted" style={{ padding: 10 }}>{t('No other members yet.')}</p>}
    </div>
  );
}

function ChatHub() {
  const t = useT();
  const [view, setView] = useState('group');
  const { data: u } = useLoad(() => api('/portal/chat/unread'), [view]);
  const tabs = [['group', 'Group chat'], ['people', 'Members', u?.direct], ['officers', 'Officers', u?.officers]];
  return (
    <>
      <div className="seg" role="tablist">
        {tabs.map(([k, label, n]) => <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{t(label)}{n > 0 && <span className="chat-unread" style={{ marginLeft: 6, display: 'inline-grid' }}>{n}</span>}</button>)}
      </div>
      {view === 'group' && <GroupRoomMember />}
      {view === 'people' && <People />}
      {view === 'officers' && <OfficerChat />}
    </>
  );
}

function OfficerChat() {
  const t = useT();
  const { data, reload } = useLoad(() => api('/portal/chat'));
  useEffect(() => { const id = setInterval(reload, 15000); return () => clearInterval(id); }, [reload]);
  return (
    <div className="card">
      <h2>{t('Message the officers')}</h2>
      <p className="muted">{t('Your chairperson, treasurer and secretary can read and answer here.')}</p>
      <Thread messages={data} mine={(m) => !m.from_officer}
        onSend={async (body) => { await api('/portal/chat', { method: 'POST', body: { body } }); await reload(); }}
        placeholder={t('Write a message…')} />
    </div>
  );
}

function Pay() {
  const t = useT();
  const { data, reload } = useLoad(() => api('/portal/payments'));
  const { data: loans } = useLoad(() => api('/portal/loans'));
  const [loanId, setLoanId] = useState('');
  const owing = (loans || []).filter((l) => l.status === 'active').map((l) => ({ id: l.id, left: l.schedule.reduce((a, x) => a + x.principal_due + x.interest_due - x.paid_amount, 0) })).filter((l) => l.left > 0);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('MTN Mobile Money');
  const [ref, setRef] = useState('');
  const { msg, err, run } = useAction();
  const send = (e) => {
    e.preventDefault();
    run(async () => {
      const a = toNgwee(amount);
      if (!a) throw new Error('Enter a valid amount');
      await api('/portal/payments', { method: 'POST', body: { amount: a, method, reference: ref, loanId: loanId ? Number(loanId) : undefined } });
      setAmount(''); setRef(''); await reload();
    }, 'Sent. An officer will confirm it.');
  };
  const cancel = (p) => run(async () => { await api('/portal/payments/' + p.id + '/cancel', { method: 'POST' }); await reload(); }, 'Done');
  return (
    <div className="card">
      <h2>{t('Make a contribution')}</h2>
      <p className="muted">{t('Send the money by mobile money to your group, then enter the amount and the transaction ID from the payment message. An officer confirms it and it is added to your savings.')}</p>
      <form className="row" onSubmit={send}>
        {owing.length > 0 && <label>{t('Pay for')}
          <select value={loanId} onChange={(e) => { setLoanId(e.target.value); const l = owing.find((x) => String(x.id) === e.target.value); if (l) setAmount((l.left / 100).toFixed(2)); }}>
            <option value="">{t('My savings (contribution)')}</option>
            {owing.map((l) => <option key={l.id} value={l.id}>{t('Loan repayment')} · {kwacha(l.left)} {t('owed')}</option>)}
          </select></label>}
        <label>{t('Amount (K)')}<input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" size="8" required /></label>
        <label>{t('Paid with')}
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option>MTN Mobile Money</option><option>Airtel Money</option><option>Zamtel Kwacha</option><option>Bank</option>
          </select>
        </label>
        <label>{t('Transaction ID')}<input value={ref} onChange={(e) => setRef(e.target.value)} minLength={4} maxLength={60} required /></label>
        <button>{t('Send')}</button>
      </form>
      {msg && <div className="ok">{t(msg)}</div>}{err && <div className="error">{err}</div>}
      {(data || []).map((p) => (
        <div key={p.id} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
          {p.loan_id ? t('Loan repayment') + ' · ' : ''}{kwacha(p.amount)} · {p.method} · {p.reference} · {fmtDate(p.created_at)} · <span className={'tag ' + (p.status === 'confirmed' ? 'good' : p.status === 'pending' ? 'open' : 'bad')}>{t(p.status)}</span>
          {p.status === 'pending' && <> <button className="link neg" onClick={() => cancel(p)}>{t('Cancel')}</button></>}
          {p.note && <div className="muted" style={{ fontSize: '.82rem' }}>{p.note}</div>}
        </div>
      ))}
    </div>
  );
}

function ChangePassword() {
  const t = useT();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const { msg, err, run } = useAction();
  const save = (e) => {
    e.preventDefault();
    run(async () => {
      if (next !== again) throw new Error('The two passwords do not match');
      await api('/portal/change-password', { method: 'POST', body: { current: cur, newPassword: next } });
      setCur(''); setNext(''); setAgain('');
    }, 'Password saved');
  };
  const type = show ? 'text' : 'password';
  return (
    <form className="card row" onSubmit={save}>
      <h2 style={{ width: '100%' }}>{t('Create my password')}</h2>
      <p className="muted" style={{ width: '100%' }}>{t('Choose your own password of 8 or more characters. You can then sign in with it instead of your PIN.')}</p>
      <label>{t('Current PIN or password')}<input type={type} value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required /></label>
      <label>{t('New password (8+ characters)')}<input type={type} value={next} onChange={(e) => setNext(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required /></label>
      <label>{t('Repeat new password')}<input type={type} value={again} onChange={(e) => setAgain(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" required /></label>
      <button type="button" className="link" onClick={() => setShow(!show)} aria-pressed={show}>{t(show ? 'Hide' : 'Show')}</button>
      <button>{t('Save password')}</button>
      {msg && <div className="ok" style={{ width: '100%' }}>{t(msg)}</div>}{err && <div className="error" style={{ width: '100%' }}>{t(err)}</div>}
    </form>
  );
}

function ChangePin() {
  const t = useT();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const { msg, err, run } = useAction();
  const digits = (set) => (e) => set(e.target.value.replace(/\D/g, '').slice(0, 4));
  const save = (e) => {
    e.preventDefault();
    run(async () => { await api('/portal/change-pin', { method: 'POST', body: { currentPin: cur, newPin: next } }); setCur(''); setNext(''); }, 'PIN changed');
  };
  return (
    <form className="card row" onSubmit={save}>
      <h2 style={{ width: '100%' }}>{t('Change my PIN')}</h2>
      <label>{t('Current PIN')}<input type="password" value={cur} onChange={digits(setCur)} inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="current-password" required /></label>
      <label>{t('New 4-digit PIN')}<input type="password" value={next} onChange={digits(setNext)} inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="new-password" required /></label>
      <button>{t('Save PIN')}</button>
      {msg && <div className="ok" style={{ width: '100%' }}>{t(msg)}</div>}{err && <div className="error" style={{ width: '100%' }}>{err}</div>}
    </form>
  );
}

export default function Portal({ onLogout }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const { data: me } = useLoad(() => api('/portal/me'));
  const [tab, setTab] = useState(() => (takeGo() === 'pay' ? 'pay' : 'overview'));
  const [unread, setUnread] = useState(0);
  const [showPrivacy, setShowPrivacy] = useState(false);
  useEffect(() => {
    const check = () => api('/portal/chat/unread').then((r) => setUnread(r.unread)).catch(() => {});
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [tab]);
  const TABS = [['overview', 'Overview', '▦'], ['pay', 'Pay', '＋'], ['entries', 'My entries', '☰'], ['loans', 'My loans', '₭'], ['meetings', 'Meetings', '◷'], ['chat', 'Chat', '✉'], ['messages', 'Notifications', '🔔']];

  // Keep SMS language in step with the language the member picks here.
  const changeLang = (l) => { setLang(l); api('/portal/language', { method: 'PATCH', body: { language: l } }).catch(() => {}); };

  return (
    <div className="shell">
      <header className="top">
        <div className="brand"><div className="logo" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="6.5" rx="6.5" ry="2.5" /><path d="M5.5 6.5V10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V6.5" /><path d="M5.5 10v3.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V10" /><path d="M5.5 13.5V17c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-3.5" /></svg></div><div>GroupSave<small>{t('My account').toUpperCase()}</small></div></div>
        <span style={{ flex: 1 }} />
        <select className="langsel" value={lang} onChange={(e) => changeLang(e.target.value)} aria-label="Language">{LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>
        <ThemeToggle />
        <button className="langsel" onClick={onLogout} style={{ cursor: 'pointer' }}>{t('Log out')}</button>
      </header>
      <main className="content">
        <JoinBanner />
        <h1>{me ? me.full_name : '…'}</h1>
        <p className="sub">{me?.group_name}</p>
        <div className="tabs" role="tablist">
          {TABS.map(([k, label, icon]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'tab on' : 'tab'} onClick={() => { setTab(k); window.scrollTo({ top: 0 }); }}><span className="ti" aria-hidden="true">{icon}</span><span className="tl">{t(label)}</span>{k === 'chat' && unread > 0 && <span className="badge" style={{ position: 'static', marginLeft: 6 }}>{unread}</span>}</button>)}
        </div>
        {tab === 'pay' && <Pay />}
        {tab === 'overview' && <><Overview /><Goals /><Leaderboard /><ChangePin /><ChangePassword /><p><button className="secondary" onClick={() => download('/portal/my-data', 'my-groupsave-data.json')}>{t('Download my data')}</button></p></>}
        {tab === 'entries' && <Entries group={me?.group_name} name={me?.full_name} />}
        {tab === 'loans' && <MyLoans />}
        {tab === 'meetings' && <><Votes /><OnlineMeetings /><Minutes /></>}
        {tab === 'chat' && <ChatHub />}
        {tab === 'messages' && <Messages />}
        <p className="muted" style={{ textAlign: 'center' }}><button type="button" className="link" onClick={() => setShowPrivacy(!showPrivacy)}>{t('Privacy and terms')}</button></p>
        {showPrivacy && <Privacy />}
      </main>
    </div>
  );
}
