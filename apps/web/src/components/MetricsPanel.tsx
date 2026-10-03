import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { Metric, MetricSection, Ticker } from '../types';

const sections: { key: MetricSection; title: string; count: number }[] = [
  { key: 'valuation', title: 'Оценка', count: 7 },
  { key: 'profitability', title: 'Прибыльность', count: 5 },
  { key: 'stability', title: 'Финансовая устойчивость', count: 3 },
  { key: 'riskMarket', title: 'Риск и рынок', count: 3 },
];

function MetricTile({ metric }: { metric: Metric }) {
  const changeClass = metric.changeDirection === 'up' ? 'up' : metric.changeDirection === 'down' ? 'down' : '';
  return <div className="metric-tile"><span className="metric-label">{metric.label}</span><strong className="metric-value">{metric.value ?? '—'}</strong>{metric.change != null && <span className={`metric-change ${changeClass}`}>{metric.changeDirection === 'up' ? '↑ ' : metric.changeDirection === 'down' ? '↓ ' : ''}{metric.change}</span>}</div>;
}

export function MetricsPanel({ ticker }: { ticker: Ticker }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ valuation: true, profitability: true, stability: true, riskMarket: true });
  return <div className="metrics-stack">
    {sections.map((section) => {
      const metrics = ticker.metrics?.[section.key] ?? [];
      return <section className="metric-section" key={section.key}>
        <button className="section-heading" aria-expanded={open[section.key]} onClick={() => setOpen((state) => ({ ...state, [section.key]: !state[section.key] }))}>
          <span><strong>{section.title}</strong>{(section.key === 'profitability' || section.key === 'stability') && ticker.earningsPeriod && <small>{ticker.earningsPeriod}</small>}</span>
          <span className="section-meta">{metrics.length || section.count} показателей{open[section.key] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
        </button>
        {open[section.key] && <div className="metric-grid">{metrics.length ? metrics.map((metric) => <MetricTile key={metric.key} metric={metric} />) : <div className="metric-placeholder">Данные появятся после загрузки финансового отчёта.</div>}</div>}
      </section>;
    })}
  </div>;
}
