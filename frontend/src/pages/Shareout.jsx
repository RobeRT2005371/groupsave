import { api, kwacha } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';
import { confirmBox } from '../dialogs.jsx';

export default function Shareout({ me, cycle, reload: reloadApp }) {
  const t = useT();
  const isRotating = cycle?.group_type === 'rotating';
  const { data, error, reload } = useLoad(
    () => (cycle && !isRotating ? api(`/cycles/${cycle.id}/shareout`) : Promise.resolve(null)),
    [cycle?.id, isRotating],
  );
  const { data: rotation, error: rotationError } = useLoad(
    () => (cycle && isRotating ? api(`/cycles/${cycle.id}/rotation-order`) : Promise.resolve(null)),
    [cycle?.id, isRotating],
  );
  const { msg, err, run } = useAction();
  if (!cycle) return <><h1>{t("Share-out")}</h1><p>{t("No open cycle.")}</p></>;

  const close = async () => {
    const confirmText = isRotating
      ? t('Close the cycle after all rotation turns are complete? This cannot be undone.')
      : t('Close the cycle and post these payouts to the ledger? This cannot be undone.');
    if (!await confirmBox(confirmText)) return;
    run(async () => { await api(`/cycles/${cycle.id}/close`, { method: 'POST' }); await reloadApp(); },
      isRotating ? 'Rotation cycle closed' : 'Cycle closed and payouts posted');
  };

  if (isRotating) {
    return (
      <>
        <h1>{t('Rotation progress')}</h1>
        <p className="muted">{t('Rotating groups pay the meeting pot to members in the fixed order. They do not use an accumulating cycle-end share-out.')}</p>
        {(err || rotationError) && <div className="error">{err || rotationError}</div>}{msg && <div className="ok">{msg}</div>}
        {rotation && (
          <div className="card">
            {!rotation.configured && <p className="muted">{t('Set the rotation order on the Meetings page before paying out.')}</p>}
            {!!rotation.missingMembers.length && <p className="error">{t('The active membership has changed. Update the rotation order before continuing.')}</p>}
            <table>
              <thead><tr><th>{t('Turn')}</th><th>{t('Member')}</th><th>{t('Status')}</th><th className="num">{t('Payout')}</th></tr></thead>
              <tbody>{rotation.turns.map((turn) => (
                <tr key={turn.member_id}>
                  <td>{turn.turn_order}</td><td>{turn.full_name}</td>
                  <td><span className={'tag ' + (turn.received ? 'good' : turn.status === 'active' ? 'open' : '')}>
                    {turn.received ? t('Turn paid') : turn.status === 'active' ? t('Waiting') : t('Inactive')}
                  </span></td>
                  <td className="num">{turn.received ? kwacha(turn.payout_amount) : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
            {me.role === 'chairperson' && (
              <p>
                <button className="danger" disabled={!rotation.configured || !rotation.allReceived} onClick={close}>
                  {t('Close cycle')}
                </button>
                {!rotation.allReceived && <span className="muted"> {t('All active members must receive a turn before the cycle can close.')}</span>}
              </p>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <h1>{t("Share-out statement")}</h1>
      <p className="muted">{t('Preview for the group to approve. Payouts are split in proportion to {basis} and always add up exactly to the pool.', { basis: t(cycle.rules.shareout_basis) })}</p>
      {(err || error) && <div className="error">{err || error}</div>}{msg && <div className="ok">{msg}</div>}
      {data && (
        <div className="card">
          <table>
            <thead><tr><th>{t("Member")}</th><th className="num">{t("Savings")}</th><th className="num">{t("Payout")}</th></tr></thead>
            <tbody>{data.rows.map((r) => <tr key={r.memberId}><td>{r.name}</td><td className="num">{kwacha(r.savings)}</td><td className="num">{kwacha(r.payout)}</td></tr>)}</tbody>
            <tfoot><tr><th>{t("Pool")}</th><th></th><th className="num">{kwacha(data.pool)}</th></tr></tfoot>
          </table>
          {me.role === 'chairperson' && <p><button className="danger" onClick={close}>{t("Approve and close cycle")}</button> <button className="secondary" onClick={reload}>{t("Recalculate")}</button></p>}
        </div>
      )}
    </>
  );
}
