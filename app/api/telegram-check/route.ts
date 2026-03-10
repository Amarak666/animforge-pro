import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkTelegramMembership } from "@/lib/telegram/check";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { telegramUserId } = (await req.json()) as { telegramUserId: string };
  if (!telegramUserId) {
    return NextResponse.json({ error: "telegramUserId required" }, { status: 400 });
  }

  const isMember = await checkTelegramMembership(telegramUserId);

  if (isMember) {
    await db
      .update(users)
      .set({ hasTelegramSubscribed: true, telegramUserId })
      .where(eq(users.id, userId));
  }

  return NextResponse.json({ isMember });
}
