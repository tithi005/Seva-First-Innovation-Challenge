import type { WeeklyData, Train } from '../types';

// ── Dataset Stats (from train_delay_dataset, 50,000 records) ──────────────────
// Delay threshold: 10 min  |  Models: RandomForest classifier + HistGradientBoosting regressor
// Classifier accuracy: 87.17%  |  Regressor MAE: 1.59 min  |  Regressor R²: 0.878

export const DATASET_OVERVIEW = {
  totalRecords: 50000,
  delayThreshold: 10, // minutes
  delayedCount: 23584,
  onTimeCount: 26416,
  delayedPct: 47.2,
  onTimePct: 52.8,
  avgDelayAll: 10.47,      // across all trains
  avgDelayDelayedOnly: 15.27,
  classifierAccuracy: 87.17,
  regressorMAE: 1.59,
  regressorR2: 0.878,
  sections: ['HWH-BLY', 'BLY-BDC', 'BDC-SHE', 'SHE-SKG', 'SKG-MMR', 'MMR-BWN', 'BWN-GUS', 'GUS-PAN'],
};

// ── Weekly On-Time Performance (derived from day_of_week stats) ──────────────
export const WEEKLY_PERFORMANCE: WeeklyData[] = [
  { day: 'Mon', percentage: 52, highlight: false },
  { day: 'Tue', percentage: 53, highlight: false },
  { day: 'Wed', percentage: 54, highlight: false },
  { day: 'Thu', percentage: 54, highlight: false },
  { day: 'Fri', percentage: 53, highlight: false },
  { day: 'Sat', percentage: 52, highlight: false },
  { day: 'Sun', percentage: 52, highlight: true  },
];

// ── Delay by Train Type ───────────────────────────────────────────────────────
export const DELAY_BY_TRAIN_TYPE = [
  { type: 'Express',   avgDelay: 8.06,  delayedPct: 28.91, count: 14094, color: '#2F5FD1' },
  { type: 'Passenger', avgDelay: 10.42, delayedPct: 46.32, count: 14919, color: '#F5821F' },
  { type: 'Suburban',  avgDelay: 10.33, delayedPct: 45.16, count: 12442, color: '#8B5CF6' },
  { type: 'Freight',   avgDelay: 14.73, delayedPct: 81.70, count: 8545,  color: '#C23636' },
];

// ── Section Delay Stats (all 8 sections) ─────────────────────────────────────
export const SECTION_DELAY_STATS = [
  { section: 'SHE-SKG', avgDelay: 11.69, delayedPct: 56.59, status: 'HIGH'     },
  { section: 'BWN-GUS', avgDelay: 11.18, delayedPct: 51.96, status: 'HIGH'     },
  { section: 'MMR-BWN', avgDelay: 11.10, delayedPct: 50.77, status: 'HIGH'     },
  { section: 'SKG-MMR', avgDelay: 11.09, delayedPct: 50.63, status: 'HIGH'     },
  { section: 'GUS-PAN', avgDelay: 11.03, delayedPct: 51.69, status: 'HIGH'     },
  { section: 'BDC-SHE', avgDelay:  9.29, delayedPct: 38.67, status: 'NORMAL'   },
  { section: 'HWH-BLY', avgDelay:  9.23, delayedPct: 38.61, status: 'NORMAL'   },
  { section: 'BLY-BDC', avgDelay:  9.17, delayedPct: 38.95, status: 'NORMAL'   },
];

// ── Delay by Season ───────────────────────────────────────────────────────────
export const DELAY_BY_SEASON = [
  { season: 'Winter',  avgDelay: 12.39, delayedPct: 55.78, color: '#60A5FA' },
  { season: 'Monsoon', avgDelay: 11.18, delayedPct: 56.08, color: '#34D399' },
  { season: 'Spring',  avgDelay:  9.46, delayedPct: 41.22, color: '#FBBF24' },
  { season: 'Summer',  avgDelay:  9.07, delayedPct: 37.70, color: '#F97316' },
];

// ── Delay by Time Bucket ──────────────────────────────────────────────────────
export const DELAY_BY_TIME_BUCKET = [
  { bucket: 'Peak',     avgDelay: 11.31, delayedPct: 53.63, color: '#C23636' },
  { bucket: 'Off-peak', avgDelay:  9.55, delayedPct: 40.76, color: '#F5821F' },
  { bucket: 'Night',    avgDelay:  9.80, delayedPct: 40.63, color: '#2F5FD1' },
];

