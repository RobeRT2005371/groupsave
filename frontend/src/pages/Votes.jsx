import { useState } from 'react';
import { api } from '../api.js';
import { useLoad, useAction } from '../hooks.js';
import { useT } from '../i18n.jsx';

export default function Votes({ me }) {
  const t = useT();
  const { data, error, reload } = useLoad(() => api('/extras/polls'));
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const { msg, err, run } = useAction();
  const canWrite = ['chairperson', 'treasurer', 'secretary'].includes(me.role);
  const setOpt = (i, v) => setOptions(options.map((o, k) => (k === i ? v : o)));
  const create = (e) => {
    e.preventDefault();
    run(async () => { await api('/extras/polls', { method: 'POST', body: { question, options: options.filter((o) => o.trim()) } }); setQuestion(''); setOptions(['', '']); await reload(); }, 'Vote started. Members can vote in their account.');
  };
  return (
    <>
      <h1>{t('Votes')}</h1>
      <p className="sub">{t('Ask the group a question. Each member votes once; results show after they vote.')}</p>
      {(error || err) && <div className="error">{error || err}</div>}{msg && <div className="ok">{msg}</div>}
      {canWrite && (
        <form className="card" onSubmit={create}>
          <h2>{t('New vote')}</h2>
          <label>{t('Question')}<input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} placeholder={t('Should we meet on Saturday?')} required /></label>
          {options.map((o, i) => <label key={i} style={{ marginTop: 8 }}>{t('Option')} {i + 1}<input value={o} onChange={(e) => setOpt(i, e.target.value)} maxLength={80} required={i < 2} /></label>)}
          <p className="row">
            {options.length < 6 && <button type="button" className="secondary" onClick={() => setOptions([...options, ''])}>{t('Add option')}</button>}
            <button>{t('Start vote')}</button>
          </p>
        </form>
      )}
      {(data || []).map((p) => (
        <div className="card" key={p.id}>
          <h2>{p.question} <span className={'tag ' + (p.status === 'open' ? 'open' : '')}>{t(p.status)}</span></h2>
          {p.options.map((o, i) => (
            <div key={i} style={{ margin: '8px 0' }}>
              {p.counts ? (
                <div className="bars"><div className="b" style={{ gridTemplateColumns: '1fr 70px' }}>
                  <div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{o}{p.myVote === i ? ' ✓' : ''}</span><span className="muted">{p.counts[i]}</span></div>
                    <div className="track"><div className="fill" style={{ width: (p.total ? (p.counts[i] / p.total) * 100 : 0) + '%' }} /></div></div>
                  <span className="muted">{p.total ? Math.round((p.counts[i] / p.total) * 100) : 0}%</span></div></div>
              ) : p.status === 'open' && canWrite ? (
                <button className="secondary" style={{ width: '100%', textAlign: 'left' }} onClick={() => run(async () => { await api('/extras/polls/' + p.id + '/vote', { method: 'POST', body: { option: i } }); await reload(); }, 'Vote recorded')}>{o}</button>
              ) : <div>{o}</div>}
            </div>
          ))}
          {p.counts ? <div className="muted" style={{ fontSize: '.8rem' }}>{p.total} {t('votes')}</div> : <div className="muted" style={{ fontSize: '.8rem' }}>{t('Vote to see the results.')}</div>}
          {canWrite && p.status === 'open' && <p><button className="secondary" onClick={() => run(async () => { await api('/extras/polls/' + p.id + '/close', { method: 'POST' }); await reload(); }, 'Vote closed')}>{t('Close vote')}</button></p>}
        </div>
      ))}
      {data && !data.length && <p className="muted">{t('No votes yet.')}</p>}
    </>
  );
}
