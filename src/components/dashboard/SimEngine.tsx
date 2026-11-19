import type { SimulationState } from '../../types';
import { Panel } from './Panel';

interface SimEngineProps {
  simulation: SimulationState;
  onOpen: () => void;
}

const Metric = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  tone?: 'default' | 'positive';
}) => (
  <div>
    <div className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-[#5B6478] dark:text-gray-500">
      {label}
    </div>
    <div
      className={`mt-1 font-mono text-[13px] font-semibold tabular-nums leading-none ${
        tone === 'positive'
          ? 'text-[#1E7F4F] dark:text-emerald-400'
          : 'text-[#0F2C5C] dark:text-gray-100'
      }`}
    >
      {value}
    </div>
  </div>
);

export const SimEngine = ({ simulation, onOpen }: SimEngineProps) => (
  <Panel
    title="Simulation Engine"
    meta={simulation.isRunning ? 'RUNNING' : 'PAUSED'}
    action={
      <button
        type="button"
        onClick={onOpen}
        className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#2F5FD1] dark:text-sky-400 hover:text-[#0F2C5C] dark:hover:text-white transition-colors"
      >
        Open ↗
      </button>
    }
  >
    <div className="px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[#5B6478] dark:text-gray-400">
          {simulation.scenarioName}
        </span>
        <span className="font-mono text-[10px] font-semibold tabular-nums text-[#0F2C5C] dark:text-white">
          {simulation.progressPercent.toFixed(0)}%
        </span>
      </div>

      <div className="mt-2 h-[3px] w-full bg-[rgba(15,44,92,0.08)] dark:bg-white/10 overflow-hidden">
        <div
          className="h-full bg-[#2F5FD1] dark:bg-sky-400 transition-[width] duration-500"
          style={{ width: `${simulation.progressPercent}%` }}
        />
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-3">
        <Metric label="Decisions" value={simulation.aiDecisionsEvaluated} />
        <Metric label="Conflicts" value={simulation.conflictsResolved} />
        <Metric label="Gain" value={simulation.efficiencyGain} tone="positive" />
      </div>
    </div>
  </Panel>
);
