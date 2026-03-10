"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

interface UserInfo {
  credits: number;
  isSubscribed: boolean;
  hasTelegramSubscribed: boolean;
  referralCode: string;
  referralCount: number;
}

export default function Dashboard() {
  const { user } = useUser();
  const [info, setInfo] = useState<UserInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/credits").then((r) => r.json()).then(setInfo);
  }, []);

  const referralLink = typeof window !== "undefined" && info?.referralCode
    ? `${window.location.origin}/?ref=${info.referralCode}`
    : "";

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Привет, {user?.firstName ?? "Creator"}</p>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Кредиты</p>
          <p className="text-2xl font-bold">{info?.isSubscribed ? "Безлимит" : info?.credits ?? "..."}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">План</p>
          <p className="text-2xl font-bold">{info?.isSubscribed ? "Pro" : "Free"}</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Telegram</p>
          <p className="text-2xl font-bold">{info?.hasTelegramSubscribed ? "Подключён" : "Не подключён"}</p>
        </div>
      </div>

      {/* Реферальная ссылка */}
      {info?.referralCode && (
        <div className="rounded-xl border border-border p-4 space-y-2">
          <p className="text-sm font-medium">Твоя реферальная ссылка</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={copyLink}
              className="px-3 py-2 rounded-lg bg-muted text-sm hover:bg-muted/80 transition"
            >
              {copied ? "Скопировано!" : "Копировать"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Приглашай друзей — оба получите по +2 генерации! Приглашено: {info.referralCount}
          </p>
        </div>
      )}

      {!info?.isSubscribed && (
        <a
          href="https://gumroad.com/l/animforge-pro"
          target="_blank"
          className="block text-center py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90"
        >
          Перейти на Pro — $8/месяц
        </a>
      )}

      <Link
        href="/generate"
        className="block text-center py-3 rounded-lg border border-primary text-primary font-semibold hover:bg-primary/10"
      >
        Новая генерация
      </Link>
    </div>
  );
}
