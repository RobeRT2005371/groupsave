import { useEffect, useState } from 'react';
import Dialog from './Dialog.jsx';
import { useT } from './i18n.jsx';

// Drop-in, themed replacements for the browser's confirm() and prompt().
//   if (await confirmBox('Delete this?')) ...
//   const reason = await promptBox('Reason?');   // string, or null if cancelled
let show = null;
const open = (req) => new Promise((resolve) => {
  if (!show) { resolve(req.kind === 'confirm' ? window.confirm(req.message) : window.prompt(req.message)); return; }
  show({ ...req, resolve });
});
export const confirmBox = (message, opts = {}) => open({ kind: 'confirm', message, ...opts });
export const promptBox = (message, opts = {}) => open({ kind: 'prompt', message, ...opts });

/** Mount once, near the top of the app. */
export function DialogHost() {
  const t = useT();
  const [req, setReq] = useState(null);
  const [text, setText] = useState('');
  useEffect(() => { show = (r) => { setText(''); setReq(r); }; return () => { show = null; }; }, []);
  if (!req) return null;
  const done = (v) => { req.resolve(v); setReq(null); };
  const danger = req.danger ?? /delete|remove|permanently|log out/i.test(req.message);
  const isPrompt = req.kind === 'prompt';
  return (
    <Dialog title={req.title || t(isPrompt ? 'Please answer' : 'Please confirm')} onClose={() => done(isPrompt ? null : false)}>
      <form onSubmit={(e) => { e.preventDefault(); done(isPrompt ? text : true); }}>
        <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{req.message}</p>
        {isPrompt && <input value={text} onChange={(e) => setText(e.target.value)} autoFocus maxLength={500} aria-label={req.message} />}
        <div className="dlg-actions">
          <button type="button" className="secondary" onClick={() => done(isPrompt ? null : false)}>{t('Cancel')}</button>
          <button className={danger && !isPrompt ? 'danger' : ''} autoFocus={!isPrompt}>{t(req.confirmLabel || (isPrompt ? 'OK' : danger ? 'Yes, continue' : 'Confirm'))}</button>
        </div>
      </form>
    </Dialog>
  );
}
