import { useState } from 'react';
import { api, setToken } from '../api.js';
import { useT, LanguageSelect } from '../i18n.jsx';
import { ThemeToggle } from '../theme.jsx';
import MemberLogin from './MemberLogin.jsx';

export default function Auth({ onDone }) {
  const t = useT();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ groupName: '', location: '', type: 'accumulating', name: '', phone: '', password: '', code: '' });
  const [needs2fa, setNeeds2fa] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [who, setWho] = useState('officer');
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const r = await api(mode === 'login' ? '/auth/login' : '/auth/register-group', { method: 'POST', body: f });
      setToken(r.token);
      onDone();
    } catch (err) {
      if (err.data?.needs2fa) setNeeds2fa(true); else setError(err.message);
    }
  };

  return (
    <div className="authwrap">
      <section className="hero">
        <div className="logo big" aria-hidden="true"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="6.5" rx="6.5" ry="2.5" /><path d="M5.5 6.5V10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V6.5" /><path d="M5.5 10v3.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V10" /><path d="M5.5 13.5V17c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-3.5" /></svg></div>
        <h1>{t("Every contribution recorded. Every member informed.")}</h1>
        <p>{t("GroupSave replaces the exercise book with a shared, tamper-evident ledger for your chilimba group, with balances members can check from any phone.")}</p>
        <ul>
          <li>{t("Loans, interest and share-outs calculated automatically")}</li>
          <li>{t("SMS receipt with a verification code for every entry")}</li>
          <li>{t("Full audit trail of who recorded what, and when")}</li>
        </ul>
      </section>
      <section className="authbox">
        <div className="authlang"><LanguageSelect className="langsel dark" /><ThemeToggle className="themebtn dark" /></div>
        {who === 'member' ? <MemberLogin onDone={onDone} onBack={() => setWho('officer')} /> : <form onSubmit={submit}>
          <h2>{mode === 'login' ? t('Officer sign in') : t('Register your group')}</h2>
          {mode === 'register' && (
            <>
              <label>{t("Group name")}<input value={f.groupName} onChange={set('groupName')} required /></label>
              <label>{t("Location")}<input value={f.location} onChange={set('location')} /></label>
              <label>{t("Group type")}
                <select value={f.type} onChange={set('type')}>
                  <option value="accumulating">{t("Accumulating (lend and share out)")}</option>
                  <option value="rotating">{t("Rotating (pot in turn)")}</option>
                </select>
              </label>
              <label>{t("Your name")}<input value={f.name} onChange={set('name')} required /></label>
            </>
          )}
          <label>{t("Phone number")}<input value={f.phone} onChange={set('phone')} placeholder="0971234567" autoComplete="username" required /></label>
          <label>{t("Password")}<span className="pw"><input type={showPw ? 'text' : 'password'} value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'register' ? 8 : undefined} required /><button type="button" className="link" onClick={() => setShowPw(!showPw)} aria-pressed={showPw}>{t(showPw ? 'Hide' : 'Show')}</button></span></label>
          {mode === 'register' && <span className="muted" style={{ fontSize: '.8rem' }}>{t("At least 8 characters with letters and numbers.")}</span>}
          {needs2fa && <label>{t("Authenticator code")}<input value={f.code} onChange={set('code')} inputMode="numeric" maxLength={6} autoFocus placeholder="123456" required /></label>}
          {error && <div className="error">{error}</div>}
          <button>{mode === 'login' ? t('Sign in') : t('Create group')}</button>
          <button type="button" className="link" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setNeeds2fa(false); }}>
            {mode === 'login' ? t('Register a new group') : t('I already have an account')}
          </button>
          <button type="button" className="link" onClick={() => setWho('member')}>{t('Member sign in')} →</button>
        </form>}
      </section>
    </div>
  );
}
