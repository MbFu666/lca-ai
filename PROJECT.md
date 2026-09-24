# LCA·AI — проект

Web-платформа расчёта углеродного следа продуктов с ИИ-интерпретацией и реальными LCA-данными.

**Сайт:** https://lca-ai.ru (Cloudflare Pages)
**API:** https://api.lca-ai.ru (планируется, VPS)
**Supabase:** `pbisngkepszwzzjivxus` (Auth + PostgreSQL)
**Git:** https://github.com/MbFu666/lca-ai.git (branch `main`)
**Корень проекта:** `C:\Users\Administrator\Desktop\site\modules`

---

## Идея

Исходный lca-ai.ru использует DeepSeek для **всего**, включая генерацию коэффициентов эмиссии — AI «придумывает» цифры, точность не гарантируется.

**Ключевое улучшение — разделение ролей:**
- **DeepSeek** = только интерпретатор текста → структурированная инвентаризация (JSON)
- **openLCA / TianGong LCA** = проверенные коэффициенты и расчёты LCIA
- AI разбирает человеческий язык, openLCA даёт научно обоснованные данные

AI-коэффициенты остаются лишь fallback, если процесс не найден в базе.

---

## Архитектура

```
lca-ai.ru (фронтенд, Supabase, Cloudflare Pages)
        │  HTTPS REST
        ▼
┌──────────────────────────────────────────┐
│  Cloud VPS (Ubuntu, Docker)              │
│  ┌────────────────────────────────────┐  │
│  │  Python FastAPI  :8000            │  │
│  │  - DeepSeek: текст → JSON          │  │
│  │  - openLCA: поиск + расчёт LCIA    │  │
│  └───────────┬────────────────────────┘  │
│              │ localhost:8080 (JSON-RPC) │
│  ┌───────────▼────────────────────────┐  │
│  │  openLCA IPC Server                │  │
│  │  (Java 21, headless, Docker)       │  │
│  │  - TianGong LCA DB                 │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘

Desktop-приложение (LCA·AI Desktop, Тайри 2.x + Python)
  ┌──────────────────────────────┐
  │  Tauri 2.x (Rust shell)      │
  │  └─ React 19 + TypeScript    │
  └──────────────┬───────────────┘
                 │ JSON-RPC over stdio
  ┌──────────────▼───────────────┐
  │  Python LCA engine           │
  │  (numpy/scipy матрицы)       │
  │  SQLite ~/.lca-app/lca.db    │
  └──────────────────────────────┘
```

---

## Что сделано

### Веб-часть

| Файл | Статус | Что |
|------|--------|-----|
| `index.html` | ✅ | Главная, API_URL → `https://api.lca-ai.ru/api/calculate`, `callClaude()` шлёт описание+lang на FastAPI |
| `report.html` | ✅ | Отчёт, Monte Carlo, чувствительность, PDF/Word экспорт |
| `cabinet.html` | ✅ | Личный кабинет, 5 вкладок настроек |
| `login.html` | ✅ | OAuth: Google, GitHub, Twitter/X, Discord, WeChat |
| `share.html` | ✅ | Публичный просмотр отчётов |
| `supabase/` | ✅ | Edge Function `lca-proxy` (прокси DeepSeek, auth + rate limiting) |

### Backend (сервер)

| Файл | Статус | Что |
|------|--------|-----|
| `server/app.py` | ✅ | FastAPI, эндпоинт `POST /api/calculate` |
| `server/olca_client.py` | ✅ | Клиент openLCA IPC (JSON-RPC) |
| `server/deepseek_parser.py` | ✅ | Парсинг текста → структурированная инвентаризация |
| `server/models.py` | ✅ | Pydantic-модели запроса/ответа |
| `server/requirements.txt`, `server/Dockerfile` | ✅ | Зависимости и образ |

### Деплой

| Файл | Статус | Что |
|------|--------|-----|
| `deploy/docker-compose.yml` | ✅ | openLCA + FastAPI + nginx |
| `deploy/Dockerfile.olca` | ✅ | Образ с openLCA IPC сервером |
| `deploy/nginx.conf` | ✅ | TLS/прокси конфиг |
| `deploy/setup-vps.sh` | ✅ | Скрипт первичной настройки VPS |

### Десктоп

