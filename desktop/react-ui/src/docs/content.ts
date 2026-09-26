import type { Lang } from '../i18n'

const ru = `
# LCA·AI Studio — документация

Настольная студия оценки жизненного цикла (ОЖЦ) на движке openLCA: базы данных, моделирование производственных систем, расчёты LCIA, отчёты и AI-инструменты.

## Быстрый старт
1. Запустите приложение — движок openLCA стартует автоматически (индикатор не отображается намеренно).
2. На домашнем экране (кнопка «Базы и история» рядом с ☰) выберите базу данных слева или запись истории справа.
3. Откройте сущность: поиск (⌕ или Ctrl+K) либо навигатор слева.
4. Для расчёта откройте Process → секция «Расчёт» → выберите метод → «Рассчитать».

## Интерфейс
- **☰** — меню: Файл / Правка / Вид / Окно / Справка. Подменю раскрываются при наведении.
- **Кнопка «Базы и история»** (сетка с плюсом) — домашний экран: базы данных и история открытий БД.
- **Верхний бар**: иконки модулей (AI, сценарии, Plant Wizard, отчёты, Auto-Fill, облако, менеджер БД, глобальные параметры), справа — поиск, история, split, сайдбар, тема и кнопки окна.
- **Вкладки**: открытие сущностей создаёт вкладки; перетаскивание меняет порядок, двойной клик переименовывает, × закрывает; колесо мыши прокручивает полосу.
- **Split** (◫ или меню Вид) — две редакторные колонки.

## Базы данных
- Файл → **Создать БД…** / **Открыть БД…**; то же на домашнем экране (＋ слева).
- Менеджер БД (🗄 в баре или Файл): импорт/экспорт zip, копия базы, удаление.
- Переключение базы перезапускает движок автоматически.

## Модули
- **AI-оценка** (✦): описание продукта → структурированная оценка стадий и выбросов; результат можно сохранить в облако.
- **Сценарии** (◈): сравнение вариантов продукционных систем.
- **Plant Wizard** (⌂): мастер построения модели предприятия из справочных факторов.
- **Отчёты** (▤): Report Studio —Narrative от AI, таблицы, экспорт Word/PDF/Excel.
- **Auto-Fill** (📥): извлечение инвентарных чисел из статей/файлов (docx/pdf/xlsx/csv) и запись в БД как процессы «| LIT».
- **Облако** (☁): мои отчёты и мои БД в облаке (открыть/сохранить/удалить снимки).

## Расчёты и Монте-Карло
- Process → «Расчёт»: метод LCIA, запуск, результаты по потокам и категориям, вклады, Sankey.
- «Монте-Карло»: неопределённость по распределениям потоков; гистограммы и квантили.
- Project → варианты: сравнение нескольких продукционных систем по категориям.

## Отчёты и экспорт
- Report Studio собирает расчёт + AI-нарратив; экспорт: Word (.doc), PDF, Excel (.xlsx), CSV сравнений.

## Обновления
- Справка → «Проверить обновления»; установка тихая, приложение перезапустится само. Канал: GitHub Releases (lca-ai-releases).

## Горячие клавиши
| Клавиши | Действие |
| --- | --- |
| Ctrl+K | Поиск сущностей |
| Ctrl+Shift+P | Палитра команд |
| Ctrl+, | Настройки |
| Ctrl+Shift+S | Новая сессия |
| Ctrl+Shift+N | Новое окно |
| Ctrl+W / Ctrl+Tab | Закрыть вкладку / следующая вкладка |
| Ctrl+B | Сайдбар |
| Ctrl+0 / Ctrl++ / Ctrl+- | Масштаб |
`