// ── Weather Impact ────────────────────────────────────────────────────────────
export const WEATHER_IMPACT = [
  { label: 'Clear',    flag: 0, avgDelay:  8.34, count: 37396, color: '#1E7F4F' },
  { label: 'Moderate', flag: 1, avgDelay: 14.37, count:  7872, color: '#F5821F' },
  { label: 'Severe',   flag: 2, avgDelay: 20.73, count:  4732, color: '#C23636' },
];

// ── Live ML Predictions (from model at inference time, 5 scenarios) ───────────
export const ML_PREDICTIONS = [
  {
    id: 'pred-1',
    trainType: 'Express',
    section: 'BWN-GUS',
    season: 'Monsoon',
    weather: 'Moderate',
    timeBucket: 'Peak',
    isDelayed: true,
    confidence: 86.9,
    predictedDelay: 13.1,
    description: 'Peak-hour monsoon conditions on a high-delay section — flag for priority dispatch.',
  },
  {
    id: 'pred-2',
    trainType: 'Freight',
    section: 'SHE-SKG',
    season: 'Winter',
    weather: 'Severe',
    timeBucket: 'Peak',
    isDelayed: true,
    confidence: 100.0,
    predictedDelay: 29.7,
    description: 'Severe weather + high congestion on single-track freight route — immediate reroute advised.',
  },
  {
    id: 'pred-3',
    trainType: 'Suburban',
    section: 'HWH-BLY',
    season: 'Summer',
    weather: 'Clear',
    timeBucket: 'Off-peak',
    isDelayed: false,
    confidence: 99.7,
    predictedDelay: 2.9,
    description: 'Low congestion, clear weather, double-track — on-schedule operation expected.',
  },
  {
    id: 'pred-4',
    trainType: 'Passenger',
    section: 'GUS-PAN',
    season: 'Spring',
    weather: 'Clear',
    timeBucket: 'Night',
    isDelayed: false,
    confidence: 93.8,
    predictedDelay: 7.6,
    description: 'Night slot on single-track spring route — marginal delay, no action needed.',
  },
  {
    id: 'pred-5',
    trainType: 'Express',
    section: 'MMR-BWN',
    season: 'Monsoon',
    weather: 'Severe',
    timeBucket: 'Peak',
    isDelayed: true,
    confidence: 99.0,
    predictedDelay: 21.1,
    description: 'Severe monsoon + upstream delay cascade — hold protocol recommended at MMR.',
  },
];

// ── Feature Importance (RandomForest, grouped by original feature) ───────────
export const FEATURE_IMPORTANCE = [
  { feature: 'Weather Condition',  importance: 31.80, description: 'Clear / Moderate / Severe' },
  { feature: 'Upstream Delay',     importance: 24.47, description: 'Propagation from prior section' },
  { feature: 'Section Congestion', importance: 15.65, description: 'Load factor 0–1' },
  { feature: 'Train Type',         importance: 6.50,  description: 'Freight / Express / Passenger / Suburban' },
  { feature: 'Priority Level',     importance: 5.28,  description: 'Priority 1–3' },
  { feature: 'Season',             importance: 3.68,  description: 'Winter / Monsoon / Spring / Summer' },
  { feature: 'Day of Week',        importance: 3.53,  description: 'Mon–Sun' },
  { feature: 'Section ID',         importance: 3.20,  description: '8 route sections' },
  { feature: 'Track Type',         importance: 2.69,  description: 'Single / Double' },
  { feature: 'Time of Day',        importance: 2.46,  description: 'Peak / Off-peak / Night' },
  { feature: 'Weekend Flag',       importance: 0.74,  description: 'Weekday vs weekend' },
];

