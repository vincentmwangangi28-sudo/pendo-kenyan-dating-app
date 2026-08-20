import React, { useState, useEffect } from 'react';
import {
  googleAuthLogger,
  GoogleLogEntry,
  LogLevel,
  LogCategory,
} from '../services/googleAuthLogger';
import {
  auth,
  signInWithGoogle,
  signInForGoogleMeet,
  signOut,
  getCachedAccessToken,
} from '../services/firebase';
import { authNotificationService } from '../services/authNotificationService';
import {
  X,
  Shield,
  Activity,
  Terminal,
  Download,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Search,
  Filter,
  ExternalLink,
  Lock,
  Key,
  Database,
  Video,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface GoogleLogsViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleLogsViewer: React.FC<GoogleLogsViewerProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<GoogleLogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'account' | 'diagnostics'>('logs');

  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = googleAuthLogger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUser = auth.currentUser;
  const meetToken = getCachedAccessToken();

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (filterCategory !== 'ALL' && log.category !== filterCategory) return false;
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(term);
      const matchCat = log.category.toLowerCase().includes(term);
      const matchDetails = log.details
        ? JSON.stringify(log.details).toLowerCase().includes(term)
        : false;
      return matchMsg || matchCat || matchDetails;
    }
    return true;
  });

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(googleAuthLogger.exportLogsJson());
    setCopiedId('all_logs');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopySingle = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadLogs = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(googleAuthLogger.exportLogsJson());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `pendo-google-logs-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleTestToken = async () => {
    setIsRefreshingToken(true);
    try {
      googleAuthLogger.info('GOOGLE_MEET', 'Manually testing Google OAuth token refresh...');
      await signInForGoogleMeet();
      googleAuthLogger.success('GOOGLE_MEET', 'Google token verified successfully!');
    } catch (err: any) {
      googleAuthLogger.error('GOOGLE_MEET', 'Google token test failed', { error: err?.message || err });
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const getBadgeForLevel = (level: LogLevel) => {
    switch (level) {
      case 'SUCCESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'ERROR':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'WARN':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DEBUG':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  return (
    <div
      id="modal-google-logs-viewer"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-rose-500 flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-tight">Google Logging & Auth Console</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Live Diagnostics
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inspect Google Sign-Ins, OAuth Tokens, Firebase Sync & Security Events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Close Console"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between bg-slate-100/90 border-b border-slate-200 px-4 py-2 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal size={14} />
              Event Stream ({filteredLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'account'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock size={14} />
              Google Account & Scopes
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'diagnostics'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity size={14} />
              Auth Health & Tests
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[11px] font-medium flex items-center gap-1 shadow-2xs"
              title="Copy JSON to Clipboard"
            >
              {copiedId === 'all_logs' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              {copiedId === 'all_logs' ? 'Copied' : 'Copy All'}
            </button>
            <button
              onClick={handleDownloadLogs}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-md text-[11px] font-medium flex items-center gap-1 shadow-2xs"
              title="Export Log File"
            >
              <Download size={13} />
              Export
            </button>
            <button
              onClick={() => googleAuthLogger.clear()}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-[11px] font-medium flex items-center gap-1"
              title="Clear all log entries"
            >
              <Trash2 size={13} />
              Clear
            </button>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {activeTab === 'logs' && (
            <div className="space-y-3">
              {/* Search & Filter Bar */}
              <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search logs by keyword, email, UID, or error..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Level Filter */}
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Levels</option>
                  <option value="SUCCESS">Success</option>
                  <option value="INFO">Info</option>
                  <option value="WARN">Warnings</option>
                  <option value="ERROR">Errors</option>
                  <option value="DEBUG">Debug</option>
                </select>

                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
                >
                  <option value="ALL">All Categories</option>
                  <option value="GOOGLE_AUTH">Google Auth</option>
                  <option value="GOOGLE_OAUTH">Google OAuth</option>
                  <option value="GOOGLE_MEET">Google Meet</option>
                  <option value="FIRESTORE">Firestore Sync</option>
                  <option value="SECURITY">Security</option>
                  <option value="SESSION">Session</option>
                </select>
              </div>

              {/* Log List */}
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">
                  <Terminal size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No matching Google log entries found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your filters or triggering a Google sign-in action
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-colors font-mono text-xs"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getBadgeForLevel(
                              entry.level
                            )}`}
                          >
                            {entry.level}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {entry.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{entry.timeFormatted}</span>
                          <button
                            onClick={() =>
                              handleCopySingle(
                                entry.id,
                                JSON.stringify(entry, null, 2)
                              )
                            }
                            className="text-slate-400 hover:text-slate-700 p-0.5"
                            title="Copy log entry"
                          >
                            {copiedId === entry.id ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="text-slate-800 font-medium break-words">
                        {entry.message}
                      </div>

                      {entry.details && (
                        <div className="mt-2 p-2 bg-slate-900 text-emerald-400 rounded-lg text-[11px] overflow-x-auto">
                          <pre className="whitespace-pre-wrap leading-tight">
                            {typeof entry.details === 'object'
                              ? JSON.stringify(entry.details, null, 2)
                              : String(entry.details)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              {/* Account Status Card */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-4">
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Google User'}
                      className="w-14 h-14 rounded-full border-2 border-rose-500 object-cover shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                      {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'G'}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-base text-slate-800 truncate">
                        {currentUser?.displayName || 'Active Session User'}
                      </h4>
                      {currentUser?.isAnonymous ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                          Guest / Anonymous
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <CheckCircle2 size={10} /> Google Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {currentUser?.email || 'No email associated with this guest session'}
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 mt-1">
                      UID: {currentUser?.uid || 'Not Authenticated'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 font-medium block">Provider</span>
                    <span className="font-bold text-slate-700">
                      {currentUser?.providerData?.[0]?.providerId || 'firebase/anonymous'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 font-medium block">Email Verified</span>
                    <span className={`font-bold ${currentUser?.emailVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {currentUser?.emailVerified ? 'Yes (Verified)' : 'Unverified / Guest'}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-400 font-medium block">Google Meet Token</span>
                    <span className={`font-bold ${meetToken ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {meetToken ? 'Active & Ready' : 'Not Requested Yet'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scopes & Permissions */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                  <Key size={16} className="text-blue-600" />
                  Authorized Google Scopes & APIs
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800">Google Basic Profile & OpenID</span>
                      <p className="text-[11px] text-slate-500">profile, email, openid</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                      Granted
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="font-bold text-slate-800">Google Meet REST API</span>
                      <p className="text-[11px] text-slate-500">
                        meetings.space.created, meetings.space.readonly
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        meetToken
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {meetToken ? 'Active' : 'On-Demand'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <h4 className="font-bold text-sm text-slate-800 mb-2">Google Auth Diagnostic Actions</h4>
                <p className="text-xs text-slate-500 mb-4">
                  Run live tests to verify Google Authentication, token acquisition, and database logging integrity.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      googleAuthLogger.info('GOOGLE_AUTH', 'Initiating test Google Sign-in flow');
                      try {
                        await signInWithGoogle();
                      } catch (e) {
                        // Handled in logger
                      }
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
                  >
                    <span className="font-bold text-xs text-slate-800 block">Trigger Google Login Popup</span>
                    <span className="text-[11px] text-slate-500">
                      Tests Google authentication popup and credential extraction
                    </span>
                  </button>

                  <button
                    onClick={handleTestToken}
                    disabled={isRefreshingToken}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors disabled:opacity-50"
                  >
                    <span className="font-bold text-xs text-slate-800 block flex items-center gap-1.5">
                      {isRefreshingToken && <RefreshCw size={12} className="animate-spin" />}
                      Test Google Meet Token
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Acquires or refreshes the Google Meet OAuth access token
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      googleAuthLogger.info('SECURITY', 'Security self-check executed', {
                        cookiesEnabled: navigator.cookieEnabled,
                        storageEnabled: !!window.localStorage,
                        online: navigator.onLine,
                        protocol: window.location.protocol,
                      });
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
                  >
                    <span className="font-bold text-xs text-slate-800 block">Run Client Security Check</span>
                    <span className="text-[11px] text-slate-500">
                      Verifies client-side environment for Google OAuth popups
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      googleAuthLogger.info('SESSION', 'Writing synthetic test log entry', {
                        syntheticId: Math.random().toString(36),
                        randomValue: Math.floor(Math.random() * 1000),
                      });
                    }}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors"
                  >
                    <span className="font-bold text-xs text-slate-800 block">Write Synthetic Log</span>
                    <span className="text-[11px] text-slate-500">
                      Pushes a sample telemetry event into the Google Log Stream
                    </span>
                  </button>
                </div>

                {/* Simulated Error Feedback Toasts */}
                <div className="mt-5 pt-4 border-t border-slate-200">
                  <h5 className="font-bold text-xs text-slate-700 mb-2">Simulate Auth Notification Toasts</h5>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Test the dedicated AuthNotification toast component with specific error scenarios:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        authNotificationService.handleAuthError({
                          code: 'auth/popup-closed-by-user',
                          message: 'The popup has been closed by the user before finalizing the operation.',
                        }, {
                          retryAction: () => signInWithGoogle(),
                        });
                      }}
                      className="p-2.5 bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 rounded-xl text-left transition-colors"
                    >
                      <span className="font-bold text-[11px] text-amber-900 block">popup-closed-by-user</span>
                      <span className="text-[10px] text-amber-700">Trigger cancelled popup warning toast</span>
                    </button>

                    <button
                      onClick={() => {
                        authNotificationService.handleAuthError({
                          code: 'auth/network-request-failed',
                          message: 'A network error (such as timeout, interrupted connection or unreachable host) has occurred.',
                        }, {
                          retryAction: () => signInWithGoogle(),
                        });
                      }}
                      className="p-2.5 bg-rose-50/70 hover:bg-rose-100/70 border border-rose-200 rounded-xl text-left transition-colors"
                    >
                      <span className="font-bold text-[11px] text-rose-900 block">network-request-failed</span>
                      <span className="text-[10px] text-rose-700">Trigger offline/network failure toast</span>
                    </button>

                    <button
                      onClick={() => {
                        authNotificationService.handleAuthError({
                          code: 'auth/popup-blocked',
                          message: 'Unable to establish a connection with the popup. It may have been blocked by the browser.',
                        }, {
                          retryAction: () => signInWithGoogle(),
                        });
                      }}
                      className="p-2.5 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200 rounded-xl text-left transition-colors"
                    >
                      <span className="font-bold text-[11px] text-purple-900 block">popup-blocked</span>
                      <span className="text-[10px] text-purple-700">Trigger browser popup blocked toast</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Logger Status: Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
