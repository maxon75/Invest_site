import { useState, type FormEvent } from 'react';
import { api } from '../api/client';

export function AuthScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await (mode === 'login' ? api.login(login, password) : api.register(login, password));
      onAuthenticated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось выполнить запрос.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-page">
    <section className="auth-card">
      <div className="brand-mark">S<span>.</span></div>
      <p className="eyebrow">STOCK LEVEL-1 TRACKER</p>
      <h1>{mode === 'login' ? 'С возвращением' : 'Создать аккаунт'}</h1>
      <p className="auth-copy">Следите за тезисами и важными событиями компаний.</p>
      <div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Войти</button><button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Регистрация</button></div>
      <form onSubmit={submit}>
        <label>Логин<input autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required minLength={3} placeholder="Ваш логин" /></label>
        <label>Пароль<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Не менее 8 символов" /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="primary-button" disabled={busy}>{busy ? 'Подождите…' : mode === 'login' ? 'Войти в аккаунт' : 'Зарегистрироваться'}</button>
      </form>
      <p className="secure-note">Ваш список акций и заметки доступны только вам.</p>
    </section>
  </main>;
}
