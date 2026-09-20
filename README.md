<div align="center">

# Web

**`_ud2`** · [Benqxc](https://github.com/Benqxc)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://github.com/Benqxc/Web)
[![Express](https://img.shields.io/badge/Express-API-000000?style=for-the-badge&logo=express&logoColor=white)](https://github.com/Benqxc/Web)
[![PWA](https://img.shields.io/badge/PWA-ready-7B61FF?style=for-the-badge)](https://github.com/Benqxc/Web)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)](LICENSE)

Персональный био-сайт с отслеживанием посетителей, админ-панелью и PWA.

</div>

---

## Содержание

- [Быстрый старт](#быстрый-старт)
- [Переменные окружения](#переменные-окружения)
- [Структура](#структура)
- [Функции](#функции)
- [Безопасность](#безопасность)
- [Локальная разработка](#локальная-разработка)
- [API](#api)
- [Тесты](#тесты)
- [Лицензия](#лицензия)

## Быстрый старт

### Railway

1. Создай проект на [Railway](https://railway.app)
2. Подключи этот репозиторий
3. Задай переменные окружения (см. ниже)
4. Деплой запустится автоматически по `package.json`

### Vercel

Проект содержит `vercel.json` и serverless-функции в `api/` — можно деплоить и на Vercel. Для rate limiting на Vercel используется Redis (см. KV-переменные ниже).

## Переменные окружения

Скопируй `.env.example` в `.env`:

```bash
cp .env.example .env
```

| Переменная | Назначение |
|------------|------------|
| `DATABASE_URL` | PostgreSQL (Railway / self-hosted) |
| `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` | Vercel KV (Redis) для rate limiting и хранилища на Vercel |
| `ADMIN_PASSWORD` | Пароль администратора (обязательно сменить в production!) |
| `JWT_SECRET` | Секрет для подписи JWT (случайная строка 32+ байт) |
| `ALLOWED_ORIGINS` | CORS whitelist через запятую |
| `LOGIN_RATE_LIMIT` / `LOGIN_RATE_WINDOW_MS` | Лимиты попыток входа |
| `PORT` / `NODE_ENV` | Порт и окружение |

> Без KV-переменных на Vercel rate limiting работать не будет — задай их в Dashboard → Storage → Connect Database.

## Структура

```
├── __tests__/          # API tests (Jest + Supertest)
├── api/                # Vercel serverless functions
├── lib/                # Общая логика: auth.js, cors.js
├── public/             # Static assets (PWA, admin UI)
├── index.html, admin.html, script.js, styles.css, ...  # Корневые копии страниц (см. замечание ниже)
├── server.js           # Express server (Railway)
├── vercel.json         # Конфигурация Vercel
├── jest.config.js      # Конфигурация тестов
├── package.json
└── .env.example
```

> ⚠️ Обрати внимание: `index.html`, `admin.html`, `script.js`, `styles.css`, `admin-script.js`, `admin-styles.css` существуют и в корне, и в `public/`, причём содержимое различается. Сервируется `public/`. Перед релизом стоит удалить корневые дубли или синхронизировать их, чтобы не было рассинхрона.

## Функции

### Для посетителей

- Анимированный фон, 3D-карточка, typing-эффект
- Тёмная / светлая тема
- GitHub API интеграция (кэш 1 час)
- PWA и офлайн-режим

### Для администратора

- Трекинг IP, страны, устройства, времени на сайте
- Графики Chart.js, экспорт CSV/JSON
- Смена пароля, очистка истории

## Безопасность

- Пароль из `ADMIN_PASSWORD`, bcrypt-хеширование
- Rate limiting на логин (5 попыток / 15 мин)
- CORS whitelist, Helmet.js
- JWT-токены для админ-API (см. `lib/auth.js`)
- Подробности — в [SECURITY.md](SECURITY.md)

## Локальная разработка

```bash
npm install
npm run dev      # development (nodemon)
npm start        # production
npm test         # tests
```

Открой http://localhost:3000

## API

| Метод | Endpoint | Описание |
|-------|----------|----------|
| POST | `/api/track` | Трекинг посетителя |
| POST | `/api/login` | Вход администратора |
| GET | `/api/stats` | Статистика |
| GET | `/api/visitors` | Все посетители |
| GET | `/api/export/csv` | Экспорт CSV |
| GET | `/api/export/json` | Экспорт JSON |
| DELETE | `/api/visitors` | Очистить данные |
| POST | `/api/change-password` | Смена пароля |

## Тесты

```bash
npm test              # все тесты
npm run test:coverage # с покрытием
```

Тесты лежат в `__tests__/api.test.js`, конфиг — `jest.config.js`.

## Лицензия

MIT — см. [LICENSE](LICENSE)

## Автор

**[_ud2](https://github.com/Benqxc)** · [@Benqxc](https://github.com/Benqxc) · [Telegram](https://t.me/benqxc)
