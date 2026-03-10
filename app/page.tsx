import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function Home({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  return (
    <ReferralWrapper searchParams={searchParams} />
  );
}

async function ReferralWrapper({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        AnimForge Pro
      </h1>
      <p className="text-muted-foreground text-lg max-w-xl text-center">
        Загрузите 3D-модель, автоматический риггинг через AI, генерация анимации
        по текстовому промпту — весь пайплайн в одном месте.
      </p>

      {ref && (
        <p className="text-sm text-green-400">
          Вас пригласил друг — получите +2 бонусных генерации при регистрации!
        </p>
      )}

      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition">
            Начать бесплатно — 3 генерации
          </button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <Link
          href={ref ? `/generate?ref=${ref}` : "/generate"}
          className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
        >
          Открыть студию
        </Link>
      </SignedIn>
    </main>
  );
}
