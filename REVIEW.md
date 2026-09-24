# Ревью LCA·AI — что исправить и улучшить

Дата: 2026-09-25
Метод: 4 углублённых код-ревью (фронтенд index+PWA, фронтенд report/cabinet/login/project/share, сервер+деплой+Supabase, desktop) + живая проверка прода (рендер, темы, Lighthouse, robots.txt, PWA-иконки).

Итоговые оценки Lighthouse (главная): Accessibility 0.75, Best Practices 1.0, SEO 0.8 (robots.txt отсутствует — Pages отдаёт HTML).

---

## Критично: сломаны основные пользовательские сценарии

1. **Анонимный расчёт не работает, хотя лендинг обещает обратное.** При отсутствии сессии в `Authorization` уходит anon-ключ (`index.html:5031`, `report.html:4642`), который `lca-proxy` отвергает через `getUser()` → гарантированный 401 (`supabase/functions/lca-proxy/index.ts:62-67`). Текст ошибки при этом говорит «закончился баланс DeepSeek» (`index.html:5053-5054`, `report.html:4664-4665`) — неверная диагностика для «нужно войти».
2. **Клик по истории/проекту на главной падает с TypeError.** `renderReport()` обращается к `#crumbProduct`, `#resName` и др., которых в `index.html` больше нет (разметка отчёта перенесена в report.html): `index.html:6671, 6926 → 5360-5368`. Модальное окно зависает, отчёт не открывается. Плюс `parseInt(item.dataset.project)` по UUID → NaN (`index.html:6918, 6939`): расчёт из списка проектов не открывается, локальное удаление молча не работает при рассинхроне с БД.
3. **Двойной биндинг `#agentSend`** (`index.html:6359` + `7518`): одно нажатие = два вызова `sendChatMessage()`/`applyAgentAnswers()` = двойные API-запросы и двойные траты токенов.
4. **Race в «Создать и сохранить»**: `createProject(name)` вызван без `await` (`index.html:7144-7149`, `report.html:7322-7327`) → `project.id === undefined`, `addToProject(undefined,…)` не работает; следом `saveProject(name)` создаёт второй проект-дубль в `user_projects` — прямое противоречие комментарию `index.html:7009`.
5. **Битый HTML в Word-превью report.html**: строки таблицы стадий и итог задублированы, вторая группа `<tr>` стоит после `</table>` (`report.html:7373-7379`) — невалидная разметка. В `index.html:7193-7197` того же бага нет: классический дрейф копипаста.
6. **Фейковая авторизация**: `JSON.parse(localStorage['supabase_user'])` читается без try/catch и без валидации сессии и включает «залогиненный» UI (`index.html:73-77`, `report.html:73-77`); `requireAuth()` (`report.html:124-125`) доверяет этому `currentUser`. Ключ никем не записывается (только removeItem) — мёртвый, но опасный паттерн: любая запись в ключ локально включает «залогиненный» UI.

## Критично: безопасность

