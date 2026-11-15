import { useState } from 'react';
import { api, download, kwacha } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';

const LABEL = { contribution: 'Contribution', fine: 'Fine', loan_disbursement: 'Loan paid out', loan_repayment: 'Loan repayment', payout: 'Share-out' };

export default function Statement({ me }) {
  const t = useT();
  const allowed = ['chairperson', 'treasurer', 'secretary'].includes(me.role);
  const { data: members } = useLoad(() => (allowed ? api('/members') : Promise.resolve([])));
  const [id, setId] = useState('');
  const { data: st, error } = useLoad(() => (id ? api(`/reports/member/${id}`) : Promise.resolve(null)), [id]);
  const { err, run } = useAction();
  if (!allowed) return <p>{t("Only officers can view statements.")}</p>;

  return (
    <>
      <h1>{t("Statements and exports")}</h1>
      <p className="sub">{t("Print a member statement for a meeting, or export the whole ledger to a spreadsheet.")}</p>
      <div className="card row noprint">
        <label>{t("Member")}
          <select value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">{t("Choose…")}</option>
            {(members || []).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        </label>
        <button className="secondary" disabled={!st} onClick={() => window.print()}>{t("Print statement")}</button>
        <button className="secondary" onClick={() => run(() => download('/reports/ledger.csv', 'ledger.csv'), 'Downloaded')}>{t("Export ledger (CSV)")}</button>
        {me.role === 'chairperson' && <button className="secondary" onClick={() => run(() => download('/reports/backup.json', 'groupsave-backup.json'), 'Downloaded')}>{t('Download full backup (JSON)')}</button>}
      </div>
      {(err || error) && <div className="error">{err || error}</div>}
      {st && (
        <div className="card">
          <h2>{t('Statement for {name}', { name: st.member.full_name })}</h2>
          <p className="muted">{t('Generated {date} · Savings {savings} · Fines {fines}', { date: new Date(st.generated).toLocaleString('en-GB'), savings: kwacha(st.savings), fines: kwacha(st.fines) })}</p>
          {st.loans.length > 0 && <p>{t('Loans: {list}', { list: st.loans.map((l) => `#${l.id} ${kwacha(l.principal)} (${t(l.status)}, ${kwacha(l.outstanding)})`).join('; ') })}</p>}
          <table>
            <thead><tr><th>Ref</th><th>{t("Date")}</th><th>{t("Type")}</th><th className="num">{t("Amount")}</th><th className="num">{t("Savings after")}</th><th>Code</th></tr></thead>
            <tbody>{st.postings.map((p) => (
              <tr key={p.id}><td>{p.id}</td><td>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                <td>{t(LABEL[p.type])}{p.reverses_id ? ` (reverses #${p.reverses_id})` : ''}</td>
                <td className={'num ' + (p.amount < 0 ? 'neg' : '')}>{kwacha(p.amount)}</td><td className="num">{kwacha(p.running_balance)}</td><td className="muted">{p.code.toUpperCase()}</td></tr>
            ))}</tbody>
          </table>
          <p className="muted" style={{ fontSize: '.8rem' }}>{t("Codes match the verification code in the SMS the member received for each entry.")}</p>
        </div>
      )}
    </>
  );
}
