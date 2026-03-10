const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID!;

interface ChatMemberResponse {
  ok: boolean;
  result?: { status: string };
  description?: string;
}

/**
 * Checks if a Telegram user is a member of @AnimForgeChannel.
 * Returns true if status is "member", "administrator", or "creator".
 */
export async function checkTelegramMembership(telegramUserId: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${telegramUserId}`;

  const res = await fetch(url);
  const data: ChatMemberResponse = await res.json();

  if (!data.ok || !data.result) return false;

  const activeStatuses = ["member", "administrator", "creator"];
  return activeStatuses.includes(data.result.status);
}
