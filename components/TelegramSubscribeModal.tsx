"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onVerified: () => void;
}

export function TelegramSubscribeModal({ onClose, onVerified }: Props) {
  const [telegramId, setTelegramId] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const verify = async () => {
    if (!telegramId.trim()) return;
    setChecking(true);
    setError("");

    const res = await fetch("/api/telegram-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramUserId: telegramId.trim() }),
    });
    const data = await res.json();

    if (data.isMember) {
      onVerified();
    } else {
      setError("You are not a member of @AnimForgeChannel. Please subscribe first.");
    }
    setChecking(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold">Subscribe to Export</h2>
        <p className="text-sm text-muted-foreground">
          To download exports, subscribe to our Telegram channel first, then enter your Telegram user ID to verify.
        </p>

        <a
          href="https://t.me/AnimForgeChannel"
          target="_blank"
          className="block text-center py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500"
        >
          Open @AnimForgeChannel in Telegram
        </a>

        <div>
          <label className="text-sm font-medium block mb-1">Your Telegram User ID</label>
          <input
            type="text"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder="123456789"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">Send /start to @userinfobot on Telegram to get your ID</p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-border hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={verify}
            disabled={checking || !telegramId.trim()}
            className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-40"
          >
            {checking ? "Checking..." : "Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
