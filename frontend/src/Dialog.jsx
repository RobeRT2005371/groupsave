import { useEffect } from 'react';
import { useT } from './i18n.jsx';

/** Simple modal dialog that matches the app theme. Closes on Escape or a tap on the backdrop. */
export default function Dialog({ title, onClose, children }) {
  const t = useT();
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div className="dlg-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dlg-head"><h2>{title}</h2><button type="button" className="link" onClick={onClose} aria-label={t('Close')}>✕</button></div>
        {children}
      </div>
    </div>
  );
}
