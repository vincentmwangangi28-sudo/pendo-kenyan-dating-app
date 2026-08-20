import React, { useEffect, useState } from 'react';
import {
  authNotificationService,
  AuthNotificationData,
  AuthNotificationType,
} from '../services/authNotificationService';
import {
  AlertTriangle,
  WifiOff,
  ShieldAlert,
  CheckCircle2,
  Info,
  X,
  RefreshCw,
  Terminal,
  ExternalLink,
} from 'lucide-react';

interface AuthNotificationProps {
  onOpenLogs?: () => void;
}

export const AuthNotification: React.FC<AuthNotificationProps> = ({ onOpenLogs }) => {
  const [notifications, setNotifications] = useState<AuthNotificationData[]>([]);

  useEffect(() => {
    const unsubscribe = authNotificationService.subscribe((list) => {
      setNotifications(list);
    });
    return () => unsubscribe();
  }, []);

  if (notifications.length === 0) return null;

  const getIcon = (type: AuthNotificationType, code?: string) => {
    if (code?.includes('network')) {
      return <WifiOff className="w-5 h-5 text-rose-600 flex-shrink-0" />;
    }
    if (code?.includes('popup') || code?.includes('blocked')) {
      return <ExternalLink className="w-5 h-5 text-amber-600 flex-shrink-0" />;
    }

    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />;
      case 'error':
      default:
        return <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />;
    }
  };

  const getCardStyles = (type: AuthNotificationType) => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-white border-emerald-200/90 text-slate-800 shadow-emerald-500/10',
          accent: 'bg-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          btn: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
        };
      case 'warning':
        return {
          container: 'bg-white border-amber-200/90 text-slate-800 shadow-amber-500/10',
          accent: 'bg-amber-500',
          badge: 'bg-amber-50 text-amber-700 border-amber-200',
          btn: 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200',
        };
      case 'info':
        return {
          container: 'bg-white border-sky-200/90 text-slate-800 shadow-sky-500/10',
          accent: 'bg-sky-500',
          badge: 'bg-sky-50 text-sky-700 border-sky-200',
          btn: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border-sky-200',
        };
      case 'error':
      default:
        return {
          container: 'bg-white border-rose-200/90 text-slate-800 shadow-rose-500/10',
          accent: 'bg-rose-500',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          btn: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
        };
    }
  };

  return (
    <aside
      id="auth-notification-toast-container"
      aria-label="Authentication Alerts"
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] pointer-events-none flex flex-col gap-2.5"
    >
      {notifications.map((item) => {
        const styles = getCardStyles(item.type);

        return (
          <div
            key={item.id}
            id={`auth-toast-${item.id}`}
            role="alert"
            className={`pointer-events-auto w-full rounded-2xl border p-4 shadow-xl transition-all duration-300 transform translate-y-0 backdrop-blur-md relative overflow-hidden animate-in slide-in-from-top-4 fade-in ${styles.container}`}
          >
            {/* Top Indicator Line */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${styles.accent}`} />

            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="mt-0.5">{getIcon(item.type, item.code)}</div>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-sm text-slate-900 tracking-tight">
                    {item.title}
                  </h4>
                  {item.code && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase ${styles.badge}`}
                    >
                      {item.code.replace('auth/', '')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {item.message}
                </p>

                {/* Interactive Action Buttons */}
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  {item.onAction && item.actionText && (
                    <button
                      id={`btn-toast-action-${item.id}`}
                      type="button"
                      onClick={() => {
                        item.onAction?.();
                        authNotificationService.dismiss(item.id);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-2xs ${styles.btn}`}
                    >
                      <RefreshCw size={12} />
                      {item.actionText}
                    </button>
                  )}

                  {/* Logs shortcut */}
                  {(onOpenLogs || item.onOpenLogs) && (
                    <button
                      id={`btn-toast-logs-${item.id}`}
                      type="button"
                      onClick={() => {
                        if (item.onOpenLogs) {
                          item.onOpenLogs();
                        } else if (onOpenLogs) {
                          onOpenLogs();
                        }
                        authNotificationService.dismiss(item.id);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Terminal size={12} className="text-slate-500" />
                      View Logs
                    </button>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                id={`btn-toast-dismiss-${item.id}`}
                type="button"
                onClick={() => authNotificationService.dismiss(item.id)}
                className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 rounded-lg transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </aside>
  );
};