7. **openLCA IPC (JSON-RPC без аутентификации) опубликован в интернет**: `ports: "8080:8080"` на всех интерфейсах (`deploy/docker-compose.yml:9-10`), firewall/ufw в `deploy/setup-vps.sh` не настраивается. Любой может дёргать движок напрямую. API-контейнер тоже торчит наружу в обход nginx (`docker-compose.yml:25-26`): без TLS, без лимитов размера тела.
8. **CORS `allow_origins=["*"]` + `allow_credentials=True`** (`server/app.py:15-21`) — Starlette в этой комбинации эхом отражает произвольный Origin: фактически разрешены credentialed-запросы с любого сайта.
9. **Electron: эскалация до RCE из рендерера** — `file:write` / `file:write-base64` принимают любой путь без allowlist (`electron/main.cjs:792-802`, проброшено в `electron/preload.cjs:34-35`); `file:extract-text` читает любой файл (`main.cjs:1148-1177`); `engine:config-set` позволяет подменить исполняемый `javaExe`/`libsDir` (`main.cjs:690-694` → spawn `:289-306`); command injection в распаковке zip через интерполяцию пути в PowerShell (`main.cjs:497-500`). Нет CSP (`index.html`), нет `sandbox: true` (`main.cjs:644-648`), `shell.openExternal` без фильтра протоколов (`:657-660`). При XSS (рендерится недоверенный AI-контент) — полный захват системы.
10. **Пароль кодового сертификата захардкожен в отслеживаемых скриптах**: `$Password = 'LcaAi2026!'` в `desktop/react-ui/tools/sign-release.ps1:7` и `tools/publish-release.ps1:18`. Сам `buildResources/lcaai-codesign.pfx` самоподписанный — клиенты не могут валидировать издателя фида автообновлений.
11. **Внутренности бэкенда публикуются как статика**: корень репо = корень Cloudflare Pages, поэтому публично доступны `supabase/functions/*.ts` (логика service_role: share-edit, share-view, delete-account), `supabase/functions/migration.sql` (вся схема БД + RLS), `deploy/setup-vps.sh`, `docker-compose.yml`, `nginx.conf`, `.mcp.json`, `PROJECT.md`. Злоумышленник получает полную карту бэкенда.
12. **CDN-скрипты без SRI и нет CSP нигде**: ни одного `integrity=` в проекте (supabase-js, jsonrepair, xlsx, jspdf, html2canvas, jszip: `index.html:23-24,36-51`, `report.html:23-24,36-40`, `login.html:212`, `share.html:186`, `cabinet.html:18-19`, `project.html:19-33`); `@supabase/supabase-js@2` — плавающая мажорная версия. Meta-CSP нет, `_headers` для Pages нет, `add_header` в nginx нет. Supply-chain-компрометация CDN = XSS на всём сайте без второго рубежа.
13. **Математика desktop-движка неверна**: решается леонтьевское `(I−A)·s = f` вместо LCA-ного `A·s = f`; размерности `A (n_flows × p_processes)` и `eye(p)` не сходятся → ValueError при n≠p, fallback `lsqr` падает там же (`desktop/lca_engine/engine.py:136-143`). B-матрица не строится (мёртвые `rows_B/vals_B`, `engine.py:86`), факторы применяются ко всем потокам включая входы (`engine.py:152-163`). В `desktop/react-ui/src/lib/uncertainty.ts:20,58,63` дизельное сгорание учтено дважды (double counting во всех Monte Carlo/сценариях).
14. **Деплой не поднимется с нуля**: nginx требует сертификаты при старте (crash-loop на голом VPS, `deploy/nginx.conf:27-28`), а certbot-webroot лежит на хосте, а не в docker-томе (`setup-vps.sh:41` vs `docker-compose.yml:45`) — ACME-челлендж не попадёт в контейнер. Healthcheck openLCA бьёт GET в JSON-RPC-сервер → вечно unhealthy → `api` с `depends_on: service_healthy` никогда не стартует (`docker-compose.yml:14-18,31-33`).

## Major: архитектура и качество кода

