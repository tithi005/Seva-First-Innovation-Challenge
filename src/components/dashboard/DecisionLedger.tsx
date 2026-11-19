import type { AIRecommendation } from '../../types';
import { Panel } from './Panel';

const TYPE_STYLE: Record<AIRecommendation['type'], string> = {
  CONGESTION:
    'text-[#B9790A] dark:text-amber-400 border-[#B9790A]/35 dark:border-amber-400/30',
  PREDICTION:
    'text-[#2F5FD1] dark:text-sky-400 border-[#2F5FD1]/35 dark:border-sky-400/30',
  REROUTE:
    'text-[#1E7F4F] dark:text-emerald-400 border-[#1E7F4F]/35 dark:border-emerald-400/30',
};

interface DecisionLedgerProps {
  items: AIRecommendation[];
  onApply: (id: string) => void;
  onOpenOptimization: () => void;
}

export const DecisionLedger = ({ items, onApply, onOpenOptimization }: DecisionLedgerProps) => (
  <Panel
    title="AI Decision Ledger"
    meta={`${items.length} pending`}
    action={
      <button
        type="button"
        onClick={onOpenOptimization}
        className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#2F5FD1] dark:text-sky-400 hover:text-[#0F2C5C] dark:hover:text-white transition-colors"
      >
        Optimize →
      </button>
    }
  >
    {items.length === 0 ? (
      <div className="px-4 py-10 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#1E7F4F] dark:text-emerald-400">
          Ledger clear
        </p>
        <p className="mt-2 text-[11px] text-[#5B6478] dark:text-gray-400">
          No pending interventions — corridor operating to plan.
        </p>
      </div>
    ) : (
      <ul>
        {items.map((rec, index) => (
          <li
            key={rec.id}
            className="relative pl-11 pr-4 py-3.5 border-b border-[rgba(15,44,92,0.07)] dark:border-white/5 last:border-b-0"
          >
            <span className="absolute left-4 top-[15px] font-mono text-[9px] tabular-nums text-[#8C95A6] dark:text-gray-500">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span
              className="absolute left-[26px] top-0 bottom-0 w-px bg-[rgba(15,44,92,0.08)] dark:bg-white/10"
              aria-hidden="true"
            />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`border px-1.5 py-px font-mono text-[8.5px] font-bold uppercase tracking-[0.12em] ${TYPE_STYLE[rec.type]}`}
                  >
                    {rec.type}
                  </span>
                  {rec.confidence ? (
                    <span className="font-mono text-[9px] tabular-nums text-[#5B6478] dark:text-gray-400">
                      CONF {rec.confidence}
                    </span>
                  ) : null}
                </div>

                <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-[#0F2C5C] dark:text-white">
                  {rec.title}
                </p>
                <p className="mt-0.5 text-[10.5px] leading-snug text-[#5B6478] dark:text-gray-400">
                  {rec.description}
                </p>
                {rec.location ? (
                  <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-[#8C95A6] dark:text-gray-500">
                    ▸ {rec.location}
                  </p>
                ) : null}
              </div>

              <div className="shrink-0 text-right">
                {rec.savings ? (
                  <div className="mb-1.5 font-mono text-[10px] font-bold tabular-nums text-[#1E7F4F] dark:text-emerald-400">
                    −{rec.savings}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => onApply(rec.id)}
                  className="border border-[#1E7F4F]/50 dark:border-emerald-400/40 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#1E7F4F] dark:text-emerald-400 hover:bg-[#1E7F4F] hover:text-white dark:hover:bg-emerald-400 dark:hover:text-slate-950 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )}
  </Panel>
);
