# AnimForge Pro — Инструкция по деплою на Render

## Требования

- GitHub-репозиторий с загруженным кодом проекта
- Аккаунты: Render, Clerk, Hugging Face, Gumroad, Telegram (бот), **Upstash** (для Redis)

---

## Шаг 1: Создание Redis на Upstash

Render больше не предлагает managed Redis на всех планах. Используем **Upstash** — бесплатный tier, полностью совместим с BullMQ.

1. Зайдите на [console.upstash.com](https://console.upstash.com)
2. Нажмите **Create Database**
3. Имя: `animforge-redis`
4. Регион: выберите ближайший к вашим Render-сервисам (например, `eu-west-1` если Render в Frankfurt)
5. TLS: **включён** (по умолчанию)
6. После создания скопируйте **Redis URL** — он выглядит так:
   ```
   rediss://default:AbCdEfG123@eu1-redis.upstash.io:6379
   ```
7. Этот URL нужно будет вставить как `REDIS_URL` в env vars каждого сервиса на Render (шаг 3)

> Бесплатный план Upstash: 10 000 команд/день, 256 МБ. Для MVP этого достаточно. При масштабировании переходите на Pay-as-you-go ($0.2/100K команд).

---

## Шаг 2: Деплой через Blueprint

1. В дашборде Render → **New** → **Blueprint**
2. Подключите ваш GitHub-репозиторий
3. Выберите ветку `main` — Render автоматически прочитает `render.yaml`
4. Будут созданы следующие сервисы:
   - `animforge-web` — Next.js (фронтенд + API)
   - `animforge-queue-worker` — BullMQ воркер (обработка очередей)
   - `blender-worker` — Python + headless Blender (Docker)
   - `animforge-db` — PostgreSQL база данных

---

## Шаг 3: Настройка переменных окружения

В каждом сервисе установите секретные переменные (отмечены `sync: false` в render.yaml):

| Переменная | Где взять |
|---|---|
| `REDIS_URL` | Upstash Console → ваша база → Redis URL (шаг 1) |
| `CLERK_SECRET_KEY` | Дашборд Clerk → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Дашборд Clerk → API Keys |
| `HF_TOKEN` | huggingface.co → Settings → Access Tokens |
| `GUMROAD_WEBHOOK_SECRET` | Настройки продукта на Gumroad |
| `TELEGRAM_BOT_TOKEN` | Telegram → @BotFather → /newbot |

---

## Шаг 4: Настройка Gumroad (подписки)

1. Создайте Membership-продукт на Gumroad ($8/месяц или $80/год)
2. В настройках продукта → раздел **Webhooks (Ping)**
3. Добавьте URL: `https://animforge-web.onrender.com/api/gumroad-webhook`
4. Gumroad будет отправлять события: `subscription_created`, `subscription_updated`, `subscription_ended`, `cancellation`

---

## Шаг 5: Настройка Telegram-бота

1. Создайте бота через @BotFather в Telegram
2. Добавьте бота **администратором** в канал @AnimForgeChannel
3. Боту нужно разрешение на вызов `getChatMember` (есть по умолчанию у админов)
4. Создайте сам канал @AnimForgeChannel, если его ещё нет

---

## Шаг 6: Настройка Clerk (аутентификация)

1. Создайте приложение на clerk.com
2. Укажите redirect URL на ваш домен Render (например `https://animforge-web.onrender.com`)
3. Включите нужные провайдеры входа (Email, Google, GitHub и т.д.)

---

## Шаг 7: Миграция базы данных

После первого деплоя откройте Shell в сервисе `animforge-web` на Render:

```bash
npm run db:push
```

Это создаст таблицы `users` и `jobs` в PostgreSQL.

---

## Архитектура

```
Пользователь → Next.js (Render Web Service)
                 ├→ Clerk Auth (аутентификация)
                 ├→ PostgreSQL (Render DB)
                 ├→ Upstash Redis → BullMQ очередь
                 │           └→ Queue Worker
                 │                ├→ UniRig Space (Hugging Face) — риггинг
                 │                ├→ HY-Motion Space (Hugging Face) — анимация
                 │                └→ Blender Worker (Render Docker) — сглаживание + физика
                 ├→ Gumroad Webhook (управление подписками)
                 └→ Telegram Bot API (проверка подписки на канал)
```

---

## Масштабирование

- Queue-воркеры: автоскейлинг 1–5 инстансов при CPU > 70%
- Blender-воркеры: автоскейлинг 1–3 инстанса при CPU > 70%
- Все сервисы связаны через приватную сеть Render (private networking)
- Redis: Upstash (внешний, бесплатный tier — 10K команд/день, масштабируется по необходимости)
- Хранилище файлов: Render Disks по 50 ГБ на каждый сервис

---

## Бизнес-логика (кратко)

- **Регистрация** → +3 бесплатных кредита (+2 по реферальной ссылке)
- **Генерация** (риг + анимация + обработка) = -1 кредит
- **Ошибка на любом шаге** → кредит возвращается автоматически
- **0 кредитов** → блокировка до оформления подписки через Gumroad
- **Подписчики** → безлимитные генерации
- **Экспорт** (скачивание .glb/.fbx/.mp4) → только после подписки на Telegram-канал