15. **index.html и report.html — два форка одного файла**: ~6500 из ~7950 строк идентичны (~80-83%, ~250 КБ дублей): весь CSS, I18N-словари (уже разошлись: 746 строк против 603), Supabase-слой, apiCall, экспорт, модалки, history/projects. Дрейф уже породил баги №2-5 и расхождения (🌙-кнопка есть в index и пустая в report; `border-radius:8px` в index против 0 в report; `<title>` report.html скопирован с главной). То же по всем 6 страницам: design-токены повторены в 6 файлах, supabase-init — 6 раз, 4 реализации вызова lca-proxy, 3 реализации Word-экспорта, 5 разных `esc()`. Вынести в общие `tokens.css`, `base.css`, `i18n.js`, `supabase-init.js`, `api.js`, `export.js` — иначе каждая правка = синхронизация шести файлов по 100-300 КБ.
16. **Git-гигиена**: нет корневого `.gitignore`; **весь `server/`, весь `desktop/lca_engine/`, `desktop/tauri/`, все `test_*.py`, `run.py`, `import_full.py`, а также `react-ui/vite.config.ts`, `tsconfig.json`, `index.html`, `scripts/` не закоммичены** — свежий клон не собирается; в рабочей копии `opencode.log` (0.9 МБ), `release/` (2.8 ГБ), `node_modules/` (1.5 ГБ); в `.git` мусорный tmp-объект (`.git/objects/2e/tmp_obj_yMbOTC`). Отслеживается всего 94 файла.
17. **Tauri vs Electron — архитектурная шизофрения**: PROJECT.md описывает «Tauri 2.x + Python numpy/scipy», фактически шелл — Electron (`package.json:6` → `electron/main.cjs`), релизы собраны electron-builder, бэкенд — Java openLCA по HTTP :8080. `desktop/tauri/` — мёртвый скаффолд: RPC-мост теряет буферизованные байты (`tauri/src/main.rs:79-82`), запускает системный `python`, нет каталога icons из конфига; корневой `react-ui/main.cjs` — устаревшая копия `electron/main.cjs` (не отслеживается git).
18. **Сервер (FastAPI)**: нет лимита размера входа (`server/models.py:7` — `description` без `max_length`) → неконтролируемые расходы DeepSeek; rate-limit lca-proxy — in-memory Map на isolate, сбрасывается при cold-start и не разделяется между нодами (`supabase/functions/lca-proxy/index.ts:8-21`); nginx-таймаут 120 с против расчёта до >180 с (`server/olca_client.py:96-103` vs `deploy/nginx.conf:41`) → гарантированные 504; product system в openLCA никогда не удаляется, при провале не диспоузится и result (`olca_client.py:85,92-93`); новый `httpx.AsyncClient` на каждый RPC-вызов (`olca_client.py:33`, `deepseek_parser.py:122`); `raise_for_status()` убивает ретраи, `choices[0]` даст IndexError при пустом списке (`deepseek_parser.py:119-135`); ответ LLM не валидируется, Pydantic-модели мёртвы (`server/app.py:119`, `models.py:14-53`); внутренние ошибки утекают клиенту (`app.py:126`); Docker под root без `.dockerignore` (`server/Dockerfile`); нет HSTS и security-заголовков, слабые ssl_ciphers (`nginx.conf:23-47`); мёртвый секрет `DEEPSEEK_API_KEY` в compose (`docker-compose.yml:29`).
19. **Supabase Edge Functions**: `send-share-email` без rate-limit и дедупликации — авторизованный пользователь может бомбить произвольные адреса письмами через Resend; `delete-account` неатомарен (данные стираются до `auth.admin.deleteUser`, при сбое — аккаунт без данных); 500 без CORS-заголовков из-за отсутствия try/catch (`send-share-email.ts:43-46`, `delete-account.ts:28-31`); `share-edit` пишет `report_data` без лимита размера/схемы и без optimistic locking; счётчик просмотров — гонка lost-update (`share-view.ts:98-101`); токен в query-string утекает в логи/referer.
20. **Импорт данных в desktop**: ре-импорт удваивает все обмены (нет unique-ограничения в `schema.sql:23-33`, нет удаления старых: `importer.py:127-131`, `ilcd_importer.py:200-203`) → кратное завышение результатов; ILCD-импорт потоков молча не работает: XPath `[@xml:lang="en"]` → SyntaxError в ElementTree, проглоченный `except: pass` (`ilcd_importer.py:154,170`) — ни один flow-файл не импортируется; захардкожен машиноспецифичный путь (`ilcd_importer.py:17`).
21. **PWA сломан**: `/icon-192.png`, `/icon-512.png` не существуют (прод отдаёт HTML со статусом 200 — SPA-fallback; проверено), `apple-touch-icon` битый, установка PWA невозможна; `theme_color:#F03B0C` в manifest конфликтует с `<meta theme-color #F2F0EC>`; `cache.addAll()` с cross-origin URL роняет весь install при отказе любого ресурса (`sw.js:19-25`); версионирование кэша ручным бампом `CACHE_NAME`, cache-first для ресурсов без content-hash; `rel="manifest"` только на index/report.
22. **Уязвимая зависимость `xlsx@^0.18.5`** (`desktop/react-ui/package.json:32`): npm-пакет заброшен, CVE-2023-30533 (prototype pollution) и CVE-2024-22363 (ReDoS) исправлены только в дистрибутиве SheetJS ≥0.19.3/0.20.2. Дублируется уже используемым exceljs (`src/lib/xlsx.ts`).
23. **Сборка desktop привязана к машине разработчика**: `extraResources` из `D:/openLCA/jre` и `D:/openLCA/plugins/...` (`electron-builder.yml:16-20`, дефолты в `electron/main.cjs:120-121`); конфиг фида обновлений противоречив (github-провайдер в yml против «generic feed on Supabase Storage» в скриптах).

