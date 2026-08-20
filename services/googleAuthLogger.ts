export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'DEBUG';
export type LogCategory = 'GOOGLE_AUTH' | 'GOOGLE_OAUTH' | 'GOOGLE_MEET' | 'FIRESTORE' | 'SECURITY' | 'SESSION';

export interface GoogleLogEntry {
  id: string;
  timestamp: string;
  timeFormatted: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, any> | string | null;
}

const STORAGE_KEY = 'pendo_google_system_logs_v1';
const MAX_LOGS = 150;

class GoogleAuthLogger {
  private logs: GoogleLogEntry[] = [];
  private listeners: Array<(logs: GoogleLogEntry[]) => void> = [];

  constructor() {
    this.loadFromStorage();
    // Record initial session log
    this.info('SESSION', 'Pendo Google Services Logging initialized', {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      timestamp: new Date().toISOString(),
      environment: 'Web / PWA / Vercel',
    });
  }

  private loadFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
          this.logs = JSON.parse(data);
        }
      }
    } catch (err) {
      console.warn('[GoogleAuthLogger] Could not load logs from storage:', err);
    }
  }

  private saveToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs.slice(-MAX_LOGS)));
      }
    } catch (err) {
      console.warn('[GoogleAuthLogger] Could not save logs to storage:', err);
    }
  }

  private notify() {
    this.saveToStorage();
    this.listeners.forEach((listener) => {
      try {
        listener([...this.logs]);
      } catch (e) {
        console.error('[GoogleAuthLogger] Listener error:', e);
      }
    });
  }

  public subscribe(listener: (logs: GoogleLogEntry[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.logs]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getLogs(): GoogleLogEntry[] {
    return [...this.logs];
  }

  public log(level: LogLevel, category: LogCategory, message: string, details?: Record<string, any> | string | null) {
    const now = new Date();
    const entry: GoogleLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      timeFormatted: now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      level,
      category,
      message,
      details: details ? (typeof details === 'object' ? JSON.parse(JSON.stringify(details)) : details) : null,
    };

    this.logs = [entry, ...this.logs].slice(0, MAX_LOGS);
    
    // Also output formatted console log
    const prefix = `[GoogleLogs][${category}][${level}]`;
    if (level === 'ERROR') {
      console.error(prefix, message, details || '');
    } else if (level === 'WARN') {
      console.warn(prefix, message, details || '');
    } else if (level === 'SUCCESS') {
      console.log(`%c${prefix} ${message}`, 'color: #10b981; font-weight: bold;', details || '');
    } else {
      console.log(prefix, message, details || '');
    }

    this.notify();
    return entry;
  }

  public info(category: LogCategory, message: string, details?: any) {
    return this.log('INFO', category, message, details);
  }

  public success(category: LogCategory, message: string, details?: any) {
    return this.log('SUCCESS', category, message, details);
  }

  public warn(category: LogCategory, message: string, details?: any) {
    return this.log('WARN', category, message, details);
  }

  public error(category: LogCategory, message: string, details?: any) {
    return this.log('ERROR', category, message, details);
  }

  public debug(category: LogCategory, message: string, details?: any) {
    return this.log('DEBUG', category, message, details);
  }

  public clear() {
    this.logs = [];
    this.notify();
    this.info('SESSION', 'Logs cleared by user');
  }

  public exportLogsJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Specialized helpers for Google features
  public logGoogleSignInStart(method: 'popup' | 'redirect' | 'anonymous' = 'popup') {
    this.info('GOOGLE_AUTH', `Initiating Google Sign-In via ${method}`, {
      method,
      clientPlatform: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
      timestamp: new Date().toISOString()
    });
  }

  public logGoogleSignInSuccess(user: { uid: string; email?: string | null; displayName?: string | null; isAnonymous: boolean }, accessToken?: string | null) {
    this.success('GOOGLE_AUTH', `Google Sign-In successful for ${user.email || user.displayName || user.uid}`, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      isAnonymous: user.isAnonymous,
      hasOAuthAccessToken: !!accessToken,
      tokenScope: accessToken ? 'meetings.space.created / settings' : 'standard',
    });
  }

  public logGoogleSignInFailure(error: any) {
    this.error('GOOGLE_AUTH', `Google Sign-In failed or popup was closed/blocked`, {
      code: error?.code,
      message: error?.message || String(error),
      name: error?.name
    });
  }

  public logGoogleMeetToken(success: boolean, token?: string | null, error?: any) {
    if (success) {
      this.success('GOOGLE_MEET', 'Google Meet OAuth access token acquired', {
        scopes: ['meetings.space.created', 'meetings.space.readonly', 'meetings.space.settings'],
        tokenLength: token?.length || 0,
      });
    } else {
      this.error('GOOGLE_MEET', 'Failed to acquire Google Meet OAuth token', {
        error: error?.message || String(error),
      });
    }
  }

  public logSignOut(uid?: string) {
    this.info('GOOGLE_AUTH', 'User signed out from Google Authentication', { uid });
  }

  public logFirestoreOperation(op: string, path: string, success: boolean, details?: any) {
    if (success) {
      this.debug('FIRESTORE', `Firestore ${op} succeeded at [${path}]`, details);
    } else {
      this.error('FIRESTORE', `Firestore ${op} error at [${path}]`, details);
    }
  }
}

export const googleAuthLogger = new GoogleAuthLogger();
