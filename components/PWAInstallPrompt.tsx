import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';
import { isIOS } from '../utils/deviceDetection';
import { TranslateFn } from '../types';

export const PWAInstallPrompt: React.FC<{ t: TranslateFn }> = ({ t }) => {
  const { isInstallable, install } = usePWA();
  const [isVisible, setIsVisible] = useState(true);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOSDevice(isIOS());
    // Check if already running in standalone mode (installed)
    const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(isInStandalone);

    // iOS-specific: Don't show install prompt immediately to prevent conflicts
    if (isIOS() && !isInStandalone) {
      // Delay PWA prompt on iOS to prevent interference with initial load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Don't show anything if already installed or dismissed
  if (isStandalone || !isVisible) return null;

  // 1. Android / Desktop Chrome (Automatic Install Button)
  if (isInstallable) {
    return (
      <div className="fixed bottom-24 left-4 right-4 z-[50] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-4 border border-slate-700">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 p-2.5 rounded-xl">
            <Download size={24} className="text-white" />
          </div>
          <div>
            <h4 className="font-bold text-sm">{t('installApp')}</h4>
            <p className="text-xs text-slate-400">{t('installAppDesc')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={install}
            className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            {t('install')}
          </button>
          <button 
            onClick={() => setIsVisible(false)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  // 2. iOS Safari Instructions (Manual Add)
  if (isIOSDevice) {
    return (
      <div className="fixed bottom-6 left-4 right-4 z-[50] bg-slate-900/95 backdrop-blur text-white p-5 rounded-2xl shadow-2xl border border-slate-700 animate-in slide-in-from-bottom-4 pb-8">
        <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white bg-white/5 rounded-full"
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-4">
             <div className="bg-indigo-600 p-3 rounded-xl shrink-0">
                 <PlusSquare size={24} className="text-white" />
             </div>
             <div>
                 <h4 className="font-bold text-sm mb-1">Install SnapifY for iOS</h4>
                 <p className="text-xs text-slate-300 leading-relaxed">
                    Tap the <span className="inline-flex items-center font-bold text-blue-400"><Share size={12} className="mx-1" /> Share</span> button in your browser menu bar, then scroll down and select <span className="font-bold text-white">"Add to Home Screen"</span>.
                 </p>
             </div>
        </div>
        {/* Triangle pointing down to the safari bottom bar */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-900 border-b border-r border-slate-700 transform rotate-45"></div>
      </div>
    );
  }

  return null;
};