## Дизайн

### Что хорошо (сохранить)

- Дизайн-система в целом выдержана: на живом сайте 0 скруглений / 0 теней / 0 градиентов в computed-стилях; типографика Oswald / Source Serif 4 / JetBrains Mono читается и работает на контрасте масштабов.
- Светлая и тёмная темы переключаются корректно (класс + `localStorage lca-theme`).
- Canvas-диаграмма: пауза off-screen, уважение `prefers-reduced-motion`.
- Проработанные design-токены (`index.html:330-412`), последовательное экранирование AI-данных через `escape()`.

### Нарушения собственной ДС и проблемы UI

24. **Emoji вместо SVG** (правило «без emoji, только SVG»): 🌙/☀️ в переключателе темы (`index.html:3215`, JS-подмена `7456/7460`, `login.html:137,451`), 🍶 в модалке параметров (`index.html:3450`), 👤 в чате (`index.html:6311`), ⬇//✓/✦/⚑/★/✎/ в кнопках (`index.html:3433,3525,3549,3568,3600`, `report.html:3508`, `project.html:240-245,1120`, `cabinet.html:2792`). Подтверждено на проде визуально и в DOM. Скрытые `font-size:0` emoji остаются в DOM и озвучиваются скринридерами.
25. **Тени / градиенты / скругления точечно**: реальная тень `.suggest-box` (`index.html:854,859`); inline `border-radius:8px` (`index.html:140-141,3556,3575`); градиент-заполнение спарклайна и skeleton-градиент (`cabinet.html:2202-2204,369`). Сетку `body::before` через linear-gradient (есть на всех страницах) стоит наоборот легализовать в ДС как осознанный приём; функциональные `border-radius:50%` (слайдер, аватар) — задокументировать как исключение.
26. **Старая зелёная палитра в экспорте** нарушает ахроматичность: `#0E2E27`, `#ECFAF4`, `#F8FAFA` (`index.html:5921,7194-7196,7327-7337`, `report.html:5778,7373-7378,7509-7519`); legacy-алиасы `--jade/--radius/--shadow-*` консервируют старую палитру (`index.html:378-389`, `cabinet.html:41-53` + блок `!important` `cabinet.html:396-413`). Word/PDF-документы не соответствуют сайту.
27. **Контраст ниже WCAG AA**: `--graphite-low #9B978F` на `#F2F0EC` = 2.55:1 для 10-13px mono-подписей в 30+ местах (`share.html:86,93,112`, eyebrow/`.src` в index/report/cabinet); в тёмной теме `#6B6862` на `#131211` ≈ 3.4:1. Отсюда Lighthouse Accessibility = 0.75.
28. **A11y-минимум не закрыт** (Lighthouse-фейлы подтверждены): нет `<main>`-landmark; пропущены уровни заголовков; aria-атрибуты не по ролям; фокусируемые элементы внутри `aria-hidden="true"` (открытая панель агента, `index.html:3406,7511-7513`); модалки без `role="dialog"`/`aria-modal`/focus-trap/Escape (`index.html:3442-3627`, `report.html:4305-4312`); `<label>` без `for` (`cabinet.html:766-798`, OTP `login.html:191,194`, поиск `project.html:251`, edit-инпуты `share.html:541-545`); вкладки без `aria-selected`/`aria-controls` (`cabinet.html:610-614`, `report.html:3196-3205`); битые skip-link с лишним `>` и несуществующей целью (`share.html:150`, `login.html:130`); мелкий touch-target; невидимый фокус у динамических input'ов (`index.html:6964,7102`, `#productInput` `835` перебивает `:focus-visible`); toast без `aria-live`; canvas без `role="img"` и клавиатурного доступа (`index.html:3243`).
29. **i18n-рассинхрон**: выбранный zh никогда не восстанавливается после перезагрузки (`index.html:7468`); автоопределение китайского есть только в cabinet/project/share — китайский браузер получает русский интерфейс на index/report/login; ключи языка `lca_lang` (share) против `lca-lang` (все остальные); «Hi, I'm AI Agent» и все ошибки API всегда по-русски (`report.html:4665-4689`); после JS-рендера data-i18n теряется и кнопка «Войти» не переводится; перепутаны ключи подписей в Excel-экспорте (`report.html:7392` `word_boundary` = «границы системы» в строке functional unit, `:7396`); сотни инлайновых тернарников вместо словарей, часть без zh-ветки; непереводимые `title` и aria-label; Noto Sans SC не подключён на cabinet/project/login, хотя zh-интерфейс там полный.
30. **Responsive слаб на login (0 media-запросов), cabinet/project (2-3)** против 10-14 в index/report; таблицы инвентаризации share.html на <640px просто уменьшают шрифт вместо горизонтального скролла.
31. **Мелкие UI-обманы и несогласованности**: панель «Активные сессии» показывает только текущую сессию на deprecated `navigator.platform` (`cabinet.html:3206-3216`); статистика суммирует kg CO₂e по разным функциональным единицам, хотя комментарий рядом объясняет, что это бессмысленно (`cabinet.html:2078-2081` vs `1963-1995`); тост «у вас последняя версия» показывается и при ошибке апдейтера/сети (`desktop/react-ui/src/App.tsx:300-313`); пустое значение uncertainty отображается как 0 (`ExchangeDetails.tsx:51`); тройные перекрывающиеся запросы `user_history` при каждом init cabinet (`cabinet.html:1949,1961,2052`).
32. **SEO**: robots.txt отсутствует — Pages отдаёт HTML главной (Lighthouse: «robots.txt is not valid», SEO 0.8); `<title>` report.html скопирован с главной (`report.html:19`).