const en = `
# LCA·AI Studio — documentation

A desktop life-cycle assessment studio on the openLCA engine: databases, product-system modelling, LCIA calculation, reports and AI tools.

## Quick start
1. Launch the app — the openLCA engine starts automatically (its status is intentionally hidden).
2. On the home screen (the "Databases & history" button next to ☰) pick a database on the left or a history entry on the right.
3. Open an entity: search (⌕ or Ctrl+K) or the navigator on the left.
4. To calculate: open a Process → "Calculate" section → pick a method → "Calculate".

## Interface
- **☰** — menu: File / Edit / View / Window / Help. Submenus fly out on hover.
- **"Databases & history" button** (grid with a plus) — home screen: databases and DB-open history.
- **Top bar**: module icons (AI, scenarios, Plant Wizard, reports, Auto-Fill, cloud, DB manager, global parameters); on the right — search, history, split, sidebar, theme and window buttons.
- **Tabs**: opening entities creates tabs; drag to reorder, double-click to rename, × to close; mouse wheel scrolls the strip.
- **Split** (◫ or View menu) — two editor columns.

## Databases
- File → **Create database…** / **Open database…**; same on the home screen (＋ on the left).
- DB manager (🗄 in the bar or File): zip import/export, copy, delete.
- Switching a database restarts the engine automatically.

## Modules
- **AI assessment** (✦): product description → structured stage/emission estimate; can be saved to the cloud.
- **Scenarios** (◈): compare product-system variants.
- **Plant Wizard** (⌂): build a plant model from reference factors.
- **Reports** (▤): Report Studio — AI narrative, tables, Word/PDF/Excel export.
- **Auto-Fill** (📥): extract inventory numbers from papers/files (docx/pdf/xlsx/csv) and write them to the DB as "| LIT" processes.
- **Cloud** (☁): my reports and my cloud databases (open/save/delete snapshots).

## Calculation & Monte-Carlo
- Process → "Calculate": LCIA method, run, flow/category results, contributions, Sankey.
- "Monte-Carlo": uncertainty over flow distributions; histograms and quantiles.
- Project → variants: compare several product systems across categories.

## Reports & export
- Report Studio assembles calculation + AI narrative; export: Word (.doc), PDF, Excel (.xlsx), comparison CSV.

## Updates
- Help → "Check for updates"; installation is silent, the app restarts itself. Feed: GitHub Releases (lca-ai-releases).

## Hotkeys
| Keys | Action |
| --- | --- |
| Ctrl+K | Entity search |
| Ctrl+Shift+P | Command palette |
| Ctrl+, | Settings |
| Ctrl+Shift+S | New session |
| Ctrl+Shift+N | New window |
| Ctrl+W / Ctrl+Tab | Close tab / next tab |
| Ctrl+B | Sidebar |
| Ctrl+0 / Ctrl++ / Ctrl+- | Zoom |
`

const zh = `
# LCA·AI Studio — 文档

基于 openLCA 引擎的桌面生命周期评估工作室：数据库、生产系统建模、LCIA 计算、报告与 AI 工具。

## 快速开始
1. 启动应用 — openLCA 引擎自动启动（状态有意隐藏）。
2. 在主屏幕（☰ 旁的「数据库与历史」按钮）左侧选择数据库，或右侧选择历史记录。
3. 打开实体：搜索（⌕ 或 Ctrl+K）或左侧导航器。
4. 计算：打开 Process →「计算」→ 选择方法 →「计算」。

## 界面
- **☰** — 菜单：文件 / 编辑 / 视图 / 窗口 / 帮助。悬停展开子菜单。
- **「数据库与历史」按钮**（带加号的网格）— 主屏幕：数据库与数据库打开历史。
- **顶栏**：模块图标（AI、情景、Plant Wizard、报告、Auto-Fill、云、数据库管理器、全局参数）；右侧 — 搜索、历史、分屏、侧栏、主题与窗口按钮。
- **标签页**：打开实体即创建标签；拖动排序，双击重命名，× 关闭；鼠标滚轮横向滚动。
- **分屏**（◫ 或视图菜单）— 双编辑列。

## 数据库
- 文件 → **创建数据库…** / **打开数据库…**；主屏幕同样（左侧 ＋）。
- 数据库管理器（顶栏 🗄 或文件）：zip 导入/导出、复制、删除。
- 切换数据库会自动重启引擎。

## 模块
- **AI 评估**（✦）：产品描述 → 结构化阶段/排放估算；可保存到云。
- **情景**（◈）：比较生产系统变体。
- **Plant Wizard**（⌂）：由参考因子构建工厂模型。
- **报告**（▤）：Report Studio — AI 叙述、表格、Word/PDF/Excel 导出。
- **Auto-Fill**（📥）：从论文/文件（docx/pdf/xlsx/csv）提取清单数字，并以「| LIT」过程写入数据库。
- **云**（☁）：我的报告与我的云数据库（打开/保存/删除快照）。

## 计算与蒙特卡洛
- Process →「计算」：LCIA 方法、运行、流/类别结果、贡献、Sankey。
- 「蒙特卡洛」：流分布的不确定性；直方图与分位数。
- Project → 变体：跨类别比较多个生产系统。

## 报告与导出
- Report Studio 汇总计算 + AI 叙述；导出：Word (.doc)、PDF、Excel (.xlsx)、比较 CSV。

## 更新
- 帮助 →「检查更新」；安装为静默，应用自动重启。源：GitHub Releases (lca-ai-releases)。

## 热键
| 按键 | 功能 |
| --- | --- |
| Ctrl+K | 实体搜索 |
| Ctrl+Shift+P | 命令面板 |
| Ctrl+, | 设置 |
| Ctrl+Shift+S | 新会话 |
| Ctrl+Shift+N | 新窗口 |
| Ctrl+W / Ctrl+Tab | 关闭标签 / 下一标签 |
| Ctrl+B | 侧栏 |
| Ctrl+0 / Ctrl++ / Ctrl+- | 缩放 |
`

export const DOCS: Record<Lang, string> = { ru, en, zh }
