import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  vibeCircle: text('vibe_circle'),
  subscriptionTier: text('subscription_tier').default('FREE'),
  trustScore: integer('trust_score').default(20),
  dataSaverEnabled: boolean('data_saver_enabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// M-Pesa Daraja 2.0 Transaction Ledger
export const mpesaTransactions = pgTable('mpesa_transactions', {
  id: serial('id').primaryKey(),
  checkoutRequestId: text('checkout_request_id').notNull().unique(),
  merchantRequestId: text('merchant_request_id').notNull(),
  userId: text('user_id').notNull(),
  phone: text('phone').notNull(),
  amountKes: integer('amount_kes').notNull(),
  purpose: text('purpose').notNull(),
  itemName: text('item_name').notNull(),
  receiptNumber: text('receipt_number'),
  status: text('status').notNull().default('PENDING'), // PENDING | COMPLETED | FAILED
  resultDesc: text('result_desc'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Kenyan Vibe Circle Meetup RSVPs
export const meetupRsvps = pgTable('meetup_rsvps', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  vibeCircle: text('vibe_circle').notNull(),
  status: text('status').notNull().default('GOING'), // GOING | CANCELLED
  createdAt: timestamp('created_at').defaultNow(),
});

// Browser Web Push Subscriptions
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh'),
  authKey: text('auth_key'),
  createdAt: timestamp('created_at').defaultNow(),
});
