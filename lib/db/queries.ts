import { db } from ".";
import { users, jobs } from "./schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

const FREE_CREDITS = Number(process.env.FREE_CREDITS ?? 3);
const REFERRAL_BONUS = Number(process.env.REFERRAL_BONUS ?? 2);

function generateReferralCode(): string {
  return crypto.randomBytes(6).toString("base64url"); // короткий уникальный код
}

/**
 * Создаёт пользователя или возвращает существующего.
 * Если передан referralCode — начисляет бонусы обоим (в транзакции).
 */
export async function getOrCreateUser(clerkId: string, email: string, refCode?: string) {
  const existing = await db.select().from(users).where(eq(users.id, clerkId)).limit(1);
  if (existing.length > 0) return existing[0];

  // Новый пользователь — используем транзакцию для реферальной логики
  const result = await db.transaction(async (tx) => {
    let bonusCredits = 0;
    let referredBy: string | null = null;

    // Проверяем реферальный код
    if (refCode) {
      const [referrer] = await tx
        .select()
        .from(users)
        .where(eq(users.referralCode, refCode))
        .limit(1);

      // Валидация: реферер существует и это не self-referral
      if (referrer && referrer.id !== clerkId) {
        referredBy = refCode;
        bonusCredits = REFERRAL_BONUS;

        // +2 кредита рефереру + инкремент счётчика
        await tx
          .update(users)
          .set({
            credits: sql`${users.credits} + ${REFERRAL_BONUS}`,
            referralCount: sql`${users.referralCount} + 1`,
          })
          .where(eq(users.id, referrer.id));
      }
    }

    const [user] = await tx.insert(users).values({
      id: clerkId,
      email,
      credits: FREE_CREDITS + bonusCredits,
      referralCode: generateReferralCode(),
      referredBy,
    }).returning();

    return user;
  });

  return result;
}

export async function deductCredit(userId: string): Promise<boolean> {
  const result = await db
    .update(users)
    .set({ credits: sql`${users.credits} - 1` })
    .where(sql`${users.id} = ${userId} AND ${users.credits} > 0`)
    .returning();
  return result.length > 0;
}

export async function refundCredit(userId: string) {
  await db.update(users).set({ credits: sql`${users.credits} + 1` }).where(eq(users.id, userId));
}

export async function createJob(userId: string) {
  const [job] = await db.insert(jobs).values({ userId }).returning();
  return job;
}

export async function updateJob(jobId: string, data: Partial<typeof jobs.$inferInsert>) {
  const [job] = await db.update(jobs).set({ ...data, updatedAt: new Date() }).where(eq(jobs.id, jobId)).returning();
  return job;
}

export async function getUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

export async function updateUserSubscription(
  email: string,
  data: Partial<Pick<typeof users.$inferInsert, "isSubscribed" | "subscriptionStatus" | "subscriptionEndDate" | "gumroadSubscriptionId">>
) {
  return db.update(users).set(data).where(eq(users.email, email)).returning();
}