## Minor (выборочно)

- `console.log` с payload'ами отчётов, user_id и UUID в прод-консоли (40+ мест: `index.html:246-248,4526`, `report.html:239-242,300-307,7601`, `cabinet.html:1787,1900-1907`) — утечка PII в devtools.
- ~800 строк мёртвого кода в index.html (renderReport/renderFlow/модалки Word/PDF/Excel, биндинги несуществующих кнопок `7502-7506`) и ~200 строк скопированного мёртвого кода в report.html (Excel-загрузка, example-chips, CSS `#productInput`).
- `function escape()` затеняет глобальный built-in (`index.html:6177`, `report.html:6304`) — переименовать в `escHtml`.
- 32-битный самописный хэш как ключ кэша AI-ответов: коллизия вернёт чужой отчёт; eviction полагается на порядок ключей (`index.html:4578-4609`).
- `localStorage.setItem` с полными JSON отчётов без try/catch: QuotaExceededError маскируется под «ошибку API» (`index.html:4545,6704,6789`, `report.html:6875-6884`).
- Магические числа без именованных констант (setTimeout 1500/150/2500, лимиты 10/50).
- ~100 top-level const/let/function без модулей/IIFE + `window.__flowSetData`, второй `run(el)` маскирует основной `run()`.
- Отчёт хранится в трёх местах сразу: две sessionStorage-схемы + localStorage-кэш (`report.html:5141,7667,164-171`); `/report.html` без параметров молча рендерит прошлый отчёт.
- `navigator.platform` deprecated; `window.confirm` блокирует UI (`App.tsx:74`); тема хранится в трёх местах сразу (`App.tsx:47,134-140`).
- SQLite: FTS5-таблицы не наполняются (нет триггеров) и не используются (обычный LIKE без экранирования `%`/`_`), `PRAGMA foreign_keys` не включён, дублирующие колонки `input`/`is_input` (`schema.sql:27,30`).
- RPC-сервер: `handle()` вне try (JSON-массив роняет процесс), утечка старого соединения, `str(e)` утекает в ответ (`rpc_server.py:150,53,28`).
- Логи stdio Java-движка выбрасываются пустыми обработчиками (`electron/main.cjs:308-309`) — диагностика падения движка невозможна.
- FlowPicker грузит все дескрипторы потоков в память и режет до 300 на клиенте, виртуализация не используется (`FlowPicker.tsx:24-33`).
- entityCache: N+1 (`getAllUnitGroups` по запросу на группу) и ручная инвалидация в 15 компонентах (`entityCache.ts:21-27`).
- Двойной fallback SDK в project.html (jsdelivr + unpkg) → возможна двойная загрузка (`project.html:19-33`).
- Discord и WeChat в login.html — заглушки-alert, хотя PROJECT.md заявляет их как OAuth; комментарий противоречит коду про провайдера 'x' (`login.html:365-384`).
- OTP-вход теряет `?next=` — редирект жёстко на '/' (`login.html:553`).

