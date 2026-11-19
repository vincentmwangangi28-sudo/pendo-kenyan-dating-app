import { useState, useEffect, useRef, useCallback } from 'react';
import { AppNotification, AppView, VibeMeetupEvent } from '../types';

export function useRealtimeNotifications(userId: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastMeetupUpdate, setLastMeetupUpdate] = useState<VibeMeetupEvent | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

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

  // Initial REST sync
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/notifications/${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.notifications && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // WebSocket live subscription
  useEffect(() => {
    if (!userId || typeof window === 'undefined' || typeof WebSocket === 'undefined') return;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      try {
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/events?userId=${encodeURIComponent(userId)}`);
        wsRef.current = ws;

        ws.onopen = () => {
          retryCountRef.current = 0;
          setWsConnected(true);
        };

        ws.onmessage = (evt) => {
          try {
            const payload = JSON.parse(evt.data);
            if ((payload.type === 'NOTIFICATION' || payload.type === 'MPESA_CONFIRMED') && payload.notification) {
              mergeNotification(payload.notification, true);
            } else if (payload.type === 'MEETUP_UPDATED' && payload.event) {
              setLastMeetupUpdate(payload.event);
            }
          } catch {}
        };

        ws.onclose = () => {
          setWsConnected(false);
          if (isUnmounted) return;
          const delay = Math.min(15000, 1500 * Math.pow(2, retryCountRef.current));
          retryCountRef.current += 1;
          retryTimerRef.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch {
        setWsConnected(false);
      }
    };

    connect();

    return () => {
      isUnmounted = true;
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
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            endpoint: `pendo-browser-push://${userId}/${Date.now()}`,
          }),
        }).catch(() => {});
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
      }
    } catch {}
  };

  const markAsRead = async (notificationId?: string) => {
    setNotifications((prev) =>
      prev.map((n) => (!notificationId || n.id === notificationId ? { ...n, read: true } : n))
    );
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
    pushPermission,
    lastMeetupUpdate,
    requestPushPermission,
    triggerNotification,
    markAsRead,
  };
}
