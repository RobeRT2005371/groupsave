import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, kwacha, toNgwee, fmtDate } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { confirmBox } from '../dialogs.jsx';

function NewCycle({ reload }) {
  const t = useT();
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({ startDate: today, endDate: '', contribution: '50', frequency: 'weekly', interest: '10', basis: 'flat', limit: '3', fineLate: '10', fineAbsence: '20', shareout: 'savings' });
  const { msg, err, run } = useAction();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await api('/cycles', { method: 'POST', body: {
        startDate: f.startDate, endDate: f.endDate,
        rules: {
          contribution_amount: toNgwee(f.contribution), frequency: f.frequency,
          interest_bps: Math.round(Number(f.interest) * 100), interest_basis: f.basis,
          loan_limit_multiple: Number(f.limit), fine_late: Math.round(Number(f.fineLate) * 100),
          fine_absence: Math.round(Number(f.fineAbsence) * 100), shareout_basis: f.shareout,
        } } });
      await reload();
    }, 'Cycle opened');
  };
  return (
    <form className="card" onSubmit={submit}>
      <h2>{t("Open a new savings cycle")}</h2>
      <p className="muted">{t("Rules are fixed when a cycle opens; changes apply to the next cycle.")}</p>
      <div className="row">
        <label>{t("Start")}<input type="date" value={f.startDate} onChange={set('startDate')} required /></label>
        <label>{t("End")}<input type="date" value={f.endDate} onChange={set('endDate')} required /></label>
        <label>{t("Contribution (K)")}<input value={f.contribution} onChange={set('contribution')} size="6" /></label>
        <label>{t("Frequency")}
          <select value={f.frequency} onChange={set('frequency')}><option value="weekly">{t("weekly")}</option><option value="fortnightly">{t("fortnightly")}</option><option value="monthly">{t("monthly")}</option></select>
        </label>
        <label>{t("Interest per period (%)")}<input value={f.interest} onChange={set('interest')} size="5" /></label>
        <label>{t("Interest basis")}
          <select value={f.basis} onChange={set('basis')}><option value="flat">{t("flat")}</option><option value="reducing">{t("reducing")}</option></select>
        </label>
        <label>{t("Loan limit (× savings)")}<input value={f.limit} onChange={set('limit')} size="4" /></label>
        <label>{t("Late fine (K)")}<input value={f.fineLate} onChange={set('fineLate')} size="5" /></label>
        <label>{t("Absence fine (K)")}<input value={f.fineAbsence} onChange={set('fineAbsence')} size="5" /></label>
        <label>{t("Share-out by")}
          <select value={f.shareout} onChange={set('shareout')}><option value="savings">{t("savings")}</option><option value="shares">{t("shares")}</option></select>
        </label>
        <button>{t("Open cycle")}</button>
      </div>
      {msg && <div className="ok">{msg}</div>}{err && <div className="error">{err}</div>}
    </form>
  );
}

export default function Dashboard({ me, cycle, reload }) {
  const t = useT();
  const { err, run } = useAction();
  const { data: s, error } = useLoad(() => (cycle ? api(`/cycles/${cycle.id}/summary`) : Promise.resolve(null)), [cycle?.id]);
  if (!cycle) {
    return me.role === 'chairperson'
      ? <><h1>{t("Dashboard")}</h1><NewCycle reload={reload} /></>
      : <><h1>{t("Dashboard")}</h1><p>{t("No open cycle. Ask the chairperson to open one.")}</p></>;
  }
  if (error) return <div className="error">{error}</div>;
  if (!s) return <p>{t("Loading…")}</p>;
  const r = cycle.rules;
  return (
    <>
      {!me.totp_enabled && (
        <div className="banner"><span><b>{t("Protect the ledger:")}</b>{t(" turn on two-factor sign-in for your account.")}</span><Link to="/settings">{t("Set up now →")}</Link></div>
      )}
      <h1>{t('Cycle {start} – {end}', { start: fmtDate(cycle.start_date), end: fmtDate(cycle.end_date) })}</h1>
      <p className="sub">{me.group_name} · {t('overview of savings, loans and the pool')}</p>
      <div className="grid">
        <div className="stat"><div className="ico" aria-hidden="true">◉</div><div className="n">{kwacha(s.pool)}</div><div className="l">{t("Cash in the pool")}</div></div>
        <div className="stat"><div className="ico" aria-hidden="true">▲</div><div className="n">{kwacha(s.contributions)}</div><div className="l">{t("Total savings")}</div></div>
        <div className="stat"><div className="ico" aria-hidden="true">₭</div><div className="n">{kwacha(s.loansOutstanding)}</div><div className="l">Loans outstanding ({s.activeLoans})</div></div>
        <div className="stat"><div className="ico" aria-hidden="true">⚑</div><div className="n">{kwacha(s.fines)}</div><div className="l">{t("Fines collected")}</div></div>
      </div>
      <div className="card">
        <h2>{t("Members' savings")}</h2>
        <div className="bars">{s.members.map((m) => (
          <div className="b" key={'b' + m.id}><span>{m.full_name}</span><div className="track"><div className="fill" style={{ width: (Math.max(...s.members.map((x) => x.savings), 1) ? (m.savings / Math.max(...s.members.map((x) => x.savings), 1)) * 100 : 0) + '%' }} /></div><span className="num">{kwacha(m.savings)}</span></div>
        ))}</div>
        <table>
          <thead><tr><th>{t("Member")}</th><th className="num">{t("Savings")}</th><th className="num">{t("Fines")}</th></tr></thead>
          <tbody>{s.members.map((m) => (
            <tr key={m.id}><td>{m.full_name} {m.status === 'exited' && <span className="tag">{t("exited")}</span>}</td><td className="num">{kwacha(m.savings)}</td><td className="num">{kwacha(m.fines)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card muted">
        {me.role === 'chairperson' && <p className="noprint"><button className="link neg" onClick={async () => { if (await confirmBox(t('Delete this cycle? Only possible if it has no entries or loans.'))) run(async () => { await api(`/cycles/${cycle.id}`, { method: 'DELETE' }); await reload(); }, 'Cycle deleted'); }}>{t("Delete this cycle")}</button> {err && <span className="error">{err}</span>}</p>}
        {t('Rules: {contribution} {frequency}; interest {interest}% per period ({basis}); loan limit {limit}× savings; late fine {fine}; share-out by {shareout}.', { contribution: kwacha(r.contribution_amount), frequency: t(r.frequency), interest: r.interest_bps / 100, basis: t(r.interest_basis), limit: r.loan_limit_multiple, fine: kwacha(r.fine_late), shareout: t(r.shareout_basis) })}
      </div>
    </>
  );
}
