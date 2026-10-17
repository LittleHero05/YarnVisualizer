import { useState, type FormEvent } from 'react';

type Status = 'idle' | 'sending' | 'done' | 'error';

/** "More tools like this" email list. Stored privately; see About & privacy. */
export function EmailSignup() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website, source: 'footer' }),
      });
      if (res.ok) {
        setStatus('done');
        return;
      }
      const { error } = await res.json().catch(() => ({ error: '' }));
      setMessage(
        error === 'invalid_email' ? 'That email address doesn’t look right.'
          : error === 'rate_limited' ? 'Too many tries. Please wait a minute.'
            : error === 'not_configured' ? 'Signups aren’t switched on here yet.'
              : 'Something went wrong. Please try again.',
      );
      setStatus('error');
    } catch {
      setMessage('Couldn’t reach the server. Please try again.');
      setStatus('error');
    }
  }

  return (
    <section className="signup" aria-labelledby="signup-title">
      <h2 id="signup-title">More tools like this are on the way</h2>
      {status === 'done' ? (
        <p className="signup-done" role="status">You’re on the list. We’ll be in touch ♡</p>
      ) : (
        <form onSubmit={submit} noValidate>
          <p className="muted">Drop your email and we’ll let you know when the next one is ready. Only yarn things, no spam.</p>
          <div className="signup-row">
            <label className="sr-only" htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={status === 'error' || undefined}
              aria-describedby={status === 'error' ? 'signup-error' : undefined}
            />
            <button type="submit" className="yellow" disabled={status === 'sending' || !email.trim()}>
              {status === 'sending' ? 'Adding…' : 'Keep me posted'}
            </button>
          </div>
          <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          {status === 'error' && <p id="signup-error" className="notice error small" role="alert">{message}</p>}
        </form>
      )}
    </section>
  );
}
