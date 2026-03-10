import { pgTable, text, integer, boolean, timestamp, pgEnum, uuid } from "drizzle-orm/pg-core";

export const jobStatusEnum = pgEnum("job_status", [
  "pending", "rigging", "animating", "processing", "completed", "failed",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),                          // Clerk user ID
  email: text("email").notNull(),
  credits: integer("credits").notNull().default(3),
  isSubscribed: boolean("is_subscribed").notNull().default(false),
  subscriptionStatus: text("subscription_status").default("none"),  // none | active | cancelled | past_due
  subscriptionEndDate: timestamp("subscription_end_date"),
  gumroadSubscriptionId: text("gumroad_subscription_id"),
  hasTelegramSubscribed: boolean("has_telegram_subscribed").notNull().default(false),
  telegramUserId: text("telegram_user_id"),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),                      // referralCode того, кто пригласил
  referralCount: integer("referral_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  status: jobStatusEnum("status").notNull().default("pending"),
  prompt: text("prompt"),
  duration: integer("duration"),                        // animation seconds
  originalModelUrl: text("original_model_url"),
  riggedModelUrl: text("rigged_model_url"),
  animatedModelUrl: text("animated_model_url"),
  processedModelUrl: text("processed_model_url"),
  videoUrl: text("video_url"),
  errorMessage: text("error_message"),
  creditDeducted: boolean("credit_deducted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
