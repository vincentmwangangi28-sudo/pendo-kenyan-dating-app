import { eq, and } from 'drizzle-orm';
import { db } from './index.ts';
import { meetupRsvps, pushSubscriptions } from './schema.ts';
import { INITIAL_VIBE_MEETUPS } from '../lib/vibeCirclesData.ts';
import { AppNotification, VibeMeetupEvent } from '../../types.ts';

const hasPostgresConfig = () => Boolean(process.env.DATABASE_URL || process.env.SQL_HOST);

// Authoritative server memory state (backed by PostgreSQL when DATABASE_URL/SQL_HOST is set)
const rsvpMemoryStore = new Map<string, Set<string>>(); // eventId -> Set<userId>
const notificationMemoryStore = new Map<string, AppNotification[]>(); // userId -> items
const pushSubMemoryStore = new Map<string, { userId: string; endpoint: string; p256dh?: string; authKey?: string }>();

// Seed initial RSVP counts from catalog
for (const evt of INITIAL_VIBE_MEETUPS) {
  if (!rsvpMemoryStore.has(evt.id)) {
    rsvpMemoryStore.set(evt.id, new Set());
  }
}

export async function listVibeMeetups(userId?: string): Promise<VibeMeetupEvent[]> {
  return INITIAL_VIBE_MEETUPS.map((evt) => {
    const dynamicAttendees = rsvpMemoryStore.get(evt.id);
    const extraCount = dynamicAttendees ? dynamicAttendees.size : 0;
    const hasRsvped = Boolean(userId && dynamicAttendees?.has(userId));
    return {
      ...evt,
      rsvpCount: Math.min(evt.maxCapacity, evt.rsvpCount + extraCount),
      hasRsvped,
    };
  });
}

export async function toggleVibeMeetupRsvp(params: {
  eventId: string;
  userId: string;
  userName: string;
  userAge: number;
  userTrustScore: number;
}): Promise<{ ok: true; event: VibeMeetupEvent; action: 'JOINED' | 'CANCELLED' } | { ok: false; status: number; error: string }> {
  const template = INITIAL_VIBE_MEETUPS.find((e) => e.id === params.eventId);
  if (!template) {
    return { ok: false, status: 404, error: 'Meetup event not found.' };
  }

  const attendees = rsvpMemoryStore.get(template.id) || new Set<string>();
  rsvpMemoryStore.set(template.id, attendees);

  const alreadyGoing = attendees.has(params.userId);
  if (alreadyGoing) {
    attendees.delete(params.userId);
    if (hasPostgresConfig()) {
      try {
        await db
          .update(meetupRsvps)
          .set({ status: 'CANCELLED' })
          .where(and(eq(meetupRsvps.eventId, template.id), eq(meetupRsvps.userId, params.userId)));
      } catch {}
    }
    return {
      ok: true,
      action: 'CANCELLED',
      event: {
        ...template,
        rsvpCount: Math.min(template.maxCapacity, template.rsvpCount + attendees.size),
        hasRsvped: false,
      },
    };
  }

  // Server-authoritative Age & Pendo Ngao Trust Score gating
  if (params.userAge < template.minAge) {
    return {
      ok: false,
      status: 403,
      error: `${template.vibeCircle} meetups require verified members aged ${template.minAge}+.`,
    };
  }
  if (params.userTrustScore < template.minTrustScore) {
    return {
      ok: false,
      status: 403,
      error: `${template.vibeCircle} requires a Pendo Ngao Trust Score of ${template.minTrustScore}%+ (complete Live Selfie Verification to unlock).`,
    };
  }
  if (template.rsvpCount + attendees.size >= template.maxCapacity) {
    return { ok: false, status: 409, error: 'This Kenyan Vibe Circle meetup has reached capacity.' };
  }

  attendees.add(params.userId);
  if (hasPostgresConfig()) {
    try {
      await db.insert(meetupRsvps).values({
        eventId: template.id,
        userId: params.userId,
        userName: params.userName,
        vibeCircle: template.vibeCircle,
        status: 'GOING',
      });
    } catch {}
  }

  return {
    ok: true,
    action: 'JOINED',
    event: {
      ...template,
      rsvpCount: Math.min(template.maxCapacity, template.rsvpCount + attendees.size),
      hasRsvped: true,
    },
  };
}

export function addUserNotification(item: AppNotification): AppNotification {
  const existing = notificationMemoryStore.get(item.userId) || [];
  // Idempotent by notification id
  if (existing.some((n) => n.id === item.id)) {
    return item;
  }
  const updated = [item, ...existing].slice(0, 40);
  notificationMemoryStore.set(item.userId, updated);
  return item;
}

export function getUserNotifications(userId: string): AppNotification[] {
  return notificationMemoryStore.get(userId) || [];
}

export function markUserNotificationsRead(userId: string, notificationId?: string): AppNotification[] {
  const existing = notificationMemoryStore.get(userId) || [];
  const updated = existing.map((n) =>
    !notificationId || n.id === notificationId ? { ...n, read: true } : n
  );
  notificationMemoryStore.set(userId, updated);
  return updated;
}

export async function savePushSubscription(sub: {
  userId: string;
  endpoint: string;
  p256dh?: string;
  authKey?: string;
}) {
  pushSubMemoryStore.set(sub.endpoint, sub);
  if (hasPostgresConfig()) {
    try {
      await db
        .insert(pushSubscriptions)
        .values({
          userId: sub.userId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh || null,
          authKey: sub.authKey || null,
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.endpoint,
          set: {
            userId: sub.userId,
            p256dh: sub.p256dh || null,
            authKey: sub.authKey || null,
          },
        });
    } catch {}
  }
  return { saved: true, count: pushSubMemoryStore.size };
}
