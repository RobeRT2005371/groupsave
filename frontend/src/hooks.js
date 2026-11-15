import { useCallback, useEffect, useState } from 'react';
import { tr } from './i18n.jsx';

/** Load data from an async fn; returns { data, error, reload }. */
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => fn().then((d) => { setData(d); setError(''); }).catch((e) => setError(tr(e.message))), deps); // eslint-disable-line
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}

/** Run an action, tracking message/error state. */
export function useAction() {
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const run = async (fn, okMsg = 'Done') => {
    setMsg(''); setErr('');
    try {
      const r = await fn();
      setMsg(tr(typeof okMsg === 'function' ? okMsg(r) : okMsg));
      return r;
    } catch (e) { setErr(tr(e.message)); }
  };
  return { msg, err, run };
}
