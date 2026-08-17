import type { Train, Corridor, AIRecommendation, SimulationState, WeeklyData, SystemDiagnostic, AlertItem } from '../types';
import { TRAIN_DATA } from './trainsData';

export const INITIAL_TRAINS: Train[] = TRAIN_DATA as Train[];

export const CORRIDORS: Corridor[] = [
  {
    id: 'corridor-1',
    name: 'Northern Corridor',
    load: 82,
    status: 'HIGH',
    activeTrains: 46,
    tracks: 8
  },
  {
    id: 'corridor-2',
    name: 'Western Corridor',
    load: 64,
    status: 'NORMAL',
    activeTrains: 38,
    tracks: 6
  },
  {
    id: 'corridor-3',
    name: 'Eastern Corridor',
    load: 47,
    status: 'NORMAL',
    activeTrains: 24,
    tracks: 4
  },
  {
    id: 'corridor-4',
    name: 'Central Freight',
    load: 91,
    status: 'CRITICAL',
    activeTrains: 20,
    tracks: 2
  }
];

export const AI_RECOMMENDATIONS: AIRecommendation[] = [
  {
    id: 'rec-1',
    type: 'CONGESTION',
    badge: 'AI',
    title: 'SHE-SKG section at 56.6% delay rate',
    description: 'Worst performing section — prioritise slot clearance',
    location: 'SHE-SKG Section'
  },
  {
    id: 'rec-2',
    type: 'PREDICTION',
    badge: 'AI',
    title: 'Freight train — 29.7 min delay forecast',
    description: '100% confidence · SHE-SKG · Winter + Severe weather',
    confidence: '100%',
    location: 'SHE-SKG · Single Track'
  },
  {
    id: 'rec-3',
    type: 'REROUTE',
    badge: 'AI',
    title: 'Express via BWN-GUS reroute B',
    description: 'Saves 13 min · 86.9% AI confidence · Monsoon alert',
    savings: '13 min'
  }
];

export const INITIAL_SIMULATION: SimulationState = {
  scenarioName: 'Peak Hour Traffic Optimization',
  subTitle: 'Scenario running — AI evaluating decision tree',
  simTime: '14:37:22',
  simulatedTrains: 128,
  aiDecisionsEvaluated: 342,
  efficiencyGain: '+18.6%',
  conflictsResolved: 14,
  progressPercent: 72,
  eta: '4 min 12 sec',
  isRunning: true,
  logs: [
    {
      id: 'log-1',
      time: '14:37:10',
      message: 'AI resolved conflict at Kanpur Jn — rerouted Train 12967 via Track B',
      color: '#1E7F4F'
    },
    {
      id: 'log-2',
      time: '14:36:55',
      message: 'Congestion detected at Mughal Sarai — initiating cascade hold protocol',
      color: '#B9790A'
    },
    {
      id: 'log-3',
      time: '14:35:40',
      message: 'Train 12002 cleared Agra Cantt — slot reallocated for freight convoy',
      color: '#2F5FD1'
    },
    {
      id: 'log-4',
      time: '14:34:12',
      message: 'Northern corridor load peaked at 88% — capacity throttle applied',
      color: '#C23636'
    },
    {
      id: 'log-5',
      time: '14:32:00',
      message: 'Simulation scenario loaded — 128 trains, 342 decision nodes',
      color: '#5B6478'
    }
  ]
};

// On-time % by day of week — derived from 50K-record dataset
export const WEEKLY_PERFORMANCE: WeeklyData[] = [
  { day: 'Mon', percentage: 52 },
  { day: 'Tue', percentage: 53 },
  { day: 'Wed', percentage: 54 },
  { day: 'Thu', percentage: 54 },
  { day: 'Fri', percentage: 53 },
  { day: 'Sat', percentage: 52 },
  { day: 'Sun', percentage: 52, highlight: true }
];

export const SYSTEM_DIAGNOSTICS: SystemDiagnostic[] = [
  { name: 'AI Engine', percentage: 98 },
  { name: 'Database', percentage: 100 },
  { name: 'Network Gateway', percentage: 96 },
  { name: 'Signal Interface', percentage: 99 }
];

export const SYSTEM_ALERTS: AlertItem[] = [
  {
    id: 'alt-1',
    severity: 'critical',
    message: 'Central Freight Corridor section at 91% capacity threshold',
    timestamp: '17:33:10',
    location: 'Central Freight Corridor'
  },
  {
    id: 'alt-2',
    severity: 'warning',
    message: 'Train 12627 Karnataka Express delay increased by +12 min',
    timestamp: '17:30:45',
    location: 'Ghaziabad',
    trainNo: '12627'
  },
  {
    id: 'alt-3',
    severity: 'warning',
    message: 'Platform 3 Mathura Jn slot conflict detected with freight rake',
    timestamp: '17:28:12',
    location: 'Mathura Jn'
  },
  {
    id: 'alt-4',
    severity: 'info',
    message: 'AI re-scheduled Train 12884 via chord line to recover 12 mins',
    timestamp: '17:25:00',
    location: 'Jhansi Sector',
    trainNo: '12884'
  },
  {
    id: 'alt-5',
    severity: 'resolved',
    message: 'Agra Cantt P1 track signal interlock restored to clear state',
    timestamp: '17:18:22',
    location: 'Agra Cantt'
  },
  {
    id: 'alt-6',
    severity: 'info',
    message: 'Northern zone morning shift controller handover verified',
    timestamp: '17:00:00',
    location: 'Control HQ'
  },
  {
    id: 'alt-7',
    severity: 'resolved',
    message: 'Panipat interlocking track circuit reset verified by loco pilot',
    timestamp: '16:45:10',
    location: 'Panipat'
  }
];
