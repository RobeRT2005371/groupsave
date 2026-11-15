import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api, getToken, getSessionIdentity, setToken, isApplicant, isPortal } from './api.js';
import { listOfflineWrites, removeOfflineWrite, updateOfflineWrite } from './offlineQueue.js';
import Portal from './pages/Portal.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Members from './pages/Members.jsx';
import Ledger from './pages/Ledger.jsx';
import Loans from './pages/Loans.jsx';
import Shareout from './pages/Shareout.jsx';
import Disputes from './pages/Disputes.jsx';
import Receipts from './pages/Receipts.jsx';
import Audit from './pages/Audit.jsx';
import Statement from './pages/Statement.jsx';
import Settings from './pages/Settings.jsx';
import Meetings from './pages/Meetings.jsx';
import Outbox from './pages/Outbox.jsx';
import Notifications from './pages/Notifications.jsx';
import Announcements from './pages/Announcements.jsx';
import Pot from './pages/Pot.jsx';
import Chat from './pages/Chat.jsx';
import Privacy from './pages/Privacy.jsx';
import Votes from './pages/Votes.jsx';
import { JoinBanner } from './joinLink.jsx';
import { useT, LanguageSelect } from './i18n.jsx';
import { ThemeToggle } from './theme.jsx';
import { confirmBox } from './dialogs.jsx';

const PRIMARY = [['/', 'Home', '▦'], ['/pot', 'Pot', '◉'], ['/ledger', 'Ledger', '☰'], ['/meetings', 'Meetings', '◷'], ['/loans', 'Loans', '₭'], ['/members', 'Members', '☻']];
const MOBILE_MORE = [['/ledger', 'Ledger', '☰'], ['/loans', 'Loans', '₭']];
const MORE = [['/chat', 'Messages', '✉'], ['/votes', 'Votes', '☑'], ['/announcements', 'Announcements', '✎'], ['/receipts', 'Payments', '✉'], ['/disputes', 'Disputes', '⚑'], ['/shareout', 'Share-out', '◔'], ['/statements', 'Statements', '▤'], ['/outbox', 'SMS log', '✆'], ['/audit', 'Audit log', '✓']];
const IDLE_MS = 15 * 60 * 1000;

