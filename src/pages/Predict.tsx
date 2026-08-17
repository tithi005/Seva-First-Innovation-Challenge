import React, { useEffect, useRef, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  WifiOff,
  FlaskConical,
  ChevronRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PredictResult {
  is_delayed:          boolean;
  confidence:          number;
  delay_probability:   number;
  predicted_delay_min: number;
  threshold_min:       number;
  model_used:          string;
}

interface EvalMetrics {
  confusion_matrix: { tn: number; fp: number; fn: number; tp: number };
  roc:              { points: { fpr: number; tpr: number }[]; auc: number };
  metrics:          { accuracy: number; precision: number; recall: number; f1: number; test_size: number };
}

interface FormState {
  train_type:               string;
  priority:                 number;
  section_id:               string;
  day_of_week:              number;
  time_of_day_bucket:       string;
  season:                   string;
  upstream_delay_min:       number;
  section_congestion_level: number;
  weather_flag:             number;
  track_type:               string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = 'http://localhost:8000';

const SECTIONS  = ['HWH-BLY','BLY-BDC','BDC-SHE','SHE-SKG','SKG-MMR','MMR-BWN','BWN-GUS','GUS-PAN'];
const DAYS      = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SEASONS   = ['Summer','Spring','Monsoon','Winter'];
const TIME_BUCKETS = ['Peak','Off-peak','Night'];
const WEATHER_LABELS: Record<number, string> = { 0: 'Clear', 1: 'Moderate', 2: 'Severe' };
const TRAIN_TYPES = ['Express','Passenger','Suburban','Freight'];

// Top 3 feature weights for per-prediction explanation
const FEATURE_WEIGHTS = [
  { key: 'weather_flag',             label: 'Weather Condition', weight: 31.80 },
  { key: 'upstream_delay_min',       label: 'Upstream Delay',    weight: 24.47 },
  { key: 'section_congestion_level', label: 'Section Congestion',weight: 15.65 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const useDarkMode = () => {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains('dark'))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
};

const featureContribution = (form: FormState): { label: string; value: string; contrib: number }[] => [
  {
    label: 'Weather',
    value: WEATHER_LABELS[form.weather_flag],
    contrib: (form.weather_flag / 2) * 31.80,
  },
  {
    label: 'Upstream Delay',
    value: `${form.upstream_delay_min} min`,
    contrib: Math.min(form.upstream_delay_min / 20, 1) * 24.47,
  },
  {
    label: 'Section Congestion',
    value: `${Math.round(form.section_congestion_level * 100)}%`,
    contrib: form.section_congestion_level * 15.65,
  },
].sort((a, b) => b.contrib - a.contrib);

// ── EChart options ────────────────────────────────────────────────────────────
const getCMOption = (cm: EvalMetrics['confusion_matrix'], isDark: boolean) => {
  const { tn, fp, fn, tp } = cm;
  const maxVal = Math.max(tn, fp, fn, tp);
  const data = [
    [0, 1, tn],  // Predicted On-Time, Actual On-Time
    [1, 1, fp],  // Predicted Delayed, Actual On-Time
    [0, 0, fn],  // Predicted On-Time, Actual Delayed
    [1, 0, tp],  // Predicted Delayed, Actual Delayed
  ];
  return {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: (p: any) => {
        const labels = ['Actual Delayed','Actual On-Time'];
        const preds  = ['Pred On-Time','Pred Delayed'];
        return `${labels[p.data[1]]} / ${preds[p.data[0]]}<br/><b>${p.data[2].toLocaleString()}</b>`;
      },
    },
    grid: { top: 8, bottom: 52, left: 90, right: 8, containLabel: false },
    xAxis: {
      type: 'category',
      data: ['Pred On-Time', 'Pred Delayed'],
      axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
      axisLine: { lineStyle: { color: isDark ? '#374151' : '#e5e7eb' } },
    },
    yAxis: {
      type: 'category',
      data: ['Actual Delayed', 'Actual On-Time'],
      axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    visualMap: {
      min: 0, max: maxVal,
      calculable: false,
      show: false,
      inRange: { color: isDark
        ? ['#1f2937', '#1d4ed8']
        : ['#eff6ff', '#1d4ed8'] },
    },
    series: [{
      type: 'heatmap',
      data,
      label: {
        show: true,
        formatter: (p: any) => p.data[2].toLocaleString(),
        color: isDark ? '#e5e7eb' : '#0F2C5C',
        fontSize: 11,
        fontWeight: 'bold',
        fontFamily: 'monospace',
      },
    }],
  };
};

const getROCOption = (roc: EvalMetrics['roc'], isDark: boolean) => ({
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: isDark ? '#1f2937' : '#fff',
    borderColor: isDark ? '#374151' : '#e5e7eb',
    textStyle: { color: isDark ? '#e5e7eb' : '#0F2C5C', fontSize: 11 },
    formatter: (params: any[]) =>
      `FPR: ${params[0].data[0]}<br/>TPR: ${params[0].data[1]}`,
  },
  grid: { top: 12, bottom: 36, left: 40, right: 12, containLabel: false },
  xAxis: {
    type: 'value', min: 0, max: 1, name: 'FPR',
    nameLocation: 'middle', nameGap: 24,
    nameTextStyle: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 9 },
    splitLine: { lineStyle: { color: isDark ? '#1f2937' : '#f1f5f9' } },
  },
  yAxis: {
    type: 'value', min: 0, max: 1, name: 'TPR',
    nameLocation: 'middle', nameGap: 32,
    nameTextStyle: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
    axisLabel: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 9 },
    splitLine: { lineStyle: { color: isDark ? '#1f2937' : '#f1f5f9' } },
  },
  series: [
    {
      name: `ROC (AUC=${roc.auc})`,
      type: 'line',
      data: roc.points.map(p => [p.fpr, p.tpr]),
      lineStyle: { color: '#2F5FD1', width: 2.5 },
      itemStyle: { color: '#2F5FD1' },
      showSymbol: false,
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(47,95,209,0.20)' },
            { offset: 1, color: 'rgba(47,95,209,0)' },
          ],
        },
      },
    },
    {
      name: 'Random',
      type: 'line',
      data: [[0, 0], [1, 1]],
      lineStyle: { color: isDark ? '#4b5563' : '#d1d5db', type: 'dashed', width: 1.5 },
      showSymbol: false,
    },
  ],
  legend: {
    bottom: 0,
    textStyle: { color: isDark ? '#9ca3af' : '#5B6478', fontSize: 10 },
    icon: 'roundRect',
  },
});

