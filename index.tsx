import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { safeStorage } from './services/storage';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an uncaught exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-rose-100 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 text-3xl mb-4 animate-bounce">
              ❤️
            </div>
            <h1 className="text-2xl font-black text-rose-600 mb-2">Pendo Journey Rescue</h1>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              We encountered a small bump while Loading Pendo. This can happen when third-party components (such as offline database caches or maps) load in sandboxed browser frames.
            </p>
            <div className="w-full bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 mb-6 max-h-32 overflow-y-auto">
              <p className="font-mono text-xs text-rose-700 break-words font-semibold">
                {this.state.error?.message || "Unknown error"}
              </p>
            </div>
            <button 
              onClick={() => {
                safeStorage.clear();
                window.location.reload();
              }}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-2xl py-3 px-4 font-bold transition-all shadow-md active:scale-95"
            >
              Restart Pendo App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