## Сильные стороны (не ломать)

- Последовательное экранирование AI-данных через `escape()` во всех рендерах (renderFlow/renderHistory/renderProjects/renderAgent/renderCompare); `eval`/`new Function`/`document.write` отсутствуют.
- RLS во всех миграциях настроен корректно (owner-only политики, `audit_log` — только insert/select).
- `safeNext()` в login.html закрывает open-redirect.
- Network-first для HTML в sw.js; ленивая загрузка xlsx/jspdf/html2canvas; `display=swap` у шрифтов.
- Design-токены и canvas-диаграмма (пауза off-screen, prefers-reduced-motion).
- Версии в `server/requirements.txt` запинены.
- Полные i18n-словари ru/en/zh (181-182 ключа) на главных страницах.

---

## План действий (приоритетный порядок)

1. **Хотфиксы главного пути** (п.1-6): анонимный сценарий (гейт или анонимный токен через edge-функцию), убрать двойной биндинг `#agentSend`, `await createProject()`, починить клики истории/проектов в index.html, битый word-preview, удалить мёртвый `supabase_user`-паттерн.
2. **Безопасность** (п.7-14): закрыть `8080`/`8000` (bind 127.0.0.1 + firewall), починить CORS, добавить CSP (`_headers` для Pages + meta) и SRI на все CDN-скрипты, allowlist путей IPC в Electron + `sandbox: true` + CSP, экранирование в extractZip, пароль PFX в env/секреты и замена самоподписанного сертификата, убрать `supabase/` и `deploy/` из публикуемого корня (приватный репо или подкаталог вне Pages-рута), добавить robots.txt, починить certbot/healthcheck в деплое.
3. **Репозиторий** (п.16): корневой `.gitignore` (логи, release/, node_modules/, __pycache__), закоммитить `server/` и `desktop/lca_engine/` с тестами и `vite.config.ts`, удалить мёртвый `desktop/tauri/` и корневой `react-ui/main.cjs`, привести PROJECT.md в соответствие с реальностью (Electron, а не Tauri), вычистить `opencode.log`/`release/` из рабочей копии, убрать tmp-объект из `.git`.
4. **Дедупликация фронтенда** (п.15): общие `tokens.css`, `base.css`, `i18n.js`, `supabase-init.js`, `api.js`, `export.js`, `esc.js`; единый ключ языка `lca-lang`; единый автодетект zh; подключить Noto Sans SC на всех страницах с zh.
5. **Дизайн-проход** (п.24-32): SVG-иконки вместо emoji (инвентаризация: theme-toggle, модалки, кнопки выгрузки, статусы); убрать тень `.suggest-box` и inline-радиусы; единая ахроматическая палитра экспорта; поднять контраст `--graphite-low` (и тёмный аналог) до ≥4.5:1; a11y-минимум (`<main>`, dialog-роли + focus-trap + Esc, label/for, aria-selected, починить skip-link, touch-target ≥24px, видимый фокус); легализовать в ДС сетку-градиент и функциональные радиусы; title/robots для SEO.
6. **Надёжность сервера и движка** (п.13,18-20): общий deadline запроса и согласование с nginx-таймаутом, пул httpx, dispose product system/result, валидация ответа LLM через Pydantic-модели, rate-limit на KV, лимиты размера входа; unique-ограничения и идемпотентность импорта, починка ILCD XPath; починка или удаление математики `lca_engine`, устранение double counting дизеля; замена `xlsx` на exceljs/SheetJS-дистрибутив.

