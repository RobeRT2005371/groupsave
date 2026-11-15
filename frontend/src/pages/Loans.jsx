import { Fragment, useState } from 'react';
import { api, kwacha, toNgwee, fmtDate } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT, tr } from '../i18n.jsx';
import Dialog from '../Dialog.jsx';
import { promptBox } from '../dialogs.jsx';

function RepayDialog({ loan, onClose, onDone }) {
  const t = useT();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const v = toNgwee(amount);
    if (!v) { setError(t('Enter a valid amount')); return; }
    if (v > loan.outstanding) { setError(t('That is more than the {amount} still owed.', { amount: kwacha(loan.outstanding) })); return; }
    setBusy(true); setError('');
    try {
      await api(`/loans/${loan.id}/repay`, { method: 'POST', body: { amount: v } });
      onDone(t('Repayment of {amount} recorded for {name}.', { amount: kwacha(v), name: loan.member_name }));
    } catch (err) { setError(tr(err.message)); setBusy(false); }
  };
  return (
    <Dialog title={t('Record repayment')} onClose={onClose}>
      <form onSubmit={submit}>
        <p className="muted" style={{ marginTop: 0 }}><b>{loan.member_name}</b> · {t('Still owed')}: <b>{kwacha(loan.outstanding)}</b></p>
        <label>{t('Amount (K)')}
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" autoFocus placeholder="0.00" />
        </label>
        <p style={{ margin: '8px 0' }}><button type="button" className="link" onClick={() => setAmount((loan.outstanding / 100).toFixed(2))}>{t('Pay in full')} ({kwacha(loan.outstanding)})</button></p>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="dlg-actions">
          <button type="button" className="secondary" onClick={onClose}>{t('Cancel')}</button>
          <button disabled={busy}>{t(busy ? 'Saving…' : 'Record repayment')}</button>
        </div>
      </form>
    </Dialog>
  );
}

function Schedule({ loanId }) {
  const t = useT();
  const { data } = useLoad(() => api(`/loans/${loanId}/schedule`), [loanId]);
  if (!data) return <p>{t("Loading…")}</p>;
  return (
    <table>
      <thead><tr><th>#</th><th>{t("Due")}</th><th className="num">{t("Principal")}</th><th className="num">{t("Interest")}</th><th className="num">{t("Paid")}</th></tr></thead>
      <tbody>{data.map((s) => (
        <tr key={s.id}><td>{s.seq}</td><td>{fmtDate(s.due_date)}</td><td className="num">{kwacha(s.principal_due)}</td><td className="num">{kwacha(s.interest_due)}</td><td className="num">{kwacha(s.paid_amount)}</td></tr>
      ))}</tbody>
    </table>
  );
}

