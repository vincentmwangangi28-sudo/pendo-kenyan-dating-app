import React from 'react';
import { Loader2 } from 'lucide-react';

interface GoogleAuthButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  text?: string;
  variant?: 'primary' | 'outline' | 'compact';
  className?: string;
  disabled?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onClick,
  isLoading = false,
  text = 'Continue with Google',
  variant = 'primary',
  className = '',
  disabled = false,
}) => {
  const baseClasses =
    'relative inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 select-none shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none';

  const variants = {
    primary:
      'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/80 px-6 py-3.5 text-base w-full max-w-sm',
    outline:
      'bg-white/90 backdrop-blur-md text-slate-800 hover:bg-white border border-white/40 px-5 py-3 text-sm shadow-sm',
    compact:
      'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs rounded-xl shadow-xs gap-2',
  };

  return (
    <button
      id="btn-google-auth"
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      title="Sign in securely using your Google Account"
    >
      {isLoading ? (
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
          <span className="font-medium text-slate-700">Connecting Google...</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 w-full">
          {/* Official Google 4-Color G Logo SVG */}
          <svg
            className={variant === 'compact' ? 'w-4 h-4 flex-shrink-0' : 'w-5 h-5 flex-shrink-0'}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span className="font-semibold tracking-tight">{text}</span>
        </div>
      )}
    </button>
  );
};
