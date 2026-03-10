import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clerk = await currentUser();
  const email = clerk?.emailAddresses[0]?.emailAddress ?? "";

  // ref передаётся при первом заходе после регистрации по реферальной ссылке
  const refCode = req.nextUrl.searchParams.get("ref") ?? undefined;
  const user = await getOrCreateUser(userId, email, refCode);

  return NextResponse.json({
    credits: user.credits,
    isSubscribed: user.isSubscribed,
    hasTelegramSubscribed: user.hasTelegramSubscribed,
    referralCode: user.referralCode,
    referralCount: user.referralCount,
  });
}
