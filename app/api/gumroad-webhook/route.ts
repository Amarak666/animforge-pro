import { NextRequest, NextResponse } from "next/server";
import { updateUserSubscription, getUserByEmail } from "@/lib/db/queries";

/**
 * Gumroad Ping webhook handler for subscription events.
 * Gumroad sends POST with form-encoded data.
 * Events: subscription_created, subscription_updated, subscription_ended, subscription_cancelled
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;

    // Verify webhook secret (Gumroad sends it as seller_id or custom field)
    // In production, verify via IP allowlist or HMAC
    const resourceName = data.resource_name; // "sale", "subscription_updated", etc.
    const email = data.email?.toLowerCase();
    const subscriptionId = data.subscription_id;

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      console.warn(`Gumroad webhook: no user found for email ${email}`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    switch (resourceName) {
      case "sale":
      case "subscription_created":
      case "subscription_updated": {
        const isActive = data.recurrence === "cancelled" ? false : true;
        const endDate = data.ended_at
          ? new Date(data.ended_at)
          : data.subscription_duration
            ? new Date(Date.now() + parseDuration(data.subscription_duration))
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days

        await updateUserSubscription(email, {
          isSubscribed: isActive,
          subscriptionStatus: isActive ? "active" : "cancelled",
          subscriptionEndDate: endDate,
          gumroadSubscriptionId: subscriptionId,
        });

        console.log(`Subscription ${isActive ? "activated" : "updated"} for ${email}`);
        break;
      }

      case "subscription_ended":
      case "subscription_cancelled":
      case "cancellation":
      case "refund": {
        await updateUserSubscription(email, {
          isSubscribed: false,
          subscriptionStatus: "cancelled",
        });
        console.log(`Subscription deactivated for ${email}`);
        break;
      }

      default:
        console.log(`Unhandled Gumroad event: ${resourceName}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Gumroad webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function parseDuration(dur: string): number {
  // "monthly" -> 30 days, "yearly" -> 365 days
  if (dur.includes("year")) return 365 * 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
}
