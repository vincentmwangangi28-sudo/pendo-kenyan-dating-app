import { useState, useEffect, useRef, useCallback } from 'react';
import { AppNotification, AppView, VibeMeetupEvent } from '../types';

export type RealtimeConnectionState = 'idle' | 'connected' | 'reconnecting' | 'silent_fallback';

// Module-level capability cache prevents /api/notifications 404s and WS failure loops
// when running on static hosting or offline environments without the Node/WS server.
let cachedBackendCapability: { supported: boolean; checkedAt: number } | null = null;
let inFlightCapabilityCheck: Promise<boolean> | null = null;
const CAPABILITY_CACHE_TTL_MS = 5 * 60 * 1000;

async function probeRealtimeBackend(forceRefresh = false): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const now = Date.now();
  if (
    !forceRefresh &&
    cachedBackendCapability &&
    now - cachedBackendCapability.checkedAt < CAPABILITY_CACHE_TTL_MS
  ) {
    return cachedBackendCapability.supported;
  }

  if (inFlightCapabilityCheck && !forceRefresh) {
    return inFlightCapabilityCheck;
  }

  inFlightCapabilityCheck = (async () => {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 3500) : null;
      const res = await fetch('/api/health', {
        cache: 'no-store',
        signal: controller?.signal,
      }).finally(() => {
        if (timer) clearTimeout(timer);
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        cachedBackendCapability = { supported: false, checkedAt: Date.now() };
        return false;
      }

      const data = await res.json().catch(() => null);
      const supported = Boolean(data && data.status === 'ok');
      cachedBackendCapability = { supported, checkedAt: Date.now() };
      return supported;
    } catch {
      cachedBackendCapability = { supported: false, checkedAt: Date.now() };
      return false;
    } finally {
      inFlightCapabilityCheck = null;
    }
  })();

  return inFlightCapabilityCheck;
}

export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('idle');
  const [lastMeetupUpdate, setLastMeetupUpdate] = useState<VibeMeetupEvent | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);
  const hadOpenRef = useRef(false);
  const backendSupportedRef = useRef<boolean | null>(null);

  const showNativeNotification = useCallback((item: AppNotification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready
          .then((reg) =>
            reg.showNotification(item.title, {
              body: item.body,
              icon: '/pwa-192x192.png',
              badge: '/favicon.png',
              tag: item.id,
            })
          )
          .catch(() => {
            new Notification(item.title, { body: item.body, icon: '/pwa-192x192.png' });
          });
      } else {
        new Notification(item.title, { body: item.body, icon: '/pwa-192x192.png' });
      }
    } catch {}
  }, []);

  const mergeNotification = useCallback(
    (incoming: AppNotification, notifyBrowser = true) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === incoming.id)) return prev;
        if (notifyBrowser) showNativeNotification(incoming);
        return [incoming, ...prev].slice(0, 40);
      });
    },
    [showNativeNotification]
  );

  // Initial REST sync + bounded WebSocket live subscription (silent fallback when API/WS unavailable)
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    let isUnmounted = false;
    retryCountRef.current = 0;
    hadOpenRef.current = false;

    const connectWs = () => {
      if (isUnmounted || typeof WebSocket === 'undefined') return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setWsConnected(false);
        setConnectionState('silent_fallback');
        return;
      }

      try {
        setConnectionState(retryCountRef.current > 0 ? 'reconnecting' : 'idle');
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/events?userId=${encodeURIComponent(userId)}`);
        wsRef.current = ws;

        ws.onopen = () => {
          retryCountRef.current = 0;
          hadOpenRef.current = true;
          setWsConnected(true);
          setConnectionState('connected');
        };

        ws.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            if (payload.type === 'NOTIFICATION' && payload.notification) {
              mergeNotification(payload.notification, true);
            } else if (payload.type === 'MEETUP_UPDATED' && payload.event) {
              setLastMeetupUpdate(payload.event);
            }
          } catch {}
        };

        ws.onclose = () => {
          setWsConnected(false);
          if (isUnmounted) return;

          const maxAttempts = hadOpenRef.current ? 4 : 1;
          if (retryCountRef.current >= maxAttempts) {
            setConnectionState('silent_fallback');
            return;
          }

          setConnectionState('reconnecting');
          const baseDelay = 2000 * Math.pow(2, retryCountRef.current);
          const jitter = Math.floor(Math.random() * 700);
          const delay = Math.min(20000, baseDelay + jitter);
          retryCountRef.current += 1;
          retryTimerRef.current = setTimeout(connectWs, delay);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch {
        setWsConnected(false);
        setConnectionState('silent_fallback');
      }
    };

    const initializeRealtime = async (forceProbe = false) => {
      const supported = await probeRealtimeBackend(forceProbe);
      if (isUnmounted) return;
      backendSupportedRef.current = supported;

      if (!supported) {
        setWsConnected(false);
        setConnectionState('silent_fallback');
        return;
      }

      // Sync stored notifications silently
      try {
        const res = await fetch(`/api/notifications/${encodeURIComponent(userId)}`);
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (!isUnmounted && data?.notifications && Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
          }
        }
      } catch {}

      connectWs();
    };

    initializeRealtime(false);

    const handleOnline = () => {
      if (isUnmounted) return;
      retryCountRef.current = 0;
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        initializeRealtime(true);
      }
    };

    const handleVisibilityChange = () => {
      if (
        !isUnmounted &&
        document.visibilityState === 'visible' &&
        backendSupportedRef.current === true &&
        (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)
      ) {
        retryCountRef.current = 0;
        connectWs();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isUnmounted = true;
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [userId, mergeNotification]);

  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === 'granted') {
        if (backendSupportedRef.current) {
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              endpoint: `pendo-browser-push://${userId}/${Date.now()}`,
            }),
          }).catch(() => {});
        }
        return true;
      }
    } catch {}
    return false;
  };

  const triggerNotification = async (params: {
    type: AppNotification['type'];
    title: string;
    body: string;
    targetView?: AppView;
    targetId?: string;
  }) => {
    const localNotification: AppNotification = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId,
      type: params.type,
      title: params.title,
      body: params.body,
      read: false,
      createdAt: Date.now(),
      targetView: params.targetView,
      targetId: params.targetId,
    };

    if (!backendSupportedRef.current) {
      mergeNotification(localNotification, false);
      return;
    }

    try {
      const res = await fetch('/api/notifications/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...params,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.notification) {
        mergeNotification(data.notification, false);
      } else {
        mergeNotification(localNotification, false);
      }
    } catch {
      mergeNotification(localNotification, false);
    }
  };

  const markAsRead = async (notificationId?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (!notificationId || n.id === notificationId ? { ...n, read: true } : n))
    );
    if (!backendSupportedRef.current) return;
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId }),
      });
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    wsConnected,
    connectionState,
    pushPermission,
    lastMeetupUpdate,
    requestPushPermission,
    triggerNotification,
    markAsRead,
  };
}