function LoanRequests({ onDecided }) {
  const t = useT();
  const { data, error, reload } = useLoad(() => api('/loan-requests'));
  const { msg, err, run } = useAction();
  const [waitMsg, setWaitMsg] = useState('');
  const pending = (data || []).filter((r) => r.status === 'pending');
  const decide = async (r, kind) => {
    let body;
    if (kind === 'reject') { const note = await promptBox(t('Reason for rejecting (shown to the member)')); if (note === null) return; body = { note }; }
    setWaitMsg('');
    run(async () => { const out = await api('/loan-requests/' + r.id + '/' + kind, { method: 'POST', body }); await reload(); onDecided(); return out; }, (out) => (out?.waiting ? 'Your approval is recorded. A second officer must approve before the loan is paid out.' : kind === 'approve' ? 'Loan request approved' : 'Loan request rejected'));
  };
  if (!pending.length && !error) return null;
  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <h2>{t('Loan requests')}</h2>
      {(err || error) && <div className="error">{err || error}</div>}{msg && <div className="ok">{msg}</div>}
      <table>
        <thead><tr><th>{t('Member')}</th><th className="num">{t('Amount')}</th><th>{t('Instalments')}</th><th>{t('Guarantor')}</th><th>{t('Approvals')}</th><th></th></tr></thead>
        <tbody>{pending.map((r) => (
          <tr key={r.id}><td>{r.member_name}</td><td className="num">{kwacha(r.amount)}</td><td>{r.instalments}</td>
            <td>{r.guarantor_name ? <>{r.guarantor_name} <span className={'tag ' + (r.guarantor_status === 'accepted' ? 'good' : r.guarantor_status === 'declined' ? 'bad' : 'open')}>{t(r.guarantor_status)}</span><div className="muted" style={{ fontSize: '.75rem' }}>{t('Savings')}: {kwacha(r.guarantor_savings)}</div></> : '—'}</td>
            <td>{r.needs_two ? <span className={'tag ' + (r.approvals >= 1 ? 'open' : '')}>{r.approvals}/2</span> : '1'}</td>
            <td><button disabled={(r.guarantor_name && r.guarantor_status !== 'accepted') || r.approved_by_me} title={r.approved_by_me ? t('You already approved this') : r.guarantor_status === 'pending' ? t('Waiting for the guarantor') : ''} onClick={() => decide(r, 'approve')}>{t('Approve')}</button> <button className="link neg" onClick={() => decide(r, 'reject')}>{t('Reject')}</button></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export default function Loans({ me, cycle }) {
  const t = useT();
  const canAct = ['chairperson', 'treasurer'].includes(me.role);
  const { data: members } = useLoad(() => api('/members'));
  const { data: loans, error, reload } = useLoad(() => api('/loans'));
  const [f, setF] = useState({ memberId: '', principal: '', instalments: '4' });
  const [open, setOpen] = useState(null);
  const [repaying, setRepaying] = useState(null);
  const [doneMsg, setDoneMsg] = useState('');
  const { msg, err, run } = useAction();

  const issue = (e) => {
    e.preventDefault();
    const principal = toNgwee(f.principal);
    run(async () => {
      if (!principal) throw new Error('Enter a valid amount');
      await api('/loans', { method: 'POST', body: { memberId: Number(f.memberId), principal, instalments: Number(f.instalments) } });
      setF({ ...f, principal: '' }); await reload();
    }, 'Loan disbursed. Member notified by SMS.');
  };
  const repay = (l) => setRepaying(l);

  return (
    <>
      <h1>{t("Loans")}</h1>
      {repaying && <RepayDialog loan={repaying} onClose={() => setRepaying(null)} onDone={async (m) => { setRepaying(null); await reload(); setDoneMsg(m); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
      {doneMsg && <div className="ok" role="status">{doneMsg}</div>}
      {canAct && cycle && (
        <>
          <form className="card row" onSubmit={issue}>
            <label>{t("Member")}
              <select value={f.memberId} onChange={(e) => setF({ ...f, memberId: e.target.value })} required>
                <option value="">{t("Choose…")}</option>
                {(members || []).filter((m) => m.status === 'active').map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </label>
            <label>{t("Principal (K)")}<input value={f.principal} onChange={(e) => setF({ ...f, principal: e.target.value })} size="8" required /></label>
            <label>{t("Instalments")}<input type="number" min="1" max="60" value={f.instalments} onChange={(e) => setF({ ...f, instalments: e.target.value })} style={{ width: 80 }} /></label>
            <button>{t("Disburse loan")}</button>
            <button type="button" className="secondary" onClick={() => run(async () => { const r = await api('/loans/late-fines', { method: 'POST' }); await reload(); return r; }, 'Late fines applied')}>{t("Apply late fines")}</button>
          </form>
          <p className="muted">{t("Limit: {limit}× the member's savings, less what they already owe. Interest {interest}% per period ({basis}).", { limit: cycle.rules.loan_limit_multiple, interest: cycle.rules.interest_bps / 100, basis: t(cycle.rules.interest_basis) })}</p>
        </>
      )}
      {canAct && <LoanRequests onDecided={reload} />}
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>{t("Member")}</th><th className="num">{t("Principal")}</th><th className="num">{t("Outstanding")}</th><th>{t("Next due")}</th><th>{t("Status")}</th><th></th></tr></thead>
          <tbody>{(loans || []).map((l) => (
            <Fragment key={l.id}>
              <tr>
                <td>{l.member_name}</td><td className="num">{kwacha(l.principal)}</td><td className="num">{kwacha(l.outstanding)}</td>
                <td>{l.status === 'active' && l.next_due ? fmtDate(l.next_due) : '—'} {l.overdue_items > 0 && <span className="tag bad">{t("overdue")}</span>}</td>
                <td><span className={'tag ' + (l.status === 'settled' ? 'good' : 'open')}>{t(l.status)}</span></td>
                <td>
                  <button className="link" onClick={() => setOpen(open === l.id ? null : l.id)}>{t("Schedule")}</button>{' '}
                  {canAct && l.status === 'active' && <button className="link" onClick={() => repay(l)}>{t("Record repayment")}</button>}
                </td>
              </tr>
              {open === l.id && <tr><td colSpan="6"><Schedule loanId={l.id} /></td></tr>}
            </Fragment>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
