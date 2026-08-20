export type AuthNotificationType = 'error' | 'warning' | 'info' | 'success';

export interface AuthNotificationData {
  id: string;
  title: string;
  message: string;
  type: AuthNotificationType;
  code?: string;
  duration?: number; // in milliseconds (default: 6000ms, 0 for persistent)
  actionText?: string;
  onAction?: () => void;
  onOpenLogs?: () => void;
}

class AuthNotificationService {
  private listeners: Array<(notifications: AuthNotificationData[]) => void> = [];
  private notifications: AuthNotificationData[] = [];

  public subscribe(listener: (notifications: AuthNotificationData[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.notifications]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.notifications]);
      } catch (err) {
        console.error('[AuthNotificationService] Notification dispatch error:', err);
      }
    });
  }

  public show(notification: Omit<AuthNotificationData, 'id'>): string {
    const id = `auth_notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: AuthNotificationData = {
      ...notification,
      id,
      duration: notification.duration ?? 6000,
    };

    // Keep at most 3 active toasts at a time to prevent clutter
    this.notifications = [newNotif, ...this.notifications].slice(0, 3);
    this.notify();

    if (newNotif.duration && newNotif.duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, newNotif.duration);
    }

    return id;
  }

  public dismiss(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  public clearAll() {
    this.notifications = [];
    this.notify();
  }

  /**
   * Translates raw Firebase / Google OAuth errors into user-friendly notifications.
   */
  public handleAuthError(
    error: any,
    options?: {
      retryAction?: () => void;
      onOpenLogs?: () => void;
      context?: string;
    }
  ): string {
    const code = error?.code || (typeof error === 'string' ? error : '');
    const rawMessage = error?.message || String(error || '');

    let title = 'Google Sign-In Notice';
    let message = 'Unable to complete Google authentication. Please try again.';
    let type: AuthNotificationType = 'error';
    let actionText: string | undefined = options?.retryAction ? 'Try Again' : undefined;

    // 1. Popup closed by user
    if (
      code === 'auth/popup-closed-by-user' ||
      code.includes('popup-closed') ||
      rawMessage.toLowerCase().includes('popup-closed-by-user') ||
      rawMessage.toLowerCase().includes('closed by user')
    ) {
      title = 'Sign-In Cancelled';
      message = 'The Google login window was closed before completing verification. Please click Continue to try again.';
      type = 'warning';
    }
    // 2. Popup blocked by browser
    else if (
      code === 'auth/popup-blocked' ||
      code.includes('popup-blocked') ||
      rawMessage.toLowerCase().includes('popup blocked') ||
      rawMessage.toLowerCase().includes('blocked')
    ) {
      title = 'Login Popup Blocked';
      message = 'Your browser blocked the Google Sign-In popup window. Please allow popups for this site and retry.';
      type = 'warning';
      actionText = options?.retryAction ? 'Allow & Retry' : undefined;
    }
    // 3. Network connection failure
    else if (
      code === 'auth/network-request-failed' ||
      code.includes('network') ||
      rawMessage.toLowerCase().includes('network-request-failed') ||
      rawMessage.toLowerCase().includes('network error') ||
      rawMessage.toLowerCase().includes('failed to fetch')
    ) {
      title = 'Network Connection Error';
      message = 'Could not reach Google authentication servers. Please check your internet connection and try again.';
      type = 'error';
      actionText = options?.retryAction ? 'Retry Connection' : undefined;
    }
    // 4. Cancelled popup request (another popup superseded)
    else if (
      code === 'auth/cancelled-popup-request' ||
      code.includes('cancelled-popup')
    ) {
      title = 'Sign-In In Progress';
      message = 'A previous Google authentication window was replaced with the latest request.';
      type = 'info';
    }
    // 5. Unauthorized domain
    else if (
      code === 'auth/unauthorized-domain' ||
      rawMessage.toLowerCase().includes('unauthorized-domain')
    ) {
      title = 'Unauthorized Domain';
      message = 'This domain is not registered in the Firebase Google OAuth authorized domains list.';
      type = 'error';
      actionText = options?.onOpenLogs ? 'Check Logs' : undefined;
    }
    // 6. Account exists with different credential
    else if (
      code === 'auth/account-exists-with-different-credential' ||
      rawMessage.toLowerCase().includes('account-exists')
    ) {
      title = 'Account Already Exists';
      message = 'An account already exists with this email address under a different login method.';
      type = 'warning';
    }
    // 7. Too many requests (rate limit)
    else if (
      code === 'auth/too-many-requests' ||
      rawMessage.toLowerCase().includes('too-many-requests')
    ) {
      title = 'Too Many Attempts';
      message = 'Google login requests have been temporarily paused due to high activity. Please wait a moment.';
      type = 'warning';
    }
    // 8. User disabled
    else if (code === 'auth/user-disabled') {
      title = 'Account Disabled';
      message = 'This account has been disabled. Please contact support if you believe this is an error.';
      type = 'error';
    }
    // 9. Generic error with custom context
    else {
      title = options?.context ? `Google Auth (${options.context})` : 'Google Authentication Error';
      message = rawMessage.length < 120 && !rawMessage.includes('{') 
        ? rawMessage 
        : 'An unexpected issue occurred while authenticating with Google. Please retry or inspect diagnostic logs.';
      type = 'error';
    }

    return this.show({
      title,
      message,
      type,
      code: code || undefined,
      actionText,
      onAction: options?.retryAction,
      onOpenLogs: options?.onOpenLogs,
    });
  }

  public showSuccess(title: string, message: string) {
    return this.show({
      title,
      message,
      type: 'success',
      duration: 4000,
    });
  }
}

export const authNotificationService = new AuthNotificationService();
