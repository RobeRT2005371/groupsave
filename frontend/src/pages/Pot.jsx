import { api, kwacha, fmtDate, download } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { confirmBox, promptBox } from '../dialogs.jsx';

export default function Pot({ me }) {
  const t = useT();
  const { data: pot, error, reload } = useLoad(() => api('/payments/pot'));
  const { data: payments, reload: reloadPayments } = useLoad(() => api('/payments'));
  const { data: unpaid, reload: reloadUnpaid } = useLoad(() => api('/payments/unpaid'));
  const { data: trend } = useLoad(() => api('/payments/trend'));
  const { msg, err, run } = useAction();
  const canDecide = ['chairperson', 'treasurer'].includes(me.role);
  const refresh = async () => { await Promise.all([reload(), reloadPayments(), reloadUnpaid()]); };
  const remind = async () => { if (await confirmBox(t('Send an SMS reminder to {n} member(s)?', { n: unpaid.members.length }))) run(async () => { const r = await api('/payments/remind-unpaid', { method: 'POST' }); await reloadUnpaid(); return r; }, 'Reminders queued'); };
  const max = Math.max(1, ...(trend || []).map((x) => x.total));
  const confirmPay = (p) => run(async () => { await api(`/payments/${p.id}/confirm`, { method: 'POST' }); await refresh(); }, 'Payment recorded');
  const reject = async (p) => { const reason = await promptBox(t('Reason for rejecting (optional)')); if (reason !== null) run(async () => { await api(`/payments/${p.id}/reject`, { method: 'POST', body: { reason } }); await refresh(); }, 'Payment rejected'); };

  return (
    <>
      <h1>{t('Pot')}</h1>
      <p className="sub">{t('How much money the group holds right now.')}</p>
      <p className="no-print row">
        <button className="secondary" onClick={() => download('/reports/savings.csv', 'savings.csv')}>{t('Download for Excel')}</button>
        <button className="secondary" onClick={() => window.print()}>{t('Print or save as PDF')}</button>
      </p>
      {(error || err) && <div className="error">{error || err}</div>}
      {msg && <div className="ok">{msg}</div>}
      {!pot && !error && <><div className="skeleton h-hero" /><div className="grid">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-stat" />)}</div></>}
      {pot && !pot.cycle && <p className="muted">{t('No open cycle.')}</p>}
      {pot?.cycle && (
        <>
          <div className="grid">
            <div className="stat"><div className="ico" aria-hidden="true">◉</div><div className="n">{kwacha(pot.pot)}</div><div className="l">{t('Money in the pot')}</div></div>
            <div className="stat"><div className="ico" aria-hidden="true">＋</div><div className="n">{kwacha(pot.contributions)}</div><div className="l">{t('Contributions')}</div></div>
            <div className="stat"><div className="ico" aria-hidden="true">₭</div><div className="n">{kwacha(pot.loansOut - pot.repayments)}</div><div className="l">{t('Lent out, not yet repaid')}</div></div>
            <div className="stat"><div className="ico" aria-hidden="true">⏳</div><div className="n">{kwacha(pot.pending.total)}</div><div className="l">{t('Online payments waiting')} ({pot.pending.count})</div></div>
          </div>
          <div className="card muted">
            {t('Fines')}: {kwacha(pot.fines)} · {t('Loan repayments')}: {kwacha(pot.repayments)} · {t('Paid out')}: {kwacha(pot.paidOut)} · {fmtDate(pot.cycle.start_date)} – {fmtDate(pot.cycle.end_date)}
          </div>
        </>
      )}

      {trend && trend.length > 0 && (
        <div className="card">
          <h2>{t('Contributions per week')}</h2>
          <div role="img" aria-label={t('Contributions per week')} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
            {trend.map((x) => (
              <div key={x.week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={fmtDate(x.week) + ': ' + kwacha(x.total)}>
                <div style={{ width: '100%', maxWidth: 40, height: Math.max(4, (x.total / max) * 100) + '%', background: 'var(--accent)', borderRadius: '6px 6px 0 0' }} />
                <small className="muted" style={{ fontSize: '.65rem', marginTop: 4 }}>{fmtDate(x.week).slice(0, 5)}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {unpaid && unpaid.members.length > 0 && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{t('Not paid this period')} ({unpaid.members.length})</h2>
            {canDecide && <button className="no-print" onClick={remind}>{t('Send reminder')}</button>}
          </div>
          <p className="muted">{t('Members with no contribution in the last {n} days. Expected: {amt} each.', { n: unpaid.days, amt: kwacha(unpaid.amount) })}</p>
          <p>{unpaid.members.map((m) => m.full_name).join(' · ')}</p>
        </div>
      )}
      {unpaid && unpaid.members.length === 0 && <div className="card muted">{t('Everyone has paid this period.')}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <h2>{t('Online payments')}</h2>
        <p className="muted">{t('Check each one against the mobile-money message or your account before confirming. Confirming adds it to the member’s savings.')}</p>
        <table>
          <thead><tr><th>{t('Date')}</th><th>{t('Member')}</th><th>{t('Method')}</th><th>{t('Transaction ID')}</th><th className="num">{t('Amount')}</th><th></th></tr></thead>
          <tbody>{(payments || []).map((p) => (
            <tr key={p.id}>
              <td>{fmtDate(p.created_at)}</td><td>{p.member_name}</td><td>{p.loan_id ? t('Loan repayment') + ' · ' : ''}{p.method}</td><td>{p.reference}</td><td className="num">{kwacha(p.amount)}</td>
              <td>{p.status === 'pending'
                ? (canDecide ? <><button onClick={() => confirmPay(p)}>{t('Confirm')}</button>{' '}<button className="secondary" onClick={() => reject(p)}>{t('Reject')}</button></> : <span className="tag open">{t('pending')}</span>)
                : <span className={'tag ' + (p.status === 'confirmed' ? 'good' : 'bad')}>{t(p.status)}</span>}</td>
            </tr>
          ))}</tbody>
        </table>
        {payments && !payments.length && <p className="muted">{t('No online payments yet.')}</p>}
      </div>

      {pot?.cycle && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <h2>{t('Savings by member')}</h2>
          <table>
            <thead><tr><th>{t('Name')}</th><th className="num">{t('Savings')}</th><th className="num">{t('Fines')}</th></tr></thead>
            <tbody>{pot.members.map((m) => <tr key={m.id}><td>{m.full_name}</td><td className="num">{kwacha(m.savings)}</td><td className="num">{kwacha(m.fines)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
