import { useT } from '../i18n.jsx';

/** Plain-language privacy notice and terms. Shown without signing in. */
export default function Privacy({ onBack }) {
  const t = useT();
  return (
    <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
      {onBack && <button type="button" className="link" onClick={onBack}>← {t('Back')}</button>}
      <h1>{t('Privacy and terms')}</h1>
      <h2>{t('What we keep')}</h2>
      <p>{t('Your name, phone number, language, and every contribution, fine, loan and message in your savings group. Phone numbers are stored encrypted. PINs and passwords are stored only as one-way hashes, so nobody, including officers, can read them.')}</p>
      <h2>{t('Who can see it')}</h2>
      <p>{t('You see your own records. The officers of your group (chairperson, treasurer, secretary) see the group records. An auditor can view records but cannot change them. Nobody outside your group can see your data.')}</p>
      <h2>{t('Why we keep it')}</h2>
      <p>{t('To run your group’s savings and loans, send you receipts and reminders by SMS, and let officers answer your questions. We do not sell or share your data for advertising.')}</p>
      <h2>{t('Your rights')}</h2>
      <p>{t('You can download everything held about you from your account (Download my data), ask an officer to correct an entry (Query), and ask the chairperson to remove your account. Ledger entries are never edited; corrections are added as reversing entries so the history stays honest.')}</p>
      <h2>{t('Keeping your account safe')}</h2>
      <p>{t('Never share your PIN or password, not even with an officer. Officers will never ask for it. Accounts lock after 3 wrong PIN attempts.')}</p>
      <h2>{t('Terms of use')}</h2>
      <p>{t('Use this app only for your own savings group. Payments you report online are recorded only after an officer confirms the money was received. The officers of your group, not the app, are responsible for the money held by the group.')}</p>
    </div>
  );
}
