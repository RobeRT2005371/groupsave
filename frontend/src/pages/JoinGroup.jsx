import { useState } from 'react';
import { api } from '../api.js';
import { useT } from '../i18n.jsx';

// Sign up: 1) your details  2) find your group  3) pick it and send the request to its officers.
export default function JoinGroup({ onBack }) {
  const t = useT();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [picked, setPicked] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);

  const search = async (e) => {
    e.preventDefault();
    setError(''); setResults(null); setPicked(null); setBusy(true);
    try { setResults(await api(`/group-join/groups?q=${encodeURIComponent(query.trim())}`)); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const send = async () => {
    setError(''); setBusy(true);
    try {
      await api('/group-join/requests', { method: 'POST', body: { fullName, phone, groupId: picked.id } });
      setDone(picked);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="ms-done">
        <div className="ms-check" aria-hidden="true">✓</div>
        <h2>{t('Request sent')}</h2>
        <p className="muted">{t('Your request was sent to {group}. An officer can contact you at {phone}.', { group: done.name, phone })}</p>
        <ol className="ms-steps">
          <li>{t('An officer approves your request.')}</li>
          <li>{t('Come back here and tap Sign in, then Set my PIN.')}</li>
        </ol>
        <button className="ms-primary" onClick={onBack}>{t('Back to sign in')}</button>
      </div>
    );
  }

  const ready = fullName.trim() && phone.trim();
  return (
    <form onSubmit={search}>
      <div><h2>{t('Join a group')}</h2><p className="muted">{t('Tell us who you are, find your group, and send a request to its officers.')}</p></div>

      <div className="ms-step"><span>1</span>{t('Your details')}</div>
      <label>{t('Full name')}<input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} autoComplete="name" required /></label>
      <label>{t('Phone number')}<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0971234567" inputMode="tel" autoComplete="tel" required /></label>

      <div className="ms-step"><span>2</span>{t('Find your group')}</div>
      <label>{t('Group name or location')}<input value={query} onChange={(e) => setQuery(e.target.value)} minLength={2} maxLength={60} required /></label>
      <button className="secondary" disabled={busy || !ready}>{t(busy && !results ? 'Searching…' : 'Search groups')}</button>

      {results && (
        <>
          <div className="ms-step"><span>3</span>{t('Pick your group')}</div>
          <div className="ms-results" role="radiogroup">
            {results.map((g) => (
              <button type="button" key={g.id} role="radio" aria-checked={picked?.id === g.id} className={'ms-group' + (picked?.id === g.id ? ' on' : '')} onClick={() => setPicked(g)}>
                <b>{g.name}</b>{g.location && <span className="muted">{g.location}</span>}
              </button>
            ))}
            {!results.length && <p className="muted">{t('No groups found. Check the spelling and try again.')}</p>}
          </div>
        </>
      )}

      {error && <div className="error" role="alert">{error}</div>}
      {picked && <button type="button" className="ms-primary" disabled={busy || !ready} onClick={send}>{t(busy ? 'Sending…' : 'Send request to {group}', { group: picked.name })}</button>}
      <button type="button" className="link" onClick={onBack}>{t('Already a member? Sign in')}</button>
    </form>
  );
}
