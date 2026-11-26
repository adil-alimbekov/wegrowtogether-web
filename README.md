# We Grow Together — веб

Растём вместе: от ожидания малыша до 18 лет. Mobile-first, RU/KG, день/ночь.

## Что работает
- Регистрация и вход по коду из письма (Supabase Auth), по SMS — после подключения SMS-провайдера.
- Профиль семьи в базе: дети (месяц+год, возраст считается сам), беременность (месяц+год ПДР), боли, время с ребёнком, согласия с отзывом, удаление аккаунта. Данные видны с любого устройства после входа.
- Разбор рассказа нейросетью Claude на сервере (`/api/parse`) со строгой JSON-схемой; без ключа или при сбое — локальный разбор в браузере.
- Кризисная проверка в два слоя (словарь + модель), в базу пишется только тип и время.
- Рекомендации: 42 карточки RU/KG, ранжирование по боли, возрасту каждого ребёнка, беременности, экранному времени и отклику «Полезно / Сделали / Скрыть», ежедневная ротация.
- Без переменных окружения сайт работает в демо-режиме (всё в браузере).

## Запуск локально
```
npm install
npx supabase start          # локальная база (нужен Docker)
cp .env.example .env.local  # вписать ключи из вывода supabase start
npm run dev:api             # сервер /api на :8787
npm run dev                 # сайт на :5173; письма с кодом — в Mailpit на :54324
npm test && npm run typecheck
```

## Выкладка (Supabase + Vercel)
1. Supabase → New project (регион ближе к КР, например Frankfurt).
2. `npx supabase link --project-ref <ref>` и `npx supabase db push` — создаст таблицы и правила доступа.
3. Supabase → Authentication → Email Templates → «Magic Link» и «Confirm signup»: вставить `supabase/templates/otp.html` (в письме должен быть `{{ .Token }}`).
4. Supabase → Authentication → URL Configuration → Site URL = адрес сайта.
5. Для продакшен-почты: Authentication → SMTP (Resend, Postmark и т. п.) — встроенная почта Supabase шлёт мало писем в час.
6. Vercel → Import Git Repository → переменные из `.env.example` → Deploy.
7. Включить `pg_cron` и задачу очистки расшифровок (см. конец миграции).

## Структура
- `src/lib/backend.ts` — вход, загрузка и синхронизация с Supabase
- `server/llm.ts`, `server/parse-handler.ts`, `api/parse.ts` — разбор рассказа на сервере
- `src/content/tips.ts` — карточки и движок рекомендаций
- `src/lib/parser.ts`, `src/lib/crisis.ts` — локальный разбор и словарь-страховка
- `supabase/migrations` — схема и RLS; `scripts/check-backend.mts` — проверка изоляции данных
