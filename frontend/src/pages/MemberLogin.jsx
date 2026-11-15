import { useState } from 'react';
import { api, setToken } from '../api.js';
import { useLang, useT } from '../i18n.jsx';
import JoinGroup from './JoinGroup.jsx';
import Privacy from './Privacy.jsx';

/** PIN or longer password (any characters) for sign-in. */
function SecretInput({ value, onChange, label }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <label>{label}
      <span className="ms-pin">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} maxLength={72} autoComplete="current-password" required />
        <button type="button" className="link" onClick={() => setShow(!show)} aria-pressed={show}>{t(show ? 'Hide' : 'Show')}</button>
      </span>
    </label>
  );
}

/** Shared by the member sign-in and sign-up screens. */
export function PinInput({ value, onChange, label, autoComplete, autoFocus }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <label>{label}
      <span className="ms-pin">
        <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="••••" autoComplete={autoComplete} autoFocus={autoFocus} required />
        <button type="button" className="link" onClick={() => setShow(!show)} aria-pressed={show}>{t(show ? 'Hide' : 'Show')}</button>
      </span>
    </label>
  );
}

// tab: 'signin' | 'signup'. Within sign in, step: 'pin' (normal) | 'setpin' (first time: an officer sets the PIN).
export default function MemberLogin({ onDone, onBack }) {
  const t = useT();
  const { setLang } = useLang();
  const [tab, setTab] = useState('signin');
  const [privacy, setPrivacy] = useState(false);
  const [step, setStep] = useState('pin');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const clear = () => { setPin(''); setPassword(''); setError(''); };
  const finish = (r) => { setToken(r.token); if (r.language) setLang(r.language); onDone(); };
  const run = async (fn) => {
    setError(''); setBusy(true);
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const post = (path, body) => api(`/portal-auth/${path}`, { method: 'POST', body });

  const signIn = (e) => { e.preventDefault(); run(async () => finish(await post('login', { phone, secret: pin }))); };
  const savePin = (e) => { e.preventDefault(); run(async () => finish(await post('set-credentials', { phone, pin, password }))); };

  const phoneField = (disabled) => (
    <label>{t('Phone number')}
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0971234567" inputMode="tel" autoComplete="tel" disabled={disabled} required />
    </label>
  );

  return (
    <div className="ms">
      {privacy ? <Privacy onBack={() => setPrivacy(false)} /> : <>
      <div className="ms-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'signin'} className={tab === 'signin' ? 'on' : ''} onClick={() => { setTab('signin'); setStep('pin'); clear(); }}>{t('Sign in')}</button>
        <button type="button" role="tab" aria-selected={tab === 'signup'} className={tab === 'signup' ? 'on' : ''} onClick={() => { setTab('signup'); clear(); }}>{t('Sign up')}</button>
      </div>

      {tab === 'signup' && <JoinGroup onBack={() => { setTab('signin'); setStep('pin'); clear(); }} />}

      {tab === 'signin' && step === 'pin' && (
        <form onSubmit={signIn}>
          <div><h2>{t('Welcome back')}</h2><p className="muted">{t('Sign in with your phone number and 4-digit PIN.')}</p></div>
          {phoneField(false)}
          <SecretInput label={t('PIN or password')} value={pin} onChange={setPin} />
          {error && <div className="error" role="alert">{error}</div>}
          <button className="ms-primary" disabled={busy}>{t(busy ? 'Signing in…' : 'Sign in')}</button>
          <div className="ms-help">
            <span className="muted">{t('First time here?')}</span>
            <button type="button" className="link" onClick={() => { setStep('setpin'); clear(); }}>{t('Set my PIN')}</button>
          </div>
          <div className="ms-help">
            <span className="muted">{t('Forgot your PIN?')}</span>
            <span className="muted">{t('Ask an officer to reset it.')}</span>
          </div>
        </form>
      )}

      {tab === 'signin' && step === 'setpin' && (
        <form onSubmit={savePin}>
          <div><h2>{t('Set my PIN')}</h2>
            <p className="muted">{t('Ask an officer to allow PIN setup for your number. Then choose your own PIN here (and a longer password if you like).')}</p></div>
          {phoneField(false)}
          <PinInput label={t('Choose a 4-digit PIN')} value={pin} onChange={setPin} autoComplete="new-password" />
          <label>{t('Password (optional, 8+ characters)')}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" />
          </label>
          {error && <div className="error" role="alert">{error}</div>}
          <button className="ms-primary" disabled={busy}>{t('Save and sign in')}</button>
          <button type="button" className="link" onClick={() => { setStep('pin'); clear(); }}>← {t('Back to sign in')}</button>
        </form>
      )}

      <div className="ms-foot"><button type="button" className="link" onClick={onBack}>{t('I am an officer')} →</button> <button type="button" className="link" onClick={() => setPrivacy(true)}>{t('Privacy and terms')}</button></div>
      </>}
    </div>
  );
}
