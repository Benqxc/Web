<div align="center">

# Web

**`_ud2`** · [Benqxc](https://github.com/Benqxc)

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://github.com/Benqxc/Web)
[![Express](https://img.shields.io/badge/Express-API-000000?style=flat-square&logo=express&logoColor=white)](https://github.com/Benqxc/Web)
[![PWA](https://img.shields.io/badge/PWA-ready-7B61FF?style=flat-square)](https://github.com/Benqxc/Web)

</div>

---

Персональный био-сайт с отслеживанием посетителей, админ-панелью и PWA.

## Быстрый старт

### Railway

1. Создай проект на [Railway](https://railway.app)
2. Подключи этот репозиторий
3. Задай переменные окружения (см. ниже)
4. Деплой запустится автоматически по `package.json`

### Переменные окружения

Скопируй `.env.example` в `.env`:

```env
# PostgreSQL (Railway)
DATABASE_URL=postgresql://user:password@host:port/database

# Security
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate limiting
LOGIN_RATE_LIMIT=5
LOGIN_RATE_WINDOW_MS=900000

# Server
PORT=3000
NODE_ENV=production
```

## Структура

```
├── __tests__/          # API tests
├── api/                # Vercel serverless functions
├── public/             # Static assets (PWA, admin UI)
├── server.js           # Express server (Railway)
├── package.json
└── .env.example
```

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

## Локальная разработка

```bash
npm install
npm run dev      # development
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

## Лицензия

MIT — см. [LICENSE](LICENSE)

## Автор

**[_ud2](https://github.com/Benqxc)** · [@Benqxc](https://github.com/Benqxc) · [Telegram](https://t.me/benqxc)
