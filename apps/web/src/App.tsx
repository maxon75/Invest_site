import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Activity, Bell, LogOut, Plus, RefreshCw, Search } from 'lucide-react';
import { api } from './api/client';
import { AuthScreen } from './components/AuthScreen';
import { MetricsPanel } from './components/MetricsPanel';
import { useTickerStore } from './store/useTickerStore';
import type { Impact } from './types';

const impactName: Record<Impact, string> = { positive: 'Тезис подтверждается', neutral: 'Нейтрально', negative: 'Риск для тезиса' };

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [search, setSearch] = useState('');
  const [addingTicker, setAddingTicker] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [addError, setAddError] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const { tickers, selectedId, loading, error, loadTickers, selectTicker, clear } = useTickerStore();

  useEffect(() => { void api.session().then(() => setAuthenticated(true)).catch(() => setAuthenticated(false)).finally(() => setAuthChecked(true)); }, []);
  useEffect(() => { if (authenticated) void loadTickers(); }, [authenticated, loadTickers]);

  if (!authChecked) return null;
  if (!authenticated) return <AuthScreen onAuthenticated={() => setAuthenticated(true)} />;

  const selected = tickers.find((ticker) => ticker.id === selectedId);
  const filtered = tickers.filter((ticker) => `${ticker.companyName} ${ticker.symbol}`.toLowerCase().includes(search.toLowerCase()));
  async function logout() { try { await api.logout(); } catch { /* Clear local state even if the session already expired. */ } finally { clear(); setAuthenticated(false); } }
  async function addTicker(event: FormEvent) {
    event.preventDefault(); setAddBusy(true); setAddError('');
    try { await api.addTicker(newSymbol.trim().toUpperCase()); setNewSymbol(''); setAddingTicker(false); await loadTickers(); }
    catch (cause) { setAddError(cause instanceof Error ? cause.message : 'Не удалось добавить компанию.'); }
    finally { setAddBusy(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <a className="wordmark" href="#"><span className="brand-mark small">S<span>.</span></span><span>stock<span className="wordmark-light">note</span></span></a>
      <div className="sidebar-label">МОИ КОМПАНИИ <span>{tickers.length}</span></div>
      <div className="ticker-list">
        {filtered.map((ticker) => <button key={ticker.id} onClick={() => selectTicker(ticker.id)} className={`ticker-button ${ticker.colorStatus} ${selectedId === ticker.id ? 'selected' : ''}`}><span className="ticker-dot"/><span className="ticker-names"><strong>{ticker.companyName}</strong><small>{ticker.symbol}</small></span><span className="ticker-signal" title={`Последнее событие: ${impactName[ticker.thesisImpact]}`} /> </button>)}
        {!loading && filtered.length === 0 && <p className="empty-sidebar">{search ? 'Ничего не найдено.' : 'Список пока пуст.'}</p>}
      </div>
      <button className="add-company" onClick={() => { setAddingTicker(true); setAddError(''); }}><Plus size={17}/>Добавить компанию</button>
      <div className="sidebar-bottom"><div className="user-chip"><div className="avatar">U</div><span><strong>Мой аккаунт</strong><small>Личный профиль</small></span><button aria-label="Выйти" onClick={logout}><LogOut size={16}/></button></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="breadcrumb">Портфель <span>/</span> <b>{selected?.symbol ?? 'Обзор'}</b></div><div className="top-actions"><span className="market-status"><i/>Рынок США</span><button className="icon-button" aria-label="Уведомления"><Bell size={18}/></button><div className="avatar top-avatar">U</div></div></header>
      <div className="content-wrap">
        <div className="page-heading"><div><p className="eyebrow">ВАШ ИНВЕСТИЦИОННЫЙ СПИСОК</p><h1>Обзор компаний</h1><p className="subtitle">Тезисы, показатели и важные изменения в одном месте.</p></div><button className="refresh-button" onClick={() => void loadTickers()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''}/>Обновить</button></div>
        <div className="toolbar"><div className="search-box"><Search size={17}/><input aria-label="Поиск компаний" placeholder="Поиск по названию или тикеру" value={search} onChange={(e) => setSearch(e.target.value)}/></div><div className="updated-label"><Activity size={15}/>{loading ? 'Обновляем…' : 'Показаны ваши компании'}</div></div>
        {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => void loadTickers()}>Повторить</button></div>}
        {loading && tickers.length === 0 ? <div className="loading-card"><div className="loader"/><span>Загружаем ваши компании…</span></div> : !selected ? <div className="welcome-card"><div className="welcome-icon"><Activity size={22}/></div><p className="eyebrow">ВАШ СПИСОК АКЦИЙ</p><h2>{tickers.length ? 'Выберите компанию' : 'Начните с первой компании'}</h2><p>{tickers.length ? 'Выберите компанию в левом меню, чтобы посмотреть показатели и тезис.' : 'Добавьте тикер, чтобы следить за тезисом, отчётами и движением цены.'}</p><button className="primary-button compact" onClick={() => setAddingTicker(true)}><Plus size={17}/>Добавить компанию</button></div> : <>
          <section className="company-card"><div className="company-top"><div><div className="company-kicker"><span className={`impact-pill ${selected.colorStatus}`} title={`Последнее событие: ${impactName[selected.thesisImpact]}`}>{impactName[selected.thesisImpact]}</span><span className="ticker-symbol">{selected.symbol}</span></div><h2>{selected.companyName}</h2><p className="company-caption">Ваш тезис по компании и актуальные финансовые данные</p></div><div className="price-box"><span>Цена акции</span><strong>{selected.currentPrice == null ? '—' : `$${Number(selected.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong><small>{selected.priceUpdatedAt ? `Обновлено ${new Date(selected.priceUpdatedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : 'Цена обновляется каждые 5–10 минут'}</small></div></div><div className="thesis-box"><span className="thesis-icon"><Activity size={17}/></span><div><small>ИНВЕСТИЦИОННЫЙ ТЕЗИС</small><p>{selected.thesis || 'Тезис ещё не заполнен.'}</p></div></div></section>
          <div className="metrics-title"><div><h2>Финансовые показатели</h2><p>Значения обновляются после публикации отчёта компании</p></div><span className="report-tag">По последнему отчёту</span></div>
          <MetricsPanel ticker={selected}/>
        </>}
        <footer className="page-footer">Информация предназначена для личного аналитического использования.</footer>
      </div>
      {addingTicker && <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddingTicker(false); }}><section className="add-modal" role="dialog" aria-modal="true" aria-labelledby="add-title"><button className="modal-close" onClick={() => setAddingTicker(false)} aria-label="Закрыть">×</button><p className="eyebrow">ВАШ СПИСОК АКЦИЙ</p><h2 id="add-title">Добавить компанию</h2><p>Введите биржевой тикер, например AAPL или MSFT.</p><form onSubmit={addTicker}><label>Тикер<input autoFocus value={newSymbol} onChange={(event) => setNewSymbol(event.target.value)} maxLength={12} required placeholder="AAPL" /></label>{addError && <div className="form-error" role="alert">{addError}</div>}<button className="primary-button" disabled={addBusy}>{addBusy ? 'Добавляем…' : 'Добавить в список'}</button></form></section></div>}
    </main>
  </div>;
}
