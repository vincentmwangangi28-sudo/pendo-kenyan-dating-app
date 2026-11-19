import React from 'react';
import { X, Bell, BellRing, Heart, Gift, Calendar, Receipt, CheckCheck, Sparkles } from 'lucide-react';
import { AppNotification, AppView } from '../types';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  pushPermission: NotificationPermission;
  wsConnected: boolean;
  onRequestPush: () => Promise<boolean>;
  onMarkAllRead: () => void;
  onSelectNotification: (item: AppNotification) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  pushPermission,
  wsConnected,
  onRequestPush,
  onMarkAllRead,
  onSelectNotification,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'MATCH':
        return <Heart size={18} className="text-rose-600" />;
      case 'ZAWADI':
        return <Gift size={18} className="text-amber-600" />;
      case 'MEETUP':
        return <Calendar size={18} className="text-emerald-600" />;
      case 'MPESA':
        return <Receipt size={18} className="text-emerald-700" />;
      default:
        return <Sparkles size={18} className="text-indigo-600" />;
    }
  };

  const formatTime = (ts: number) => {
    const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div
      className="fixed inset-0 z-[75] bg-slate-950/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Real-Time Notifications"
    >
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[86vh]">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1 bg-white">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Bell size={18} className="text-rose-600" />
              <span>Pendo Alerts</span>
              {unreadCount > 0 && (
                <span className="text-xs font-mono font-bold tabular-nums text-rose-600">
                  · {unreadCount} new
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {wsConnected ? 'Live stream connected' : 'Synced feed'} · Matches, Zawadi & Meetups
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="min-h-[44px] px-3 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <CheckCheck size={15} className="text-emerald-600" />
                <span>Mark read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close Notifications"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Web Push Opt-In Strip (inside drawer, never an arrival popup) */}
        {pushPermission !== 'granted' && (
          <div className="px-5 py-3 bg-[#FAF8F5] border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">Get instant match & Zawadi alerts</p>
              <p className="text-[11px] text-slate-600 truncate">
                {pushPermission === 'denied'
                  ? 'Browser notifications blocked in site settings'
                  : 'Enable alerts when backgrounded on mobile'}
              </p>
            </div>
            {pushPermission !== 'denied' && (
              <button
                type="button"
                onClick={() => onRequestPush()}
                className="min-h-[44px] px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <BellRing size={14} />
                <span>Enable</span>
              </button>
            )}
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="py-12 px-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No alerts yet</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                New mutual likes, M-Pesa Zawadi receipts, and Vibe Circle meetup RSVPs appear here in real time.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectNotification(item);
                  onClose();
                }}
                className={`w-full min-h-[56px] px-5 py-3.5 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                  item.read ? 'bg-white hover:bg-slate-50' : 'bg-rose-50/45 hover:bg-rose-50/75'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 shrink-0">
                      {formatTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 leading-snug">{item.body}</p>
                  {item.targetView && (
                    <span className="inline-block text-[11px] font-bold text-rose-600 mt-1">
                      {item.targetView === AppView.VIBES ? 'Open Vibe Circles →' : 'Open View →'}
                    </span>
                  )}
                </div>
                {!item.read && (
                  <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-2" aria-label="Unread" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
