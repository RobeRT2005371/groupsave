import { useState } from 'react';
import { api, kwacha, toNgwee } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { promptBox } from '../dialogs.jsx';

const LABEL = { contribution: 'Contribution', fine: 'Fine', loan_disbursement: 'Loan paid out', loan_repayment: 'Loan repayment', payout: 'Share-out' };

export default function Ledger({ me, cycle }) {
  const t = useT();
  const canPost = ['chairperson', 'treasurer'].includes(me.role);
  const { data: members } = useLoad(() => api('/members'));
  const { data: postings, error, reload } = useLoad(() => (cycle ? api(`/postings?cycleId=${cycle.id}`) : Promise.resolve([])), [cycle?.id]);
  const [f, setF] = useState({ memberId: '', type: 'contribution', amount: cycle ? String(cycle.rules.contribution_amount / 100) : '' });
  const [verify, setVerify] = useState(null);
  const { msg, err, run } = useAction();

  if (!cycle) return <><h1>{t("Ledger")}</h1><p>{t("No open cycle.")}</p></>;

  const post = (e) => {
    e.preventDefault();
    const amount = toNgwee(f.amount);
    if (!amount) return run(async () => { throw new Error('Enter a valid amount'); });
    run(async () => {
      const member = (members || []).find((m) => Number(m.id) === Number(f.memberId));
      const result = await api('/postings', {
        method: 'POST',
        body: { cycleId: cycle.id, memberId: Number(f.memberId), type: f.type, amount },
        offlineLabel: `${t('Contribution for')} ${member?.full_name || f.memberId}`,
      });
      await reload();
      return result;
    }, (result) => result?.queued ? 'Contribution saved on this device; waiting to sync.' : 'Posted. Member notified by SMS.');
  };
  const reverse = async (p) => {
    const reason = await promptBox(t('Reason for reversing this entry?'));
    if (reason !== null) run(async () => { await api(`/postings/${p.id}/reverse`, { method: 'POST', body: { reason } }); await reload(); }, 'Reversal posted');
  };

  return (
    <>
      <h1>{t("Ledger")}</h1>
      <p className="sub">{t("Entries are permanent and cannot be deleted. To fix a mistake, use Reverse, which adds a correcting entry and keeps the history.")}</p>
      {canPost && (
        <form className="card row" onSubmit={post}>
          <label>{t("Member")}
            <select value={f.memberId} onChange={(e) => setF({ ...f, memberId: e.target.value })} required>
              <option value="">{t("Choose…")}</option>
              {(members || []).filter((m) => m.status === 'active').map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </label>
          <label>{t("Type")}
            <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="contribution">{t("Contribution")}</option><option value="fine">{t("Fine")}</option></select>
          </label>
          <label>{t("Amount (K)")}<input value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} size="8" required /></label>
          <button>{t("Post entry")}</button>
        </form>
      )}
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="secondary" onClick={() => run(async () => setVerify(await api(`/cycles/${cycle.id}/verify`)), 'Checked')}>{t("Verify ledger chain")}</button>
        {verify && (verify.ok
          ? <span className="tag good">{t('Chain intact · {count} entries · head code {head}', { count: verify.count, head: verify.head })}</span>
          : <span className="tag bad">{t('Chain broken at entry {id}', { id: verify.brokenAt })}</span>)}
      </div>
      {msg && <div className="ok">{msg}</div>}{(err || error) && <div className="error">{err || error}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Ref</th><th>{t("When")}</th><th>{t("Member")}</th><th>{t("Type")}</th><th className="num">{t("Amount")}</th><th className="num">{t("Savings after")}</th><th>{t("By")}</th><th>Code</th><th></th></tr></thead>
          <tbody>{(postings || []).map((p) => (
            <tr key={p.id} style={p.reversed ? { opacity: 0.55 } : undefined}>
              <td>{p.id}</td>
              <td>{new Date(p.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td>{p.member_name}</td>
              <td>{t(LABEL[p.type])} {p.reverses_id && <span className="tag bad">{t("Reversal")} #{p.reverses_id}</span>} {p.reversed && <span className="tag">{t("reversed")}</span>}</td>
              <td className={'num ' + (p.amount < 0 ? 'neg' : '')}>{kwacha(p.amount)}</td>
              <td className="num">{kwacha(p.running_balance)}</td>
              <td>{p.recorded_by_name}</td>
              <td className="muted">{p.hash.slice(0, 4).toUpperCase()}</td>
              <td>{canPost && !p.reversed && !p.reverses_id && ['contribution', 'fine', 'loan_disbursement', 'loan_repayment'].includes(p.type) && <button className="link" onClick={() => reverse(p)}>{t("Reverse")}</button>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
