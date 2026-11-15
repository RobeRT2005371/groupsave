import { openMeeting, isPortal } from './api.js';
import { useAction } from './hooks.js';
import { useT } from './i18n.jsx';

const KEY = 'gs_join';

// Runs as soon as the app loads: remember which meeting the link was for, before the person signs in.
try {
  const id = new URLSearchParams(window.location.search).get('join');
  if (id && /^\d{1,9}$/.test(id)) {
    sessionStorage.setItem(KEY, id);
    window.history.replaceState(null, '', window.location.pathname);
  }
} catch { /* storage unavailable */ }

// Links like /?go=pay (from SMS reminders) remember where the person wanted to go, until they have signed in.
try {
  const go = new URLSearchParams(window.location.search).get('go');
  if (go && /^[a-z]{2,12}$/.test(go)) { sessionStorage.setItem('gs_go', go); window.history.replaceState(null, '', window.location.pathname); }
} catch { /* storage unavailable */ }
export const takeGo = () => { try { const g = sessionStorage.getItem('gs_go'); sessionStorage.removeItem('gs_go'); return g; } catch { return null; } };

const getPending = () => { try { return sessionStorage.getItem(KEY); } catch { return null; } };
const clearPending = () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

/** The link people share for an online meeting. Opening it asks them to sign in, then offers to join. */
export const meetingInviteUrl = (id) => `${window.location.origin}/?join=${id}`;

/** Shown after sign-in when the person arrived through a meeting link. */
export function JoinBanner() {
  const t = useT();
  const { err, run } = useAction();
  const id = getPending();
  if (!id) return null;
  const path = (isPortal() ? '/portal/meetings/' : '/meetings/') + id + '/join';
  return (
    <div className="banner">
      <span><b>{t('You were invited to an online meeting.')}</b></span>
      <span>
        <button onClick={() => run(async () => { await openMeeting(path); clearPending(); window.location.reload(); }, 'Done')}>{t('Join online meeting')}</button>{' '}
        <button className="link" onClick={() => { clearPending(); window.location.reload(); }}>{t('Dismiss')}</button>
      </span>
      {err && <div className="error" style={{ width: '100%' }}>{err}</div>}
    </div>
  );
}