// ── Input components ──────────────────────────────────────────────────────────
const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-[11px] font-mono uppercase tracking-wider text-[#5B6478] dark:text-gray-400">
    {children}
  </label>
);

const inputCls = "mt-1 w-full bg-white dark:bg-[#1f2937] border border-[rgba(15,44,92,0.15)] dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-[#0F2C5C] dark:text-gray-200 focus:outline-none focus:border-[#2F5FD1] dark:focus:border-sky-400 transition-colors";

// ── Main Component ────────────────────────────────────────────────────────────
export const Predict: React.FC = () => {
  const isDark = useDarkMode();

  const [form, setForm] = useState<FormState>({
    train_type:               'Express',
    priority:                 1,
    section_id:               'BWN-GUS',
    day_of_week:              1,
    time_of_day_bucket:       'Peak',
    season:                   'Monsoon',
    upstream_delay_min:       5,
    section_congestion_level: 0.70,
    weather_flag:             1,
    track_type:               'Double',
  });

  const [result,      setResult]      = useState<PredictResult | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [apiError,    setApiError]    = useState<string | null>(null);
  const [evalMetrics, setEvalMetrics] = useState<EvalMetrics | null>(null);

  // Derive is_weekend from day_of_week
  const isWeekend = form.day_of_week >= 6 ? 1 : 0;

  // Fetch eval metrics on mount
  useEffect(() => {
    fetch(`${API_BASE}/eval-metrics`)
      .then(r => r.json())
      .then(setEvalMetrics)
      .catch(() => {}); // silently fail — shown as "API not running"
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, is_weekend: isWeekend }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Prediction failed');
      }
      const data: PredictResult = await res.json();
      setResult(data);
    } catch (err: any) {
      if (err.message?.includes('fetch')) {
        setApiError('API not reachable. Start with: uvicorn api.main:app --reload --port 8000');
      } else {
        setApiError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const contributions = featureContribution(form);

  return (
    <div className="space-y-8 max-w-7xl pb-10">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 pb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-[#0F2C5C] dark:text-white tracking-tight transition-colors flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-[#2F5FD1] dark:text-sky-400" />
            ML Inference
          </h1>
          <span className="font-mono text-[11px] text-[#5B6478] dark:text-gray-400 uppercase tracking-wider">
            Live model prediction
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-[#2F5FD1] dark:text-sky-400 bg-[#2F5FD1]/10 border border-[#2F5FD1]/20 px-2 py-1 rounded">
            RandomForest · 87.17% acc
          </span>
          <span className="font-mono text-[10px] text-[#8B5CF6] dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40 px-2 py-1 rounded">
            HistGradientBoosting · MAE 1.59 min
          </span>
        </div>
      </div>

      {/* ── Two-Column: Form + Result ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: Input Form ──────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937] flex items-center gap-2">
            <Brain className="w-3.5 h-3.5 text-[#0F2C5C] dark:text-sky-400" />
            <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">
              Input Parameters — 11 Features
            </h3>
          </div>

          <div className="p-5 space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Train Type</Label>
                <select
                  className={inputCls}
                  value={form.train_type}
                  onChange={e => setForm(f => ({ ...f, train_type: e.target.value }))}
                >
                  {TRAIN_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>Priority Level</Label>
                <select
                  className={inputCls}
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))}
                >
                  <option value={1}>1 — Express</option>
                  <option value={2}>2 — Normal</option>
                  <option value={3}>3 — Freight</option>
                </select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Section ID</Label>
                <select
                  className={inputCls}
                  value={form.section_id}
                  onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
                >
                  {SECTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Track Type</Label>
                <select
                  className={inputCls}
                  value={form.track_type}
                  onChange={e => setForm(f => ({ ...f, track_type: e.target.value }))}
                >
                  <option>Double</option>
                  <option>Single</option>
                </select>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Day of Week</Label>
                <select
                  className={inputCls}
                  value={form.day_of_week}
                  onChange={e => setForm(f => ({ ...f, day_of_week: +e.target.value }))}
                >
                  {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label>Time of Day</Label>
                <select
                  className={inputCls}
                  value={form.time_of_day_bucket}
                  onChange={e => setForm(f => ({ ...f, time_of_day_bucket: e.target.value }))}
                >
                  {TIME_BUCKETS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Season</Label>
                <select
                  className={inputCls}
                  value={form.season}
                  onChange={e => setForm(f => ({ ...f, season: e.target.value }))}
                >
                  {SEASONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <Label>Weather Condition</Label>
                <select
                  className={inputCls}
                  value={form.weather_flag}
                  onChange={e => setForm(f => ({ ...f, weather_flag: +e.target.value }))}
                >
                  <option value={0}>0 — Clear</option>
                  <option value={1}>1 — Moderate</option>
                  <option value={2}>2 — Severe</option>
                </select>
              </div>
            </div>

            {/* Upstream Delay */}
            <div>
              <div className="flex justify-between items-center">
                <Label>Upstream Delay (min)</Label>
                <span className="font-mono text-xs text-[#0F2C5C] dark:text-white font-bold">
                  {form.upstream_delay_min} min
                </span>
              </div>
              <input
                type="range"
                min={0} max={36} step={0.5}
                value={form.upstream_delay_min}
                onChange={e => setForm(f => ({ ...f, upstream_delay_min: +e.target.value }))}
                className="mt-1.5 w-full accent-[#2F5FD1]"
              />
              <div className="flex justify-between text-[9px] font-mono text-[#5B6478] dark:text-gray-500 mt-0.5">
                <span>0 min</span><span>36 min</span>
              </div>
            </div>

            {/* Section Congestion */}
            <div>
              <div className="flex justify-between items-center">
                <Label>Section Congestion Level</Label>
                <span className={`font-mono text-xs font-bold ${
                  form.section_congestion_level > 0.7 ? 'text-[#C23636]' :
                  form.section_congestion_level > 0.4 ? 'text-[#F5821F]' : 'text-[#1E7F4F]'
                }`}>
                  {Math.round(form.section_congestion_level * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0} max={1} step={0.01}
                value={form.section_congestion_level}
                onChange={e => setForm(f => ({ ...f, section_congestion_level: +e.target.value }))}
                className="mt-1.5 w-full accent-[#2F5FD1]"
              />
              <div className="flex justify-between text-[9px] font-mono text-[#5B6478] dark:text-gray-500 mt-0.5">
                <span>0%</span><span>100%</span>
              </div>
            </div>

            {/* Derived field */}
            <div className="flex items-center gap-2 text-[11px] text-[#5B6478] dark:text-gray-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-[rgba(15,44,92,0.06)] dark:border-white/5">
              <span className="font-mono">is_weekend</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-mono font-bold text-[#0F2C5C] dark:text-white">
                {isWeekend} (auto-derived from day)
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0F2C5C] hover:bg-[#1a3d7c] active:bg-[#0a1e3f] dark:bg-[#2F5FD1] dark:hover:bg-[#2351b8] text-white font-mono text-xs font-bold uppercase tracking-widest rounded-lg flex items-center justify-center gap-2.5 transition-all shadow-md disabled:opacity-60"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Running Inference…</>
                : <><Zap className="w-4 h-4" /> Run Inference</>
              }
            </button>
          </div>
        </form>

        {/* ── Right: Result Panel ──────────────────────────────────────── */}
        <div className="space-y-4">

          {/* API Error */}
          {apiError && (
            <div className="bg-white dark:bg-[#111827] border border-[#C23636]/30 rounded-xl p-5 flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-[#C23636] dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-[#C23636] dark:text-red-400 mb-1">API Not Reachable</div>
                <p className="text-xs text-[#5B6478] dark:text-gray-400 leading-relaxed">{apiError}</p>
                <div className="mt-3 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-[#0F2C5C] dark:text-gray-200 px-3 py-2 rounded-lg">
                  uvicorn api.main:app --reload --port 8000
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && !apiError && !loading && (
            <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
              <FlaskConical className="w-8 h-8 text-[#5B6478] dark:text-gray-500" />
              <div className="text-sm font-semibold text-[#5B6478] dark:text-gray-400">
                Set parameters and click Run Inference
              </div>
              <div className="text-xs text-[#5B6478] dark:text-gray-500 max-w-xs">
                The RandomForest classifier predicts delay status; the regressor estimates the delay magnitude.
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <>
              {/* Main prediction banner */}
              <div className={`rounded-xl border p-5 ${
                result.is_delayed
                  ? 'bg-red-50 dark:bg-red-950/20 border-[#C23636]/30'
                  : 'bg-emerald-50 dark:bg-emerald-950/20 border-[#1E7F4F]/30'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  {result.is_delayed
                    ? <AlertTriangle className="w-6 h-6 text-[#C23636] dark:text-red-400 shrink-0" />
                    : <CheckCircle2 className="w-6 h-6 text-[#1E7F4F] dark:text-emerald-400 shrink-0" />
                  }
                  <div>
                    <div className={`text-xl font-bold font-mono ${
                      result.is_delayed ? 'text-[#C23636] dark:text-red-400' : 'text-[#1E7F4F] dark:text-emerald-400'
                    }`}>
                      {result.is_delayed ? '⚠ DELAYED' : '✓ ON TIME'}
                    </div>
                    <div className="text-[11px] text-[#5B6478] dark:text-gray-400">
                      RandomForest Classifier · P(delayed) = {result.delay_probability}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 text-center">
                    <div className="font-mono text-lg font-bold text-[#0F2C5C] dark:text-white">
                      {result.confidence}%
                    </div>
                    <div className="text-[10px] text-[#5B6478] dark:text-gray-400 uppercase font-mono">Confidence</div>
                  </div>
                  <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 text-center">
                    <div className={`font-mono text-lg font-bold ${
                      result.is_delayed ? 'text-[#C23636] dark:text-red-400' : 'text-[#1E7F4F] dark:text-emerald-400'
                    }`}>
                      {result.is_delayed ? `+${result.predicted_delay_min}` : result.predicted_delay_min} min
                    </div>
                    <div className="text-[10px] text-[#5B6478] dark:text-gray-400 uppercase font-mono">Pred. Delay</div>
                  </div>
                  <div className="bg-white/60 dark:bg-black/20 rounded-lg p-3 text-center">
                    <div className="font-mono text-lg font-bold text-[#0F2C5C] dark:text-white">
                      {result.threshold_min} min
                    </div>
                    <div className="text-[10px] text-[#5B6478] dark:text-gray-400 uppercase font-mono">Threshold</div>
                  </div>
                </div>
              </div>

              {/* Top contributing features */}
              <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#5B6478] dark:text-gray-400 mb-3">
                  Top Factors for This Prediction
                </div>
                <div className="space-y-3">
                  {contributions.map((c, i) => (
                    <div key={c.label} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[#5B6478] dark:text-gray-500 w-4 text-center">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-[#0F2C5C] dark:text-gray-200">{c.label}</span>
                          <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-400">{c.value}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#2F5FD1] transition-all duration-700"
                            style={{ width: `${Math.min((c.contrib / 35) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-[#5B6478] dark:text-gray-400 w-10 text-right">
                        {c.contrib.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[rgba(15,44,92,0.06)] dark:border-white/5 text-[10px] text-[#5B6478] dark:text-gray-500 font-mono">
                  Contribution = feature_value × RF_importance_weight
                </div>
              </div>

              {/* Model labels */}
              <div className="text-[10px] text-[#5B6478] dark:text-gray-500 font-mono px-1">
                {result.model_used}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Model Evaluation ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6478] dark:text-gray-400 transition-colors">
          Model Evaluation — 10,000 Test Samples (20% Hold-out Split)
        </div>

        {!evalMetrics ? (
          <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-8 text-center text-xs text-[#5B6478] dark:text-gray-400 font-mono">
            Evaluation metrics load from API. Start the server to view them.
          </div>
        ) : (
          <>
            {/* Metric summary pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Accuracy',  value: `${evalMetrics.metrics.accuracy}%`,  color: '#1E7F4F' },
                { label: 'Precision', value: `${evalMetrics.metrics.precision}%`, color: '#2F5FD1' },
                { label: 'Recall',    value: `${evalMetrics.metrics.recall}%`,    color: '#8B5CF6' },
                { label: 'F1 Score',  value: `${evalMetrics.metrics.f1}%`,        color: '#F5821F' },
              ].map(m => (
                <div key={m.label} className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl p-3 text-center shadow-sm">
                  <div className="font-mono text-base font-bold" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-[10px] font-mono uppercase text-[#5B6478] dark:text-gray-400 mt-0.5">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Confusion Matrix */}
              <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937]">
                  <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">Confusion Matrix</h3>
                  <div className="text-[10px] text-[#5B6478] dark:text-gray-400 font-mono mt-0.5">
                    TN={evalMetrics.confusion_matrix.tn.toLocaleString()} · FP={evalMetrics.confusion_matrix.fp.toLocaleString()} · FN={evalMetrics.confusion_matrix.fn.toLocaleString()} · TP={evalMetrics.confusion_matrix.tp.toLocaleString()}
                  </div>
                </div>
                <div className="p-4">
                  <ReactECharts
                    option={getCMOption(evalMetrics.confusion_matrix, isDark)}
                    style={{ height: 200 }}
                    opts={{ renderer: 'canvas' }}
                  />
                </div>
              </div>

              {/* ROC Curve */}
              <div className="bg-white dark:bg-[#111827] border border-[rgba(15,44,92,0.10)] dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-[rgba(15,44,92,0.08)] dark:border-white/10 bg-[#F8F9FB] dark:bg-[#1f2937]">
                  <h3 className="text-xs font-bold text-[#0F2C5C] dark:text-white uppercase tracking-wider">ROC Curve</h3>
                  <div className="text-[10px] text-[#5B6478] dark:text-gray-400 font-mono mt-0.5">
                    AUC = {evalMetrics.roc.auc} · {evalMetrics.metrics.test_size.toLocaleString()} test samples
                  </div>
                </div>
                <div className="p-4">
                  <ReactECharts
                    option={getROCOption(evalMetrics.roc, isDark)}
                    style={{ height: 200 }}
                    opts={{ renderer: 'canvas' }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
};