| Компонент | Статус | Что |
|-----------|--------|-----|
| `desktop/lca_engine/engine.py` | ✅ | Матричный solver (numpy/scipy) |
| `desktop/lca_engine/ilcd_importer.py` | ✅ | Импорт ILCD XML → SQLite |
| `desktop/lca_engine/methods.py` | ✅ | LCIA: IPCC AR6/AR5, ReCiPe 2016, CML 2001 |
| `desktop/lca_engine/rpc_server.py` | ✅ | JSON-RPC сервер (stdin/stdout) |
| `desktop/lca_engine/schema.sql` | ✅ | SQLite-схема |
| `desktop/react-ui/` | ✅ | React 19 + Vite + TS фронтенд |
| `desktop/tauri/` | ✅ | Tauri 2.x каркас (Cargo.toml, main.rs) |
| `desktop/run.py` | ✅ | Резервный лаунчер (Python RPC + React dev server) |
| `desktop/import_full.py` + `test_*.py` | ✅ | Импорт и тесты движка |

### Данные

- **TianGong LCA импортирован полностью**: ✅ 4133 процесса, 3216 потоков, 72978 обменов, 0 ошибок, 46 сек
- База: `C:\Users\Administrator\.lca-app\lca.db`
- Источник: `Desktop\site\TianGong-LCA-Data-main\tiangong_lca_data\` (ILCD XML, 89 категорий)
- Методология: IPCC AR6 GWP100 и др. реализованы в Python

---

## Что нужно сделать

### Блокировано / требует ручных действий пользователя

- [ ] **Установить Rust** — `static.rust-lang.org` недоступен из Китая (timeout 10060). Варианты: зеркало (rsproxy.cn, tuna), ручная загрузка rustup-init.exe, или использовать msys2/mingw пакет
- [ ] **Арендовать VPS** (4 GB RAM, 2 vCPU минимум) — Hetzner/DigitalOcean/Selectel
- [ ] **Запустить деплой**: `deploy/setup-vps.sh` → Docker Compose (openLCA + FastAPI + nginx)
- [ ] **DNS**: A-запись `api.lca-ai.ru` → IP VPS, выпустить SSL (Let's Encrypt)
- [ ] **DEEPSEEK_API_KEY** для FastAPI на VPS
- [ ] **openLCA DB на VPS**: экспортировать/скопировать Derby-БД с TianGong (или `.zolca` → импорт в контейнере)

### Функциональные доработки

- [ ] **Веб**: проверить end-to-end расчёт `POST /api/calculate` против живого openLCA IPC
- [ ] **Веб**: добавить `factor_source` («TianGong LCA») в отчёт, пометить AI-fallback процессы
- [ ] **Десктоп**: собрать рабочий билд Tauri после установки Rust
- [ ] **Десктоп**: JSON-RPC интеграция Tauri ↔ Python engine
- [ ] **Десктоп**: браузер базы данных (поиск по FTS5 среди 4133 процессов)
- [ ] **Десктоп**: редактор product system (drag-drop), визуализация потоков
- [ ] **Десктоп**: облачная синхронизация проектов с Supabase
- [ ] **Общее**: E2E-тесты (веб → VPS → openLCA) и (desktop → движок)

### Продакшен (позже)

- [ ] Платные базы данных: Ecoinvent (educational ~50–100 EUR/год), HiQLCD (85K+ наборов, Китай)
- [ ] Пакетный расчёт 100+ продуктов
- [ ] Инсталляторы Windows/macOS/Linux

---

## Стек

| Слой | Технология |
|------|-----------|
| Frontend (web) | HTML/CSS/JS (инлайн в index.html), PWA, i18n ru/en/zh |
| Backend (web) | Python 3.12 + FastAPI |
| LCA-расчёты (web) | openLCA 2.6.1 IPC (Java 21 headless) |
| База данных | TianGong LCA (бесплатно, Китай) + SQLite |
| Desktop shell | Tauri 2.x (Rust) |
| Desktop frontend | React 19 + TypeScript + Vite |
| Desktop движок | Python 3.12, numpy, scipy |
| Облако | Cloudflare Pages, Supabase (Auth + Postgres + Edge Functions) |
| ИИ | DeepSeek (интерпретация текста, НЕ расчёт) |

## Дизайн-система

- Ахроматично: `#F2F0EC` (бумага), `#1C1B19` (графит)
- Шкала эмиссии: `#B8B4AC` → `#F03B0C`
- Шрифты: Oswald, Source Serif 4, JetBrains Mono
- `border-radius: 0`, без теней и градиентов, без emoji (только SVG)

## Ключевые правила

- Не называть переменную `supabase` (конфликт с `window.supabase`) — использовать `sbClient`
- Git: `C:\Program Files\Git\cmd\git.exe` (не в PATH)
- После правки — commit + push (Cloudflare Pages пересобирает)
- **Никогда не предлагать Java** для десктопа (пользователь отверг)
- AI — интерпретатор, не калькулятор (коэффициенты только из LCA-базы)
- Alipay OAuth — отклонён, не добавлять
