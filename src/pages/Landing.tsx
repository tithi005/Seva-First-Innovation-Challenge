import React, { useState, useEffect } from 'react';
import { Sun, Moon, ArrowRight, X } from 'lucide-react';

interface LandingProps {
  onNavigateLogin?: () => void;
}

export const Landing: React.FC<LandingProps> = ({ onNavigateLogin }) => {
  const [isDark, setIsDark] = useState(true);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen w-full relative select-none font-sans bg-white dark:bg-slate-900 transition-colors duration-300 flex flex-col overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 transition-opacity duration-300"
        style={{ backgroundImage: `url('/vande_bharat.jpg')`, opacity: isDark ? 0.6 : 0.8 }}
      />
      
      {/* Dark mode overlay gradient for readability */}
      <div className={`absolute inset-0 z-0 pointer-events-none transition-colors duration-300 ${isDark ? 'bg-gradient-to-r from-black/90 via-black/50 to-transparent' : 'bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent'}`} />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4 lg:px-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200 dark:border-slate-700 shadow-sm transition-colors duration-300 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Amogh Rail Logo" className="h-10 w-auto object-contain drop-shadow-sm" />
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-[0.1em] text-[#0F2C5C] dark:text-white uppercase leading-none">
              AMOGH RAIL
            </span>
            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 tracking-wider uppercase">
              Official AI Control Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 lg:gap-6">
          <div className="hidden md:flex gap-6 text-sm font-semibold text-[#0F2C5C] dark:text-gray-200 uppercase tracking-wider mr-4">
            <button onClick={() => setShowAbout(true)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors outline-none focus:outline-none">ABOUT SYSTEM</button>
          </div>
          
          <button 
            onClick={onNavigateLogin}
            className="text-xs font-bold uppercase tracking-widest px-4 py-2 text-[#0F2C5C] dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors outline-none focus:outline-none"
          >
            Sign In
          </button>
          
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-full bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 transition-colors text-gray-700 dark:text-gray-300 outline-none focus:outline-none"
            title="Toggle Dark Mode"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Model Card Strip — understated, factual */}
      <div className="relative z-10 bg-black/70 dark:bg-black/80 backdrop-blur-sm border-b border-white/10 px-6 lg:px-12 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1 shrink-0">
        <span className="font-mono text-[10px] text-gray-400 uppercase tracking-widest font-semibold">ML Models</span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="font-mono text-[10px] text-white/70">
            Classifier <span className="text-emerald-400 font-bold">87.2% acc</span>
          </span>
          <span className="w-px h-3 bg-white/20 hidden sm:block" />
          <span className="font-mono text-[10px] text-white/70">
            Regressor MAE <span className="text-sky-400 font-bold">1.59 min</span>
          </span>
          <span className="w-px h-3 bg-white/20 hidden sm:block" />
          <span className="font-mono text-[10px] text-white/70">
            R² <span className="text-sky-400 font-bold">0.878</span>
          </span>
          <span className="w-px h-3 bg-white/20 hidden sm:block" />
          <span className="font-mono text-[10px] text-white/70">
            Trained on <span className="text-amber-400 font-bold">50,000</span> records
          </span>
          <span className="w-px h-3 bg-white/20 hidden sm:block" />
          <span className="font-mono text-[10px] text-white/70">
            Threshold <span className="text-white font-bold">&gt;10 min</span>
          </span>
        </div>
      </div>

      {/* Main Content Area - Hero Section */}
      <main className="relative z-10 flex-1 container mx-auto px-6 lg:px-12 py-10 flex flex-col justify-center items-start text-left">
        
        <div className="max-w-3xl space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight drop-shadow-xl">
            Smart decisions, <br className="hidden md:block" />
            <span className="text-blue-400">on time Trains</span>
          </h1>
          
          <p className="text-lg md:text-2xl font-semibold text-gray-200 tracking-wide drop-shadow-lg">
            AI that keeps India's Railways moving
          </p>
          
          <div className="flex flex-col sm:flex-row items-start gap-4 pt-8">
            <button 
              onClick={onNavigateLogin}
              className="w-full sm:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg outline-none focus:outline-none"
            >
              <span>Access Control Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onNavigateLogin}
              className="w-full sm:w-auto h-12 px-8 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white font-bold text-sm uppercase tracking-widest rounded-lg transition-all flex items-center justify-center shadow-lg outline-none focus:outline-none"
            >
              Request Access
            </button>
          </div>
        </div>

      </main>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-md py-4 text-center shrink-0">
         <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-widest">
           Amogh Rail Artificial Intelligence Network © 2026. For Indian Railways.
         </p>
      </footer>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/20 shadow-2xl rounded-3xl p-8 relative animate-in fade-in zoom-in-95 duration-200">
            <button onClick={() => setShowAbout(false)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/10 outline-none focus:outline-none">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-[#0F2C5C] dark:text-white mb-6 uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-4">
              About Amogh Rail
            </h2>
            <div className="space-y-6 text-gray-700 dark:text-gray-300">
              <p className="font-medium text-sm text-[#0F2C5C] dark:text-gray-100 leading-relaxed">
                Amogh Rail uses a two-stage ML pipeline to classify whether a train will be delayed and predict the delay magnitude, trained on 50,000 real journey records across 8 route sections.
              </p>

              {/* Model Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-gray-200 dark:border-white/10 rounded-xl p-4 bg-gray-50 dark:bg-slate-800/50">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">Stage 1 · Classifier</div>
                  <div className="font-bold text-sm text-[#0F2C5C] dark:text-white mb-1">RandomForestClassifier</div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between"><span>Accuracy</span><span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">87.17%</span></div>
                    <div className="flex justify-between"><span>Task</span><span className="font-mono">Binary (delay &gt;10 min)</span></div>
                    <div className="flex justify-between"><span>Features</span><span className="font-mono">11</span></div>
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-white/10 rounded-xl p-4 bg-gray-50 dark:bg-slate-800/50">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-2">Stage 2 · Regressor</div>
                  <div className="font-bold text-sm text-[#0F2C5C] dark:text-white mb-1">HistGradientBoosting</div>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between"><span>MAE</span><span className="font-mono font-bold text-sky-600 dark:text-sky-400">1.59 min</span></div>
                    <div className="flex justify-between"><span>R²</span><span className="font-mono font-bold text-sky-600 dark:text-sky-400">0.878</span></div>
                    <div className="flex justify-between"><span>Task</span><span className="font-mono">Delay magnitude (min)</span></div>
                  </div>
                </div>
              </div>

              {/* Top features */}
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-gray-400 mb-3">Top Delay Drivers (RF Feature Importance)</div>
                <div className="space-y-2">
                  {[
                    { label: 'Weather Condition', pct: 31.8 },
                    { label: 'Upstream Delay', pct: 24.5 },
                    { label: 'Section Congestion', pct: 15.7 },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-3 text-xs">
                      <span className="w-32 text-gray-600 dark:text-gray-400 shrink-0">{f.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2F5FD1] rounded-full" style={{ width: `${(f.pct / 35) * 100}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400 w-10 text-right">{f.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-white/10 pt-4">
                Dataset: 50,000 records · 8 route sections (HWH–BLY to GUS–PAN) · 4 train types · 4 seasons
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