// ── Per-train ML delay risk score (deterministic proxy, mirrors model logic) ──
// Uses real feature weights from the RandomForest to score each train 0–100.
// Formula: weighted sum of normalised feature values, capped to [0, 100].
export function computeDelayRisk(train: Train): number {
  let score = 0;

  // Weather flag (0=clear, 1=moderate, 2=severe) — weight 31.8%
  const weatherScore = ((train.weatherFlag ?? 0) / 2) * 31.8;

  // Upstream delay (0–36 min range in dataset) — weight 24.5%
  const upstreamScore = Math.min((train.upstreamDelayMin ?? 0) / 20, 1) * 24.5;

  // Section congestion (0–1) — weight 15.7%
  const congScore = (train.sectionCongestionLevel ?? 0) * 15.7;

  // Train type — weight 6.5% (Freight highest, Express lowest)
  const typeMap: Record<string, number> = {
    Freight: 1.0, Passenger: 0.55, Suburban: 0.50, Express: 0.30,
  };
  const typeScore = (typeMap[train.trainType ?? ''] ?? 0.5) * 6.5;

  // Priority (3=low priority = higher delay risk) — weight 5.3%
  const priorityScore = (((train.priorityLevel ?? 2) - 1) / 2) * 5.3;

  // Season — weight 3.7%
  const seasonMap: Record<string, number> = {
    Winter: 1.0, Monsoon: 0.85, Spring: 0.45, Summer: 0.35,
  };
  const seasonScore = (seasonMap[train.season ?? ''] ?? 0.5) * 3.7;

  // Time bucket — weight 2.5%
  const timeMap: Record<string, number> = { Peak: 1.0, 'Off-peak': 0.45, Night: 0.40 };
  const timeScore = (timeMap[train.timeOfDayBucket ?? ''] ?? 0.5) * 2.5;

  // Track type — weight 2.7%
  const trackScore = (train.trackType === 'Single' ? 1.0 : 0.3) * 2.7;

  score = weatherScore + upstreamScore + congScore + typeScore + priorityScore + seasonScore + timeScore + trackScore;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── ECharts Option Builders (pure JS, no React) ──────────────────────────────

/** Bar chart: delay % by train type */
export const getTrainTypeChartOption = (isDark: boolean) => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textStyle: { color: isDark ? '#e5e7eb' : '#0F2C5C', fontSize: 11 },
    formatter: (params: any[]) => {
      const p = params[0];
      return `<b>${p.name}</b><br/>Delayed: ${p.value}%`;
    },
  },
  grid: { left: 40, right: 16, top: 12, bottom: 28, containLabel: false },
  xAxis: {
    type: 'category',
    data: DELAY_BY_TRAIN_TYPE.map(d => d.type),
    axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
    axisTick: { show: false },
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    max: 100,
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10, formatter: '{value}%' },
    splitLine: { lineStyle: { color: isDark ? '#1f2937' : '#f1f5f9' } },
  },
  series: [{
    type: 'bar',
    data: DELAY_BY_TRAIN_TYPE.map(d => ({
      value: d.delayedPct,
      itemStyle: { color: d.color, borderRadius: [4, 4, 0, 0] },
    })),
    barWidth: '50%',
  }],
});

/** Donut chart: on-time vs delayed */
export const getOnTimePieOption = (isDark: boolean) => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textStyle: { color: isDark ? '#e5e7eb' : '#0F2C5C', fontSize: 11 },
    formatter: '{b}: {c} ({d}%)',
  },
  legend: {
    bottom: 0,
    textStyle: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
  },
  series: [{
    type: 'pie',
    radius: ['50%', '75%'],
    center: ['50%', '45%'],
    label: {
      show: true,
      position: 'center',
      formatter: () => '52.8%\nOn-Time',
      color: isDark ? '#e5e7eb' : '#0F2C5C',
      fontSize: 12,
      fontWeight: 'bold',
      lineHeight: 18,
    },
    labelLine: { show: false },
    data: [
      { value: 26416, name: 'On-Time',  itemStyle: { color: '#1E7F4F' } },
      { value: 23584, name: 'Delayed',  itemStyle: { color: '#C23636' } },
    ],
  }],
});

/** Radar chart: section health (inverted delay %) */
export const getSectionRadarOption = (isDark: boolean) => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'item',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textStyle: { color: isDark ? '#e5e7eb' : '#0F2C5C', fontSize: 11 },
  },
  radar: {
    indicator: SECTION_DELAY_STATS.map(s => ({
      name: s.section,
      max: 100,
    })),
    axisName: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 9 },
    splitLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
    splitArea: { show: false },
    axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
  },
  series: [{
    type: 'radar',
    data: [{
      value: SECTION_DELAY_STATS.map(s => +(100 - s.delayedPct).toFixed(1)),
      name: 'On-Time %',
      areaStyle: { color: 'rgba(47,95,209,0.15)' },
      lineStyle: { color: '#2F5FD1', width: 2 },
      itemStyle: { color: '#2F5FD1' },
    }],
  }],
});

