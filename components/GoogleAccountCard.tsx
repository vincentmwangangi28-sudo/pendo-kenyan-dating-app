import React from 'react';
import { auth, signInWithGoogle, signOut, getCachedAccessToken, getOrCreateGuestUser } from '../services/firebase';
import { googleAuthLogger } from '../services/googleAuthLogger';
import { GoogleAuthButton } from './GoogleAuthButton';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Video,
  LogOut,
  Terminal,
  RefreshCw,
  ExternalLink,
  UserCheck,
} from 'lucide-react';

interface GoogleAccountCardProps {
  onOpenLogs: () => void;
  onRefreshProfile?: () => void;
}

export const GoogleAccountCard: React.FC<GoogleAccountCardProps> = ({
  onOpenLogs,
  onRefreshProfile,
}) => {
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const currentUser = auth.currentUser || getOrCreateGuestUser();
  const meetToken = getCachedAccessToken();

  const handleSwitchAccount = async () => {
    setIsSigningIn(true);
    try {
      googleAuthLogger.info('GOOGLE_AUTH', 'User triggered Google account switch');
      await signInWithGoogle();
      if (onRefreshProfile) onRefreshProfile();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSigningIn(false);
    }
  };

  const isGoogleUser =
    auth.currentUser &&
    !auth.currentUser.isAnonymous &&
    auth.currentUser.providerData.some((p) => p.providerId === 'google.com');

  return (
    <div
      id="card-google-account-integration"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            {/* Google G Logo mini */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#ffffff"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 tracking-tight">
              Google Account & Auth Sync
            </h3>
            <p className="text-[11px] text-slate-500">
              Identity verification, video date scopes & security logging
            </p>
          </div>
        </div>

        <button
          onClick={onOpenLogs}
          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
          title="Open Google Auth & System Logs"
        >
          <Terminal size={13} className="text-slate-600" />
          <span>Logs</span>
        </button>
      </div>

      {/* User Status Info */}
      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt="Google avatar"
              className="w-10 h-10 rounded-full border border-slate-300 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-sm">
              {currentUser?.displayName?.[0] || 'U'}
            </div>
          )}

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-slate-800">
                {currentUser?.displayName || 'Kenyan Dating User'}
              </span>
              {isGoogleUser ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  <CheckCircle2 size={10} /> Google Linked
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-full">
                  Guest / Unlinked
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 block truncate max-w-[200px] sm:max-w-xs">
              {currentUser?.email || 'Anonymous Guest Session'}
            </span>
          </div>
        </div>

        <div>
          {isGoogleUser ? (
            <button
              onClick={handleSwitchAccount}
              disabled={isSigningIn}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs transition-all flex items-center gap-1.5"
            >
              {isSigningIn ? <RefreshCw size={12} className="animate-spin" /> : <UserCheck size={12} />}
              Switch Account
            </button>
          ) : (
            <GoogleAuthButton
              variant="compact"
              text="Link Google"
              onClick={handleSwitchAccount}
              isLoading={isSigningIn}
            />
          )}
        </div>
      </div>

      {/* Permissions / Scopes Status */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
          <div className="min-w-0">
            <span className="font-bold text-[11px] text-slate-800 block">Single Sign-On</span>
            <span className="text-[10px] text-slate-500">Firebase Auth + Google</span>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 flex items-center gap-2">
          <Video size={16} className={meetToken ? "text-purple-600 flex-shrink-0" : "text-slate-400 flex-shrink-0"} />
          <div className="min-w-0">
            <span className="font-bold text-[11px] text-slate-800 block">Google Meet API</span>
            <span className="text-[10px] text-slate-500">{meetToken ? "Authorized" : "On Date Invite"}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