---

## ������ ���������� (2026-09-25)

| ����� | ������ | ������ / ���������� |
|---|---|---|
| 1-6 (P1 ��������) | ? done | 34f6060 |
| 7-10,12,14 (P2 ������������) | ? done | b804bfb, 5270adf (SRI/�������) |
| 11 (Pages-root) | ? repo restructured > www/ | 8467915; **��������� ���� � Cloudflare dashboard** (Build output = www) |
| 13 (����������/uncertainty) | ? done | 653d859 + ���� double-count ������ |
| 15 (������������) | ? �������� | 77cb2e6�6178066, 517ce16 (assets: esc/supabase-init/api/i18n-��������/export.js; 6 �������); **������� I18N � ������� ��������� � accepted debt** (����� �������-������) |
| 16 (git-�������) | ? done | 32294d4 |
| 17 (Tauri) | ? done (�����) | 32294d4 |
| 18 (������) | ? done | 653d859 |
| 19 (edge functions) | ? done | 3d7ef0c |
| 20 (������) | ? done | 653d859 |
| 21 (PWA) | ? deferred | ������/manifest � ������� ��������� �������; ������ ��������� |
| 22 (xlsx CVE) | ? done | 17c5630 (desktop), 5270adf (site>SheetJS 0.20.2+SRI) |
| 23 (machine-specific build) | ? partial | feed=github; extraResources ���� �� ��� D:/openLCA (dev-������) |
| 24-31 (������/a11y) | ? done | e7712ab, 6f3564e, 3e29239, 9eea1a6, 07d49d3, f7ef038, f4b32a7; **������� emoji � ������ ������� � label-for � ������������� ������ � accepted debt** |
| 32 (SEO) | ? done | robots.txt + title (3e29239) |
| minor (PII-����, escape, lsSet, hash, FTS5, N+1, windowing, platform, uncertainty placeholder, rpc_server, engine.log, OTP next, Discord stub) | ? done | 2cbf7d5, c25eb0e, b442148, 9e4dca7, f4b32a7 |
| dead code index/report (~1000 ���) | ? accepted debt | �������� ������ � ���������� �������-�������� |
| magic numbers | ? accepted debt | ��������� |
| I18N-������� merge | ? accepted debt | �������� �����; ������� ������� ������� |