/** Bar chart: weather impact on avg delay */
export const getWeatherImpactOption = (isDark: boolean) => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textStyle: { color: isDark ? '#e5e7eb' : '#0F2C5C', fontSize: 11 },
    formatter: (params: any[]) => {
      const p = params[0];
      return `<b>${p.name}</b><br/>Avg Delay: ${p.value} min`;
    },
  },
  grid: { left: 40, right: 16, top: 12, bottom: 28, containLabel: false },
  xAxis: {
    type: 'category',
    data: WEATHER_IMPACT.map(w => w.label),
    axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
    axisTick: { show: false },
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10, formatter: '{value}m' },
    splitLine: { lineStyle: { color: isDark ? '#1f2937' : '#f1f5f9' } },
  },
  series: [{
    type: 'bar',
    data: WEATHER_IMPACT.map(w => ({
      value: w.avgDelay,
      itemStyle: { color: w.color, borderRadius: [4, 4, 0, 0] },
    })),
    barWidth: '50%',
  }],
});

/** Line chart: on-time % by day of week */
export const getWeeklyLineOption = (isDark: boolean) => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textStyle: { color: isDark ? '#e5e7eb' : '#0F2C5C', fontSize: 11 },
    formatter: (params: any[]) => `<b>${params[0].name}</b><br/>On-Time: ${params[0].value}%`,
  },
  grid: { left: 36, right: 16, top: 12, bottom: 28, containLabel: false },
  xAxis: {
    type: 'category',
    data: WEEKLY_PERFORMANCE.map(d => d.day),
    axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
    axisTick: { show: false },
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
  },
  yAxis: {
    type: 'value',
    min: 48,
    max: 58,
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10, formatter: '{value}%' },
    splitLine: { lineStyle: { color: isDark ? '#1f2937' : '#f1f5f9' } },
  },
  series: [{
    type: 'line',
    smooth: true,
    data: WEEKLY_PERFORMANCE.map(d => d.percentage),
    lineStyle: { color: '#2F5FD1', width: 2.5 },
    itemStyle: { color: '#2F5FD1' },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(47,95,209,0.25)' },
          { offset: 1, color: 'rgba(47,95,209,0)' },
        ],
      },
    },
    symbol: 'circle',
    symbolSize: 6,
  }],
});

/** Horizontal bar: season comparison */
export const getSeasonChartOption = (isDark: boolean) => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textStyle: { color: isDark ? '#e5e7eb' : '#0F2C5C', fontSize: 11 },
    formatter: (params: any[]) => `<b>${params[0].name}</b><br/>Avg Delay: ${params[0].value} min`,
  },
  grid: { left: 64, right: 24, top: 8, bottom: 16, containLabel: false },
  xAxis: {
    type: 'value',
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10, formatter: '{value}m' },
    splitLine: { lineStyle: { color: isDark ? '#1f2937' : '#f1f5f9' } },
  },
  yAxis: {
    type: 'category',
    data: DELAY_BY_SEASON.map(s => s.season),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
  },
  series: [{
    type: 'bar',
    data: DELAY_BY_SEASON.map(s => ({
      value: s.avgDelay,
      itemStyle: { color: s.color, borderRadius: [0, 4, 4, 0] },
    })),
    barWidth: '55%',
  }],
});

/** Horizontal bar: RandomForest feature importance */
export const getFeatureImportanceOption = (isDark: boolean) => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textStyle: { color: isDark ? '#e5e7eb' : '#0F2C5C', fontSize: 11 },
    formatter: (params: any[]) =>
      `<b>${params[0].name}</b><br/>Importance: ${params[0].value}%`,
  },
  grid: { left: 130, right: 48, top: 8, bottom: 8, containLabel: false },
  xAxis: {
    type: 'value',
    max: 35,
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 9, formatter: '{value}%' },
    splitLine: { lineStyle: { color: isDark ? '#1f2937' : '#f1f5f9' } },
  },
  yAxis: {
    type: 'category',
    data: [...FEATURE_IMPORTANCE].reverse().map(f => f.feature),
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
  },
  series: [{
    type: 'bar',
    data: [...FEATURE_IMPORTANCE].reverse().map((f, i) => ({
      value: f.importance,
      itemStyle: {
        color: i >= 8 ? '#2F5FD1' : i >= 5 ? '#8B5CF6' : i >= 2 ? '#F5821F' : '#C23636',
        borderRadius: [0, 3, 3, 0],
      },
    })),
    barWidth: '55%',
    label: {
      show: true,
      position: 'right',
      formatter: (p: any) => `${p.value}%`,
      color: isDark ? '#9ca3af' : '#5B6478',
      fontSize: 9,
    },
  }],
});
