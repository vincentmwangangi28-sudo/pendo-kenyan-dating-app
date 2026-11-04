import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, Smartphone, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'badge' | 'banner' | 'button';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'badge',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed, hide prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If not installable and not iOS, don't render empty clutter unless banner style is requested
  if (!isInstallable && !isIOS) {
    return null;
  }

  if (variant === 'banner') {
    return (
      <>
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 p-3.5 text-white shadow-lg ${className}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black tracking-tight">Install Pendo Kenya App</p>
                <p className="text-[10px] text-rose-100/90 leading-tight">Instant voice lounges, M-Pesa gifts & offline access</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 shrink-0 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-rose-600 shadow-sm transition hover:bg-rose-50 active:scale-95 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isIOS ? 'Install' : 'Add App'}</span>
            </button>
          </div>
        </div>

        {/* iOS Step Guide Modal */}
        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-slate-800 animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                    <Smartphone size={16} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Install Pendo on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-3.5 space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">1</span>
                  <p>Tap the <strong className="text-slate-900 flex items-center gap-1 inline-flex"><Share size={12} /> Share</strong> button in your Safari bottom toolbar.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">2</span>
                  <p>Scroll down the share options and tap <strong className="text-slate-900">Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">3</span>
                  <p>Tap <strong className="text-rose-600">Add</strong> in top right to launch Pendo like a native iOS app!</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Compact badge for header navigation
  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-bold text-rose-700 shadow-xs hover:bg-rose-100 transition active:scale-95 cursor-pointer ${className}`}
        title="Install Pendo Web App on your phone"
      >
        <Download className="h-3 w-3 text-rose-600" />
        <span>{isIOS ? 'Install' : 'Get App'}</span>
      </button>

      {/* iOS Step Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl text-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                  <Smartphone size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Install Pendo on iOS</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3.5 space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">1</span>
                <p>Tap <strong className="text-slate-900 inline-flex items-center gap-1"><Share size={12} /> Share</strong> in the Safari bottom bar.</p>
              </div>
              <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">2</span>
                <p>Choose <strong className="text-slate-900">Add to Home Screen</strong>.</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
