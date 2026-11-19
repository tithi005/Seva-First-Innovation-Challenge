import React, { useState } from 'react';
import type { Train } from '../types';
import { useSystem } from '../context/SystemContext';
import { useToast } from '../context/ToastContext';
import { KpiRail } from '../components/dashboard/KpiRail';
import type { KpiItem } from '../components/dashboard/KpiRail';
import { SignalBoard } from '../components/dashboard/SignalBoard';
import { MovementTable } from '../components/dashboard/MovementTable';
import type { MovementFilter } from '../components/dashboard/MovementTable';
import { DecisionLedger } from '../components/dashboard/DecisionLedger';
import { AlertQueue } from '../components/dashboard/AlertQueue';
import { SimEngine } from '../components/dashboard/SimEngine';
import { isLate, DELAY_THRESHOLD_MIN } from '../components/dashboard/metrics';
import { RefreshCw, PlayCircle } from 'lucide-react';

const SIMULATION_URL = 'https://ml-simulation-w6oc.vercel.app/';

export const Dashboard: React.FC = () => {
  const {
    trains,
    corridors,
    alerts,
    aiRecommendations,
    simulation,
    istTime,
    setActiveNav,
    applyRecommendation,
  } = useSystem();

  const { addToast } = useToast();
  const [filterTrainType, setFilterTrainType] = useState<MovementFilter>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    addToast('Refreshing live telemetry and sensor feeds...', 'info');
    setTimeout(() => {
      setIsRefreshing(false);
      addToast('Dashboard data synchronized with Northern Zone Control', 'success');
    }, 600);
  };

  const openSimulation = () => {
    addToast('Opening Traffic Simulation...', 'info');
    window.open(SIMULATION_URL, '_blank');
  };

  /* ── Derived corridor figures ─────────────────────────────────────────── */
  const lateTrains = trains.filter(isLate);
  const approachingCount = trains.filter((t) => t.status === 'APPROACHING').length;
  const onTimePct = Math.round(
    ((trains.length - lateTrains.length) / (trains.length || 1)) * 100
  );
  const avgDelayWhenLate = lateTrains.length
    ? lateTrains.reduce((sum, t) => sum + (t.delayMinutes ?? 0), 0) / lateTrains.length
    : 0;

  const corridorLoad = corridors.length
    ? corridors.reduce((sum, c) => sum + c.load, 0) / corridors.length
    : 0;
  const peakCorridorLoad = corridors.reduce((max, c) => Math.max(max, c.load), 0);

  const openAlerts = alerts.filter(
    (a) => a.severity === 'critical' || a.severity === 'warning'
  );
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

  const kpis: KpiItem[] = [
    {
      id: 'active',
      label: 'Active trains',
      value: String(trains.length),
      unit: 'on line',
      note: `${approachingCount} approach · ${lateTrains.length} late`,
      tone: 'default',
    },
    {
      id: 'on-time',
      label: 'On-time rate',
      value: String(onTimePct),
      unit: '%',
      note: `Target ≥ 85% · ${trains.length - lateTrains.length} clear`,
      tone: onTimePct >= 85 ? 'positive' : onTimePct >= 60 ? 'caution' : 'danger',
      meter: onTimePct,
      threshold: 85,
    },
    {
      id: 'avg-delay',
      label: 'Mean delay / late',
      value: avgDelayWhenLate.toFixed(1),
      unit: 'min',
      note: `${DELAY_THRESHOLD_MIN} min threshold applied`,
      tone: 'caution',
      meter: (avgDelayWhenLate / 25) * 100,
      threshold: (DELAY_THRESHOLD_MIN / 25) * 100,
    },
    {
      id: 'ai',
      label: 'Conflicts resolved',
      value: String(simulation.conflictsResolved),
      unit: 'by AI',
      note: `${simulation.efficiencyGain} efficiency vs FIFO`,
      tone: 'positive',
    },
    {
      id: 'alerts',
      label: 'Open safety notices',
      value: String(openAlerts.length),
      note: `${criticalAlerts} critical · ${openAlerts.length - criticalAlerts} warning`,
      tone: criticalAlerts > 0 ? 'danger' : 'caution',
    },
    {
      id: 'load',
      label: 'Corridor load',
      value: String(Math.round(corridorLoad)),
      unit: '%',
      note: `Peak ${peakCorridorLoad}% · ${corridors.length} corridors`,
      tone: peakCorridorLoad >= 90 ? 'danger' : 'caution',
      meter: corridorLoad,
      threshold: 90,
    },
  ];

  /* ── Movement register filtering ──────────────────────────────────────── */
  const filteredTrains = trains
    .filter((t) => {
      if (filterTrainType === 'ALL') return true;
      if (filterTrainType === 'DELAYED') return isLate(t);
      if (filterTrainType === 'EXPRESS')
        return (
          t.trainType?.includes('Express') ||
          t.trainType?.includes('Rajdhani') ||
          t.trainType?.includes('Vande')
        );
      if (filterTrainType === 'FREIGHT')
        return t.trainType?.includes('Freight') || t.priority === 'Freight';
      return true;
    })
    .slice(0, 6);

  const handleRowClick = (train: Train) => {
    addToast(
      `Telemetry · ${train.trainNo} at ${train.sectionId ?? train.location} · ${
        train.speed ?? '—'
      } km/h`,
      'info'
    );
  };

  return (
    <div className="max-w-[1600px] space-y-5 pb-12">
      {/* Console header */}
      <header className="flex flex-col gap-3 border-b border-[rgba(15,44,92,0.14)] dark:border-white/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[#5B6478] dark:text-gray-400">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#1E7F4F] opacity-70 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#1E7F4F] dark:bg-emerald-400" />
            </span>
            Line control · Howrah–Burdwan up main
          </div>
          <h1 className="mt-2 text-[21px] font-semibold tracking-tight text-[#0F2C5C] dark:text-white">
            Corridor Overview
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="mr-2 hidden flex-col items-end leading-none md:flex">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#5B6478] dark:text-gray-500">
              Feed
            </span>
            <span className="mt-1 whitespace-nowrap font-mono text-[11px] tabular-nums text-[#0F2C5C] dark:text-gray-200">
              LIVE · {istTime.replace(' IST', '')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 border border-[rgba(15,44,92,0.16)] dark:border-white/12 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#0F2C5C] dark:text-gray-300 hover:bg-[#0F2C5C]/[0.04] dark:hover:bg-white/5 transition-colors"
            title="Sync live telemetry"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-[#2F5FD1] dark:text-sky-400' : ''}`} />
            Sync
          </button>

          <button
            type="button"
            onClick={openSimulation}
            className="flex items-center gap-1.5 bg-[#0F2C5C] dark:bg-sky-500 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white dark:text-slate-950 hover:bg-[#2F5FD1] dark:hover:bg-sky-400 transition-colors"
          >
            <PlayCircle className="h-3 w-3" />
            Simulation
          </button>
        </div>
      </header>

      <KpiRail items={kpis} />

      <SignalBoard trains={trains} updatedAt={istTime.replace(' IST', '')} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <MovementTable
            trains={filteredTrains}
            filter={filterTrainType}
            onFilterChange={setFilterTrainType}
            onRowClick={handleRowClick}
            onOpenOperations={() => setActiveNav('Operations')}
            totalActive={trains.length}
          />
        </div>

        <div className="space-y-5 lg:col-span-5">
          <SimEngine simulation={simulation} onOpen={openSimulation} />
          <DecisionLedger
            items={aiRecommendations}
            onApply={(id) => {
              const rec = aiRecommendations.find((r) => r.id === id);
              applyRecommendation(id);
              addToast(`Action executed: ${rec?.title ?? 'AI decision'}`, 'success');
            }}
            onOpenOptimization={() => setActiveNav('Optimization')}
          />
          <AlertQueue
            alerts={alerts}
            onAcknowledge={(alert) =>
              addToast(
                `Alert acknowledged: ${alert.message}`,
                alert.severity === 'critical' ? 'error' : 'info'
              )
            }
          />
        </div>
      </div>
    </div>
  );
};
