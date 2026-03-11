# AnimForge Pro — Инструкция по деплою (бесплатный стек)

## Архитектура

| Сервис | Платформа | Tier |
|---|---|---|
| Next.js (фронтенд + API) | **Vercel** | Free |
| PostgreSQL | **Supabase** | Free (500 МБ) |
| Redis (очереди) | **Upstash** | Free (10K команд/день) |
| BullMQ Worker | **Render** | Free Worker |
| Blender Worker | **Render** | Free Docker |

```
Пользователь → Vercel (Next.js)
                 ├→ Clerk Auth
                 ├→ Supabase PostgreSQL
                 ├→ Upstash Redis → BullMQ очередь
                 │           └→ Queue Worker (Render)
                 │                ├→ UniRig (HF Space) — риггинг
                 │                ├→ HY-Motion (HF Space) — анимация
                 │                └→ Blender Worker (Render Docker)
                 ├→ Gumroad Webhook (подписки)
                 └→ Telegram Bot API (проверка канала)
```

## Требования

- GitHub-репозиторий с кодом (уже есть: `Amarak666/animforge-pro`)
- Аккаунты: Vercel, Supabase, Upstash, Render, Clerk, Hugging Face, Gumroad, Telegram

---

## Шаг 1: Supabase (база данных) ✅ ГОТОВО

Таблицы `users` и `jobs` уже созданы через миграцию.

Для подключения:
1. Зайдите в [supabase.com](https://supabase.com) → ваш проект → **Settings** → **Database**
2. Скопируйте **Connection string** (Transaction Pooler, порт 6543)
3. Замените `[YOUR-PASSWORD]` на пароль от БД
4. Это ваш `DATABASE_URL`

---

## Шаг 2: Upstash Redis (очереди)

1. Зайдите на [console.upstash.com](https://console.upstash.com)
2. **Create Database** → имя: `animforge-redis`
3. Регион: ближайший (например `eu-west-1`)
4. Скопируйте **Redis URL**:
   ```
   rediss://default:AbCdEfG123@eu1-redis.upstash.io:6379
   ```
5. Это ваш `REDIS_URL`

---

## Шаг 3: Vercel (фронтенд + API)

1. Зайдите на [vercel.com](https://vercel.com) → **Add New Project**
2. Импортируйте репо `Amarak666/animforge-pro`
3. Framework: **Next.js** (определится автоматически)
4. Добавьте **Environment Variables**:

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | Connection string из Supabase (шаг 1) |
| `REDIS_URL` | Redis URL из Upstash (шаг 2) |
| `CLERK_SECRET_KEY` | Дашборд Clerk → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Дашборд Clerk → API Keys |
| `HF_TOKEN` | huggingface.co → Settings → Access Tokens |
| `GUMROAD_WEBHOOK_SECRET` | Настройки продукта Gumroad |
| `TELEGRAM_BOT_TOKEN` | Telegram → @BotFather → /newbot |
| `TELEGRAM_CHANNEL_ID` | `@AnimForgeChannel` |
| `BLENDER_WORKER_URL` | URL blender-worker на Render (шаг 4) |
| `NEXT_PUBLIC_APP_URL` | `https://animforge-pro.vercel.app` |
| `FREE_CREDITS` | `3` |
| `REFERRAL_BONUS` | `2` |

5. Нажмите **Deploy**

---

## Шаг 4: Render (воркеры)

Создайте **два отдельных сервиса** (не Blueprint!):

### 4a. Blender Worker (Docker)

1. Render → **New** → **Web Service**
2. Подключите репо `Amarak666/animforge-pro`
3. **Docker** → Root Directory: `workers/blender`
4. Plan: **Free**
5. Env vars:
   - `PORT` = `10000`
6. После деплоя скопируйте URL (например `https://blender-worker-xxxx.onrender.com`)
7. Вставьте этот URL как `BLENDER_WORKER_URL` в Vercel (шаг 3)

### 4b. Queue Worker (Background Worker)

1. Render → **New** → **Background Worker**
2. Подключите репо `Amarak666/animforge-pro`
3. Runtime: **Node**
4. Build Command: `npm install`
5. Start Command: `npx tsx lib/queue/worker.ts`
6. Plan: **Free**
7. Env vars:
   - `DATABASE_URL` = Connection string из Supabase
   - `REDIS_URL` = Redis URL из Upstash
   - `HF_TOKEN` = Токен Hugging Face
   - `BLENDER_WORKER_URL` = URL из шага 4a

---

## Шаг 5: Clerk (аутентификация)

1. Создайте приложение на [clerk.com](https://clerk.com)
2. Укажите домен: `https://animforge-pro.vercel.app`
3. Включите провайдеры входа (Email, Google, GitHub)
4. Скопируйте ключи в env vars Vercel (шаг 3)

---

## Шаг 6: Gumroad (подписки)

1. Создайте Membership-продукт ($8/месяц)
2. Webhooks → добавьте URL: `https://animforge-pro.vercel.app/api/gumroad-webhook`
3. Gumroad отправит события: `subscription_created`, `subscription_updated`, `subscription_ended`, `cancellation`

---

## Шаг 7: Telegram-бот

1. Создайте бота через @BotFather
2. Создайте канал @AnimForgeChannel
3. Добавьте бота **администратором** канала
4. Вставьте токен бота в `TELEGRAM_BOT_TOKEN`

---

## Бизнес-логика

- **Регистрация** → +3 бесплатных кредита (+2 по реферальной ссылке)
- **Генерация** = -1 кредит
- **Ошибка** → кредит возвращается автоматически
- **0 кредитов** → нужна подписка через Gumroad
- **Подписчики** → безлимитные генерации
- **Экспорт** → только после подписки на Telegram-канал

---

## Ограничения бесплатного tier

- Render free воркеры **засыпают** после 15 мин неактивности (~30 сек холодный старт)
- Supabase free: пауза после 1 недели неактивности, 500 МБ лимит
- Upstash free: 10 000 команд/день
- Vercel free: 100 ГБ bandwidth, 6000 мин сборки/месяц
- Для MVP достаточно, для продакшена — апгрейд Render до Starter ($7/мес)