function OfflineQueueStatus({ identity }) {
  const t = useT();
  const [online, setOnline] = useState(navigator.onLine);
  const [entries, setEntries] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [syncError, setSyncError] = useState('');
  const active = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setEntries(await listOfflineWrites(identity));
      setStorageError('');
    } catch (error) {
      setStorageError(error.message);
    }
  }, [identity]);

  const sync = useCallback(async () => {
    if (!identity || !navigator.onLine || active.current) return;
    active.current = true;
    setSyncing(true);
    setSyncError('');
    try {
      const pending = await listOfflineWrites(identity);
      for (const entry of pending) {
        if (entry.status !== 'pending') continue;
        try {
          await api(entry.path, {
            method: 'POST',
            body: entry.body,
            idempotencyKey: entry.key,
            queueOffline: false,
          });
          await removeOfflineWrite(entry.id);
        } catch (error) {
          if (error.status >= 400 && error.status < 500 && error.status !== 401) {
            await updateOfflineWrite({ ...entry, status: 'conflict', error: error.message });
            continue;
          }
          setSyncError(error.message);
          break;
        }
      }
    } catch (error) {
      setSyncError(error.message);
    } finally {
      active.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [identity, refresh]);

  useEffect(() => {
    const onOnline = () => { setOnline(true); sync(); };
    const onOffline = () => setOnline(false);
    const onQueueChange = () => refresh();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('groupsave:offline-queue-change', onQueueChange);
    refresh();
    if (navigator.onLine) sync();
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('groupsave:offline-queue-change', onQueueChange);
    };
  }, [refresh, sync]);

  const retry = async (entry) => {
    await updateOfflineWrite({ ...entry, status: 'pending', error: '' });
    await sync();
  };
  const discard = async (entry) => {
    if (!await confirmBox(t('Remove this unsent record from this device?'))) return;
    await removeOfflineWrite(entry.id);
  };

  if (!identity) return null;
  return (
    <>
      {!online && (
        <div className="banner">
          <span><b>{t('Offline mode.')}</b> {t('Cached member and cycle information may be out of date. Attendance and contributions will stay on this device until connection returns.')}</span>
        </div>
      )}
      {storageError && <div className="error">{t('Offline storage error')}: {storageError}</div>}
      {!!entries.length && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>{t('Offline records')} ({entries.length})</h2>
            {online && <button className="secondary" disabled={syncing} onClick={sync}>{t(syncing ? 'Syncing…' : 'Sync now')}</button>}
          </div>
          <p className="muted">{t('Unsent records are retained on this device. Review conflicts before retrying or removing them.')}</p>
          {syncError && <div className="error">{syncError}</div>}
          {entries.map((entry) => (
            <div key={entry.id} className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', padding: '9px 0' }}>
              <span>{entry.label} · {new Date(entry.createdAt).toLocaleString()}</span>
              <span>
                <span className={'tag ' + (entry.status === 'conflict' ? 'bad' : 'open')}>{t(entry.status === 'conflict' ? 'Needs review' : 'Waiting to sync')}</span>
                {entry.status === 'conflict' && <> <button className="link" onClick={() => retry(entry)}>{t('Retry')}</button></>}
                {' '}<button className="link neg" onClick={() => discard(entry)}>{t('Remove')}</button>
              </span>
              {entry.error && <div className="error" style={{ width: '100%' }}>{entry.error}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Logo() {
  const t = useT();
  return (
    <div className="logo" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="6.5" rx="6.5" ry="2.5" /><path d="M5.5 6.5V10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V6.5" /><path d="M5.5 10v3.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V10" /><path d="M5.5 13.5V17c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-3.5" /></svg>
    </div>
  );
}

export default function App() {
  const t = useT();
  const [authed, setAuthed] = useState(() => !!getToken() && !isApplicant());
  const identity = useMemo(() => authed && !isPortal() ? getSessionIdentity() : null, [authed]);
  const [me, setMe] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [alertCount, setAlertCount] = useState(0);
  const [cycle, setCycle] = useState(undefined); // undefined = loading, null = none open

  const load = useCallback(async () => {
    try {
      const [m, cycles] = await Promise.all([api('/auth/me'), api('/cycles')]);
      setMe(m);
      setCycle(cycles.find((c) => c.status === 'open') || null);
      setLoadError('');
    } catch (error) {
      setLoadError(error.message);
      throw error;
    }
  }, []);
  const [chatUnread, setChatUnread] = useState(0);
  const refreshAlerts = useCallback(() => {
    api('/alerts').then((r) => setAlertCount(r.count)).catch(() => {});
    api('/chat/unread').then((r) => setChatUnread(r.unread)).catch(() => {});
  }, []);
  const logout = useCallback(async () => {
    if (!isPortal()) {
      let queued;
      try {
        queued = await listOfflineWrites(getSessionIdentity());
      } catch (error) {
        alert(`${t('Could not check offline records')}: ${error.message}`);
        return;
      }
      if (queued.length && !await confirmBox(t('You have {count} unsent offline record(s). They will remain on this device and sync when you sign back in as this officer. Log out?', { count: queued.length }))) return;
    }
    setToken(null); setAuthed(false); setMe(null);
  }, [t]);

  useEffect(() => { if (isApplicant()) setToken(null); }, []);
  useEffect(() => { if (authed && !isPortal()) load().catch(() => {}); }, [authed, load]);

  // Sign out after 15 minutes without activity.
  useEffect(() => {
    if (!authed) return;
    let t;
    const reset = () => { clearTimeout(t); t = setTimeout(logout, IDLE_MS); };
    const ev = ['click', 'keydown', 'mousemove', 'touchstart'];
    ev.forEach((e) => window.addEventListener(e, reset)); reset();
    return () => { clearTimeout(t); ev.forEach((e) => window.removeEventListener(e, reset)); };
  }, [authed, logout]);

  const loc = useLocation();
  useEffect(() => {
    if (!authed || isPortal()) return undefined;
    refreshAlerts();
    const id = setInterval(refreshAlerts, 60000);
    return () => clearInterval(id);
  }, [authed, refreshAlerts, loc.pathname]);
  useEffect(() => { document.querySelectorAll('details.pop[open]').forEach((d) => d.removeAttribute('open')); }, [loc.pathname]);
  useEffect(() => {
    const close = (e) => document.querySelectorAll('details.pop[open]').forEach((d) => { if (!d.contains(e.target) || e.target === d) d.removeAttribute('open'); });
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (!authed) return <Auth onDone={() => setAuthed(true)} />;
  if (isPortal()) return <Portal onLogout={logout} />;
  if (loadError) return <div className="center"><div className="error">{loadError}</div><button onClick={() => load().catch(() => {})}>{t('Try again')}</button></div>;
  if (!me || cycle === undefined) return <p className="center">{t("Loading…")}</p>;

  const ctx = { me, cycle, reload: load, refreshAlerts };
  return (
    <div className="shell">
      <header className="top">
        <div className="brand"><Logo /><div>GroupSave<small>{t("VILLAGE BANKING")}</small></div></div>
        <nav className="pills">
          {PRIMARY.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'} className={MOBILE_MORE.some((m) => m[0] === to) ? 'hide-m' : undefined}><span className="ic" aria-hidden="true">{icon}</span>{t(label)}</NavLink>)}
          <details className="pop">
            <summary><span className="ic" aria-hidden="true">⋯</span>{t("More")}{chatUnread > 0 && <span className="badge" style={{ position: 'static', marginLeft: 6 }}>{chatUnread > 9 ? '9+' : chatUnread}</span>}</summary>
            <div className="menu">{MOBILE_MORE.map(([to, label, icon]) => <NavLink key={to} to={to} className="only-m"><span aria-hidden="true">{icon}</span>{t(label)}</NavLink>)}{MORE.map(([to, label, icon]) => <NavLink key={to} to={to}><span aria-hidden="true">{icon}</span>{t(label)}{to === '/chat' && chatUnread > 0 && <span className="badge" style={{ position: 'static', marginLeft: 6 }}>{chatUnread}</span>}</NavLink>)}</div>
          </details>
        </nav>
        <span className="grp">{me.group_name}</span>
        <span className="hide-m"><LanguageSelect /></span>
        <NavLink to="/notifications" className="bell" aria-label={t('Notifications')} title={t('Notifications')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
          {alertCount > 0 && <span className="badge">{alertCount > 9 ? '9+' : alertCount}</span>}
        </NavLink>
        <span className="hide-m"><ThemeToggle /></span>
        <details className="pop user">
          <summary><span className="nm">{me.full_name}</span><span className="avatar">{me.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span></summary>
          <div className="menu">
            <div className="who"><b>{me.full_name}</b><span>{me.role}</span></div>
            <div className="only-m prefs"><LanguageSelect className="langsel dark" /><ThemeToggle className="themebtn dark" /></div>
            <NavLink to="/privacy"><span aria-hidden="true">ⓘ</span>{t('Privacy and terms')}</NavLink>
            <NavLink to="/settings"><span aria-hidden="true">⚙</span>{t("Security")}</NavLink>
            <button className="item" onClick={logout}><span aria-hidden="true">⎋</span>{t("Log out")}</button>
          </div>
        </details>
      </header>
      <main className="content">
        <JoinBanner />
        <OfflineQueueStatus identity={identity} />
        <Routes>
          <Route path="/" element={<Dashboard {...ctx} />} />
          <Route path="/pot" element={<Pot {...ctx} />} />
          <Route path="/chat" element={<Chat {...ctx} />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/votes" element={<Votes {...ctx} />} />
          <Route path="/ledger" element={<Ledger {...ctx} />} />
          <Route path="/members" element={<Members {...ctx} />} />
          <Route path="/meetings" element={<Meetings {...ctx} />} />
          <Route path="/announcements" element={<Announcements {...ctx} />} />
          <Route path="/notifications" element={<Notifications {...ctx} />} />
          <Route path="/outbox" element={<Outbox {...ctx} />} />
          <Route path="/loans" element={<Loans {...ctx} />} />
          <Route path="/receipts" element={<Receipts {...ctx} />} />
          <Route path="/disputes" element={<Disputes {...ctx} />} />
          <Route path="/shareout" element={<Shareout {...ctx} />} />
          <Route path="/statements" element={<Statement {...ctx} />} />
          <Route path="/audit" element={<Audit {...ctx} />} />
          <Route path="/settings" element={<Settings {...ctx} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
