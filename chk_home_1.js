
const API_URL = "https://pbisngkepszwzzjivxus.supabase.co/functions/v1/lca-proxy";  // Supabase Edge Function
const MODEL   = "deepseek-v4-flash";      // мультимодальная, дешёвая. Для сильнее: "deepseek-v4-pro"

const STAGE_COLORS = ["#2C4A3E", "#5B7860", "#B8753C", "#8B6F47", "#3D5A6C", "#7A3B2D"];
/* ============================================================
   i18n — словарь интерфейса
   ============================================================ */
const I18N = {
  ru: {
    /* shell */
    /* hero */
    eyebrow:      'оценка жизненного цикла · AI',
    h1:           'Углеродный след<br>продукта <em>за секунду</em>.',
    hero_sub:     'Опишите продукт — ИИ рассчитает углеродный след за 10 секунд',
    feat_speed:   'Быстрый расчёт',
    feat_speed_d: 'DeepSeek анализирует продукт за секунды, а не часы',
    feat_viz:     'Визуализация',
    feat_viz_d:   'Графы, диаграммы, рейтинги и детальный разбор по стадиям',
    feat_full:    'Полный цикл',
    feat_full_d:  'От добычи сырья до утилизации — полная оценка жизненного цикла',
    preview_label:'Пример результата',
    input_label:  'Описание продукта для расчёта LCA',
    how_title:    'Как это работает',
    step1_title:  'Опишите продукт',
    step1_d:      'Введите текстовое описание или загрузите Excel',
    step2_title:  'ИИ анализирует',
    step2_d:      'DeepSeek рассчитывает факторы эмиссии по всем стадиям',
    step3_title:  'Получите отчёт',
    step3_d:      'Визуализация, рекомендации и экспорт в PDF/Excel/Word',
    proof_calcs:  'расчётов выполнено',
    proof_countries: 'стран мира',
    proof_time:   'среднее время',
    cta_title:    'Готовы рассчитать углеродный след?',
    cta_sub:      'Бесплатно, без регистрации, за 10 секунд',
    cta_btn:      'Начать расчёт',
    auth_login:   'Войти',
    /* composer */
    mode_full:    'Полный цикл',
    mode_factor:  'Приоритет факторов',
    placeholder:  'Опишите продукт текстом, например: 1 кг наноцеллюлозы из жома сладкого сорго, произведённой в Северо-Восточном Китае…',
    upload:       'Изображение',
    submit:       'Рассчитать',
    examples_label: 'пример:',
    loader_status:  'расчёт',
    /* loader phases */
    phases: [
      'формируем функциональную единицу…',
      'подбираем коэффициенты эмиссии…',
      'моделируем стадию добычи сырья…',
      'оцениваем энергозатраты производства…',
      'учитываем логистику и упаковку…',
      'анализируем фазу использования…',
      'считаем конец жизненного цикла…',
      'собираем итоговый отчёт…'
    ],
    /* report */
    m_fu:        'Функциональная единица',
    m_sb:        'Границы системы',
    m_method:    'Метод оценки',
    m_region:    'Регион',
    total_h:     'Совокупный углеродный след',
    stages_h:    'Разбивка <em>по стадиям</em>',
    /* step tabs & views */
    step1:       'Модель процессов',
    step2:       'Результаты и анализ',
    view_tree:   'Граф',
    view_list:   'Список',
    export_json: 'JSON',
    export_print:'Отчёт',
    export_pdf:  'PDF',
    preview_word:'Предпросмотр Word',
    preview_pdf: 'Предпросмотр PDF',
    compare:     'Сравнить',
    history:     'История',
    compare_h:   'Сравнение продуктов',
    history_h:   'История расчётов',
    history_clear:'Очистить',
    history_empty:'История пуста',
    projects:    'Проекты',
    projects_h:  'Проекты',
    new_project: 'Новый',
    save_to_project:'В проект',
    detail_empty:'Выберите узел в дереве,<br>чтобы увидеть детали',
    contrib_h:   'Состав выбросов',
    hot_h:       'Горячие точки',
    crumb_suffix:'· Углеродный след',
    scope_full:  'Полный жизненный цикл',
    res_label:   'Углеродный след продукта (kgCO₂e):',
    res_label_short: 'Итого выбросы (kgCO₂e)',
    m_cycle:     'Период учёта',
    m_date:      'Дата расчёта',
    rank_h:      'Рейтинг выбросов',
    tab_stage:   'стадия',
    tab_type:    'тип',
    tab_source:  'источник',
    ai_suggest:  'Рекомендации ИИ',
    ai_thinking_lead: 'После глубокого анализа модель ИИ сформулировала ниже допущения, ограничения и рекомендации по снижению углеродного следа.',
    /* AI agent */
    ai_agent:        'AI Agent',
    agent_name:      'AI Agent',
    agent_details:   'Детализация модели',
    agent_empty:     'Расчёт ещё не запущен.<br>Сделайте первый расчёт — и я задам<br>уточняющие вопросы по модели.',
    agent_cta_hint:  'Я могу задать уточняющие вопросы<br>о вашей модели, чтобы повысить точность.',
    agent_cta_btn:   '✦ Сгенерировать вопросы',
    agent_msg_ph:    'Дополнить описание…',
    agent_loading:   'AI готовит уточняющие вопросы…',
    agent_recalc:    'Пересчёт с учётом ваших ответов…',
    chat_mode:       'Чат',
    step2_loading:   'Анализирую модель…',
    step2_cta_text:  'На этом шаге AI подготовит описание, ключевые допущения, ограничения и рекомендации по снижению. Это отдельный короткий запрос.',
    step2_cta_btn:   '▸ Сгенерировать анализ',
    /* edit model modal */
    edit_model:      'Edit Model',
    edit_model_h:    'Параметры расчёта',
    em_name:         'Название продукта',
    em_fu:           'Функциональная единица',
    em_qty:          'Учётное количество',
    em_cycle:        'Период учёта',
    em_method:       'Метод расчёта',
    em_method_quick: 'Quick',
    em_scope:        'Границы системы',
    scope_half:      'Half lifecycle',
    scope_half_d:    'От добычи сырья до производства, дистрибуции и хранения.',
    scope_full_t:    'Full lifecycle',
    scope_full_d:    'От добычи сырья до утилизации: производство, дистрибуция, использование, конец ЖЦ.',
    scope_custom:    'Custom lifecycle',
    stage_raw:       'Добыча сырья',
    stage_prod:      'Производство',
    stage_dist:      'Дистрибуция',
    stage_use:       'Использование',
    stage_eol:       'Конец ЖЦ',
    btn_close:       'Закрыть',
    btn_recalc:      'Пересчитать',
    /* edit mode */
    edit_mode:       'Редакт.',
    edit_banner_txt: '<b>Режим редактирования</b> — кликайте по тексту, чтобы изменить. Затем нажмите «Отчёт» для печати.',
    edit_banner_done:'Готово',
    /* excel */
    export_excel:    'Excel',
    export_word:     'Word',
    xls_h:           'Детальные данные',
    xls_preview:     'Предпросмотр данных, которые будут выгружены',
    xls_download:    'Скачать Excel',
    /* node details */
    d_type_root:    'Продукт',
    d_type_stage:   'Стадия ЖЦ',
    d_type_process: 'Подпроцесс',
    d_amount:    'Количество',
    d_factor:    'Фактор эмиссии',
    d_source:    'Источник',
    d_co2:       'CO₂-eq',
    d_share:     'Доля',
    d_desc:      'Описание',
    d_inputs:    'Входные потоки',
    /* flow table */
    ft_process:  'Процесс / поток',
    ft_amount:   'Кол-во',
    ft_factor:   'Фактор',
    ft_source:   'Источник',
    ft_co2:      'CO₂-eq',
    ft_share:    'Доля',
    ft_total:    'Итого',
    n_assump:    'Ключевые допущения',
    n_limit:     'Ограничения',
    n_rec:       'Рекомендации по снижению',
    /* misc */
    report_suffix: '— <em>углеродный след</em>',
    legend_share:  'доля',
    stage_share:   'доля',
    per_unit:      'ед.',
    back_to_search:'Новый расчёт',
    footer_left:   '© LCA·AI &nbsp; · &nbsp; Прототип на базе DeepSeek',
    /* errors */
    err_empty:    'Опишите продукт текстом для расчёта LCA.',
    err_api:      'Не удалось получить расчёт.',
    err_parse:    'Ответ не разобран как JSON.',
    err_not_lca:  'Этот инструмент рассчитывает <b>только оценку жизненного цикла</b> продуктов и материалов. Попробуйте описать конкретный продукт, например: «1 кг хлеба из пшеничной муки».',
    /* example chips */
    examples: [
      { l: 'Ржаной хлеб, 1 кг',  v: '1 кг ржаного хлеба, выпеченного в Польше, упакованного в крафт-пакет' },
      { l: 'Футболка, 200 г',    v: '1 хлопковая футболка массой 200 г, произведённая в Бангладеш, реализованная в ЕС' },
      { l: 'кВт·ч угольной э/э', v: '1 кВт·ч электроэнергии из угля, генерация на ТЭС' },
      { l: 'Молоко, 1 л',        v: '1 литр коровьего молока 2,5%, ферма в Беларуси, тетрапак' }
    ]
  },

  en: {
    meta_scope:   'SCOPE <b>cradle → grave</b>',
    eyebrow:      'life cycle assessment · AI',
    h1:           'A product carbon footprint,<br><em>in seconds</em>.',
    hero_sub:     'Describe a product — AI calculates its carbon footprint in 10 seconds',
    feat_speed:   'Instant Analysis',
    feat_speed_d: 'DeepSeek processes your product in seconds, not hours',
    feat_viz:     'Visualization',
    feat_viz_d:   'Graphs, charts, rankings and detailed stage-by-stage breakdown',
    feat_full:    'Full Lifecycle',
    feat_full_d:  'From raw material extraction to disposal — complete life cycle assessment',
    preview_label:'Example result',
    input_label:  'Product description for LCA calculation',
    how_title:    'How it works',
    step1_title:  'Describe the product',
    step1_d:      'Enter a text description or upload Excel',
    step2_title:  'AI analyzes',
    step2_d:      'DeepSeek calculates emission factors across all stages',
    step3_title:  'Get the report',
    step3_d:      'Visualization, recommendations and export to PDF/Excel/Word',
    proof_calcs:  'calculations performed',
    proof_countries: 'countries worldwide',
    proof_time:   'average time',
    cta_title:    'Ready to calculate your carbon footprint?',
    cta_sub:      'Free, no registration, 10 seconds',
    cta_btn:      'Start calculation',
    auth_login:   'Sign in',
    mode_full:    'Full life cycle',
    mode_factor:  'Factor preference',
    placeholder:  'Describe the product in text, e.g. 1 kg of nanocellulose from sweet sorghum bagasse, produced in northeast China…',
    upload:       'Image',
    submit:       'Calculate',
    examples_label: 'try:',
    loader_status:  'computing',
    phases: [
      'defining functional unit…',
      'matching emission factors…',
      'modelling raw material acquisition…',
      'estimating manufacturing energy…',
      'accounting for distribution and packaging…',
      'analysing use phase…',
      'computing end-of-life…',
      'compiling the report…'
    ],
    m_fu:        'Functional unit',
    m_sb:        'System boundary',
    m_method:    'Assessment method',
    m_region:    'Region',
    total_h:     'Total carbon footprint',
    stages_h:    'Breakdown <em>by stage</em>',
    step1:       'Process model',
    step2:       'Results & analysis',
    view_tree:   'Graph',
    view_list:   'List',
    export_json: 'JSON',
    export_print:'Report',
    export_pdf:  'PDF',
    preview_word:'Word Preview',
    preview_pdf: 'PDF Preview',
    compare:     'Compare',
    history:     'History',
    compare_h:   'Product Comparison',
    history_h:   'Calculation History',
    history_clear:'Clear',
    history_empty:'No history yet',
    projects:    'Projects',
    projects_h:  'Projects',
    new_project: 'New',
    save_to_project:'Save to project',
    detail_empty:'Pick a node in the tree<br>to see its details',
    contrib_h:   'Emission composition',
    hot_h:       'Hotspots',
    crumb_suffix:'· Carbon Footprint',
    scope_full:  'Full lifecycle',
    res_label:   'Product carbon footprint (kgCO₂e):',
    res_label_short: 'Total emissions (kgCO₂e)',
    m_cycle:     'Accounting cycle',
    m_date:      'Calculation date',
    rank_h:      'Emission ranking',
    tab_stage:   'stage',
    tab_type:    'type',
    tab_source:  'source',
    ai_suggest:  'AI Suggestions',
    ai_thinking_lead: 'After deep analysis, the AI has summarised the following key assumptions, limitations and emission-reduction recommendations.',
    ai_agent:        'AI Agent',
    agent_name:      'AI Agent',
    agent_details:   'Model refinement',
    agent_empty:     'No calculation yet.<br>Run a first calculation —<br>then I will ask clarifying questions.',
    agent_cta_hint:  'I can ask clarifying questions<br>about your model to improve accuracy.',
    agent_cta_btn:   '✦ Generate questions',
    agent_msg_ph:    'Add a note…',
    agent_loading:   'AI is preparing clarifying questions…',
    agent_recalc:    'Recalculating with your answers…',
    chat_mode:       'Chat',
    step2_loading:   'Analysing the model…',
    step2_cta_text:  'On this step the AI will prepare the description, key assumptions, limitations and reduction recommendations. It is a separate short request.',
    step2_cta_btn:   '▸ Generate analysis',
    edit_model:      'Edit Model',
    edit_model_h:    'Accounting details',
    em_name:         'Product name',
    em_fu:           'Functional unit',
    em_qty:          'Accounting quantity',
    em_cycle:        'Accounting cycle',
    em_method:       'Method',
    em_method_quick: 'Quick',
    em_scope:        'System boundary',
    scope_half:      'Half life cycle',
    scope_half_d:    'From resource extraction to product manufacturing, distribution and storage.',
    scope_full_t:    'Full lifecycle',
    scope_full_d:    'From resource extraction to product disposal: raw material acquisition, production, distribution and storage, product use, waste disposal.',
    scope_custom:    'Custom lifecycle',
    stage_raw:       'Raw material acquisition',
    stage_prod:      'Production and manufacturing',
    stage_dist:      'Distribution and storage',
    stage_use:       'Product usage',
    stage_eol:       'Abandoned disposal',
    btn_close:       'Close',
    btn_recalc:      'Recalculate',
    edit_mode:       'Edit',
    edit_banner_txt: '<b>Edit mode</b> — click any text to change it. Then click "Report" to print.',
    edit_banner_done:'Done',
    export_excel:    'Excel',
    export_word:     'Word',
    xls_h:           'Detail data',
    xls_preview:     'Preview of the data that will be exported',
    xls_download:    'Download Excel',
    d_type_root:    'Product',
    d_type_stage:   'Life-cycle stage',
    d_type_process: 'Sub-process',
    d_amount:    'Quantity',
    d_factor:    'Emission factor',
    d_source:    'Source',
    d_co2:       'CO₂-eq',
    d_share:     'Share',
    d_desc:      'Description',
    d_inputs:    'Input flows',
    ft_process:  'Process / flow',
    ft_amount:   'Qty',
    ft_factor:   'Factor',
    ft_source:   'Source',
    ft_co2:      'CO₂-eq',
    ft_share:    'Share',
    ft_total:    'Total',
    n_assump:    'Key assumptions',
    n_limit:     'Limitations',
    n_rec:       'Reduction recommendations',
    report_suffix: '— <em>carbon footprint</em>',
    legend_share:  'share',
    stage_share:   'share',
    per_unit:      'unit',
    back_to_search:'New calculation',
    footer_left:   '© LCA·AI &nbsp; · &nbsp; A DeepSeek-powered prototype',
    err_empty:    'Describe a product in text to calculate LCA.',
    err_api:      'Failed to fetch the calculation.',
    err_parse:    'Response could not be parsed as JSON.',
    err_not_lca:  'This tool only performs <b>life cycle assessment</b> of products and materials. Please describe a specific product, e.g. “1 kg of wheat flour bread”.',
    examples: [
      { l: 'Rye bread, 1 kg',     v: '1 kg of rye bread, baked in Poland, wrapped in kraft paper' },
      { l: 'T-shirt, 200 g',      v: '1 cotton T-shirt of 200 g, manufactured in Bangladesh, sold in the EU' },
      { l: 'kWh of coal power',   v: '1 kWh of electricity from a coal-fired power plant' },
      { l: 'Milk, 1 L',           v: '1 litre of 2.5% cow milk, dairy farm in Belarus, Tetra Pak' }
    ]
  },

  zh: {
    eyebrow:      '生命周期评价 · AI',
    h1:           '产品碳足迹，<br><em>秒级生成</em>。',
    hero_sub:     '描述产品 — AI 在 10 秒内计算碳足迹',
    feat_speed:   '快速计算',
    feat_speed_d: 'DeepSeek 在数秒内分析产品，而非数小时',
    feat_viz:     '可视化',
    feat_viz_d:   '图表、排名和详细的阶段分析',
    feat_full:    '全生命周期',
    feat_full_d:  '从原材料开采到废弃处置 — 完整的生命周期评估',
    preview_label:'结果示例',
    input_label:  '用于 LCA 计算的产品描述',
    how_title:    '工作原理',
    step1_title:  '描述产品',
    step1_d:      '输入文字描述或上传 Excel',
    step2_title:  'AI 分析',
    step2_d:      'DeepSeek 计算各阶段的排放因子',
    step3_title:  '获取报告',
    step3_d:      '可视化、建议和导出 PDF/Excel/Word',
    proof_calcs:  '次计算已完成',
    proof_countries: '个国家和地区',
    proof_time:   '平均用时',
    cta_title:    '准备好计算碳足迹了吗？',
    cta_sub:      '免费、无需注册、10 秒完成',
    cta_btn:      '开始计算',
    auth_login:   '登录',
    mode_full:    '全生命周期',
    mode_factor:  '因子优先',
    placeholder:  '请用文字描述产品，例如:1 kg 由甜高粱渣制备的纳米纤维素,中国东北地区生产…',
    upload:       '图片',
    submit:       '开始计算',
    examples_label: '示例:',
    loader_status:  '计算中',
    phases: [
      '正在确定功能单位…',
      '正在匹配排放因子…',
      '正在建模原材料获取阶段…',
      '正在估算生产能耗…',
      '正在核算配送与包装…',
      '正在分析使用阶段…',
      '正在计算寿命终结阶段…',
      '正在生成最终报告…'
    ],
    m_fu:        '功能单位',
    m_sb:        '系统边界',
    m_method:    '评价方法',
    m_region:    '地区',
    total_h:     '总碳足迹',
    stages_h:    '<em>分阶段</em>结果',
    step1:       '过程模型',
    step2:       '结果与分析',
    view_tree:   '图谱',
    view_list:   '列表',
    export_json: 'JSON',
    export_print:'报告',
    export_pdf:  'PDF',
    preview_word:'Word预览',
    preview_pdf: 'PDF预览',
    compare:     '对比',
    history:     '历史',
    compare_h:   '产品对比',
    history_h:   '计算历史',
    history_clear:'清除',
    history_empty:'暂无历史记录',
    projects:    '项目',
    projects_h:  '项目',
    new_project: '新建',
    save_to_project:'保存到项目',
    detail_empty:'在图谱中选择节点<br>查看详情',
    contrib_h:   '排放组成',
    hot_h:       '热点',
    crumb_suffix:'· 碳足迹',
    scope_full:  '全生命周期',
    res_label:   '产品碳足迹 (kgCO₂e):',
    res_label_short: '总排放 (kgCO₂e)',
    m_cycle:     '核算周期',
    m_date:      '计算日期',
    rank_h:      '排放排名',
    tab_stage:   '阶段',
    tab_type:    '类型',
    tab_source:  '来源',
    ai_suggest:  'AI 减排建议',
    ai_thinking_lead: '经过深度分析,AI 模型总结了以下关键假设、局限性与减排建议。',
    ai_agent:        'AI 助手',
    agent_name:      'AI 助手',
    agent_details:   '模型细化',
    agent_empty:     '尚未进行计算。<br>请先完成一次计算,<br>我会就模型提出补充问题。',
    agent_cta_hint:  '我可以就您的模型提出补充问题,<br>以提高准确度。',
    agent_cta_btn:   '✦ 生成问题',
    agent_msg_ph:    '补充说明…',
    agent_loading:   'AI 正在准备补充问题…',
    agent_recalc:    '正在根据您的回答重新计算…',
    chat_mode:       '聊天',
    step2_loading:   '正在分析模型…',
    step2_cta_text:  '本步骤将由 AI 生成描述、关键假设、局限性以及减排建议。这是一次独立的短请求。',
    step2_cta_btn:   '▸ 生成分析',
    edit_model:      '编辑模型',
    edit_model_h:    '核算详情',
    em_name:         '产品名称',
    em_fu:           '功能单位',
    em_qty:          '核算数量',
    em_cycle:        '核算周期',
    em_method:       '核算方法',
    em_method_quick: 'Quick',
    em_scope:        '系统边界',
    scope_half:      '半生命周期',
    scope_half_d:    '从资源获取到产品制造、分销和储存。',
    scope_full_t:    '全生命周期',
    scope_full_d:    '从资源获取到产品废弃:原料获取、生产制造、配送储存、产品使用、废弃处置。',
    scope_custom:    '自定义生命周期',
    stage_raw:       '原料获取',
    stage_prod:      '生产制造',
    stage_dist:      '配送储存',
    stage_use:       '产品使用',
    stage_eol:       '废弃处置',
    btn_close:       '关闭',
    btn_recalc:      '重新计算',
    edit_mode:       '编辑',
    edit_banner_txt: '<b>编辑模式</b> — 点击文本即可修改。然后点击"报告"打印。',
    edit_banner_done:'完成',
    export_excel:    'Excel',
    export_word:     'Word',
    xls_h:           '详细数据',
    xls_preview:     '将要导出的数据预览',
    xls_download:    '下载 Excel',
    d_type_root:    '产品',
    d_type_stage:   '生命周期阶段',
    d_type_process: '子过程',
    d_amount:    '数量',
    d_factor:    '排放因子',
    d_source:    '来源',
    d_co2:       'CO₂-eq',
    d_share:     '占比',
    d_desc:      '说明',
    d_inputs:    '输入流',
    ft_process:  '过程 / 物料',
    ft_amount:   '数量',
    ft_factor:   '因子',
    ft_source:   '来源',
    ft_co2:      'CO₂-eq',
    ft_share:    '占比',
    ft_total:    '合计',
    n_assump:    '关键假设',
    n_limit:     '局限性',
    n_rec:       '减排建议',
    report_suffix: '—— <em>碳足迹</em>',
    legend_share:  '占比',
    stage_share:   '占比',
    per_unit:      '单位',
    back_to_search:'新建计算',
    footer_left:   '© LCA·AI &nbsp; · &nbsp; 基于 DeepSeek 的原型',
    err_empty:    '请用文字描述产品以计算 LCA。',
    err_api:      '计算请求失败。',
    err_parse:    '响应无法解析为 JSON。',
    err_not_lca:  '本工具仅用于产品与材料的<b>生命周期评价</b>。请描述具体产品,例如 “1 kg 小麦粉面包”。',
    examples: [
      { l: '黑麦面包,1 kg',  v: '1 kg 波兰烘焙的黑麦面包,牛皮纸包装' },
      { l: 'T 恤,200 g',      v: '1 件 200 g 棉质 T 恤,孟加拉国生产,欧盟销售' },
      { l: '1 kWh 煤电',      v: '1 kWh 来自燃煤电厂的电力' },
      { l: '牛奶,1 L',        v: '1 升 2.5% 牛奶,白俄罗斯牧场,利乐包装' }
    ]
  }
};
const LANG_NAMES = { ru: 'Russian', en: 'English', zh: 'Chinese (Simplified)' };

let currentLang = 'zh';
let currentMode = 'full';
let uploadedImage = null;
let phaseTimer = null;
let lastReport = null;   // последний отрисованный отчёт — для re-render и экспорта
let originalProduct = ''; // оригинальное описание продукта (без уточнений)
let agentRefinements = ''; // уточнения от AI агента
let isAgentRefining = false; // флаг режима уточнений через агента

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
/* ── Modal helpers ── */
function showModal(id) {
  const mask = document.getElementById(id);
  if (mask) mask.classList.add('show');
}
function closeModal(id) {
  const mask = document.getElementById(id);
  if (mask) mask.classList.remove('show');
}
// Close modal on overlay click or [data-close] button
document.addEventListener('click', e => {
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) {
    const mask = closeBtn.closest('.modal-mask');
    if (mask) mask.classList.remove('show');
    return;
  }
  if (e.target.classList.contains('modal-mask')) {
    e.target.classList.remove('show');
  }
});
/* ============================================================
   History — сохранение истории расчётов в localStorage
   ============================================================ */
const HISTORY_KEY = 'lca-history';
const MAX_HISTORY = 20;

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch { return []; }
}

async function saveToHistory(report) {
  if (!report) {
    console.error('[saveToHistory] report is null/undefined');
    return;
  }
  
  // Save to Supabase FIRST to get UUID
  let supabaseId = null;
  if (currentUser && supabaseClient) {
    console.log('[saveToHistory] Saving to Supabase...');
    try {
      const { data, error } = await supabaseClient.from('user_history').insert({
        user_id: currentUser.id,
        product_title: report.product_title,
        functional_unit: report.functional_unit,
        total_co2eq: report.total_co2eq,
        report_data: report
      }).select('id').single();
      
      if (error) {
        console.error('[saveToHistory] Supabase error:', error);
      } else if (data) {
        supabaseId = data.id;
        report._supabaseId = data.id;
        console.log('[saveToHistory] Saved to Supabase, UUID:', supabaseId);
      }
    } catch (err) {
      console.error('[saveToHistory] Exception:', err);
    }
  }
  
  // Save to localStorage with Supabase UUID (or Date.now() as fallback)
  const history = getHistory();
  const entry = {
    id: supabaseId || Date.now(),
    date: new Date().toISOString(),
    product: report.product_title,
    fu: report.functional_unit,
    total: report.total_co2eq,
    data: report
  };
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  
  if (!currentUser) {
    console.log('[saveToHistory] No currentUser, saved to localStorage only');
  }
  }


function loadFromHistory(id) {
  const history = getHistory();
  return history.find(h => h.id === id);
}
/* ============================================================
   Caching — кэширование ответов API
   ============================================================ */
const CACHE_KEY = 'lca-cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

function getCacheKey(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return 'lca_' + Math.abs(hash).toString(36);
}

function getCached(text) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    const key = getCacheKey(text);
    const entry = cache[key];
    if (entry && Date.now() - entry.ts < CACHE_TTL) {
      console.log('[LCA] Cache hit');
      return entry.data;
    }
  } catch {}
  return null;
}

function setCache(text, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    const key = getCacheKey(text);
    cache[key] = { ts: Date.now(), data };
    // Ограничиваем размер кэша
    const keys = Object.keys(cache);
    if (keys.length > 50) {
      delete cache[keys[0]];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {}
}
function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  const t = I18N[lang];
  $$('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (t[k] !== undefined) el.textContent = t[k];
  });
  $$('[data-i18n-html]').forEach(el => {
    const k = el.dataset.i18nHtml;
    if (t[k] !== undefined) el.innerHTML = t[k];
  });
  $$('[data-i18n-placeholder]').forEach(el => {
    const k = el.dataset.i18nPlaceholder;
    if (t[k] !== undefined) el.placeholder = t[k];
  });
  renderExampleChips();
  $$('.lang button').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
}
function renderExampleChips() {
  const host = $('#exampleChips');
  host.innerHTML = '';
  I18N[currentLang].examples.forEach(ex => {
    const b = document.createElement('button');
    b.textContent = ex.l;
    b.dataset.ex = ex.v;
    b.addEventListener('click', () => {
      $('#productInput').value = ex.v;
      $('#productInput').focus();
    });
    host.appendChild(b);
  });
}
/* ============================================================
   Drag & Drop for Excel files
   ============================================================ */
const dropZone = document.getElementById('composerDropZone');
const excelInput = document.getElementById('excelInput');

if (dropZone) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
  });

  dropZone.addEventListener('drop', handleDrop, false);
}

async function handleDrop(e) {
  const files = e.dataTransfer.files;
  if (files.length) {
    const file = files[0];
    if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
      await processExcelFile(file);
    } else {
      showError('Пожалуйста, перетащите Excel файл (.xlsx, .xls, .csv)');
    }
  }
}

if (excelInput) {
  excelInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await processExcelFile(file);
  });
}

async function processExcelFile(file) {
  await loadLib('xlsx');
  if (typeof XLSX === 'undefined') {
    showError('Библиотека XLSX не загружена');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      // Convert to text description
      let description = 'Данные из Excel файла ' + file.name + ':\n';
      jsonData.forEach((row, i) => {
        if (i < 10 && row.length) { // First 10 rows
          description += row.join(', ') + '\n';
        }
      });
      
      document.getElementById('productInput').value = description;
      document.getElementById('uploadName').textContent = file.name;
    } catch (err) {
      showError('Ошибка чтения файла: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}
async function run() {
  const product = $('#productInput').value.trim();
  const t = I18N[currentLang];

  if (!product) {
    showError(t.err_empty);
    return;
  }
  
  // Сохраняем оригинальное описание (без уточнений)
  originalProduct = product;
  
  hideError();
  $('#submitBtn').disabled = true;
  $('#loader').classList.add('show');

  setTimeout(() => $('#loader').scrollIntoView({behavior:'smooth', block:'center'}), 50);
  phaseTimer = cyclePhases();

  try {
    // Формируем полный текст для API: оригинальное описание + уточнения
    const fullText = agentRefinements 
      ? product + '\n\n' + agentRefinements 
      : product;
    
    // Проверяем кэш
    let data = getCached(fullText);
    if (!data) {
      data = await callClaude(fullText);
      setCache(fullText, data);
    }
    clearInterval(phaseTimer);

    // фильтр «только LCA» — модель сама помечает не-LCA запросы
    if (data && data.error === 'not_lca') {
      showError(t.err_not_lca + (data.message ? '<br><i>' + escape(data.message) + '</i>' : ''));
      return;
    }
    
    // Сохраняем в историю
    await saveToHistory(data);
    // Navigate to results page with history ID
    const historyId = data._supabaseId || Date.now();
    window.location.href = '/?history=' + historyId;
    return;
  } catch (err) {
    clearInterval(phaseTimer);
    console.error(err);
    showError(t.err_api + ' <b>' + (err.message || err) + '</b>');
  } finally {
    $('#loader').classList.remove('show');
    $('#submitBtn').disabled = false;
  }
}
function cyclePhases() {
  const phases = I18N[currentLang].phases;
  let i = 0;
  $('#loaderMsg').textContent = phases[0];
  return setInterval(() => {
    i = (i + 1) % phases.length;
    const el = $('#loaderMsg');
    el.style.opacity = 0;
    setTimeout(() => {
      el.textContent = phases[i];
      el.style.transition = 'opacity .25s';
      el.style.opacity = 1;
    }, 200);
  }, 1500);
}
async function apiCall(messages, opts = {}) {
  const body = {
    model: MODEL,
    messages,
    max_tokens: opts.max_tokens || 5000,
    temperature: opts.temperature ?? 0.2,
    stream: false
  };
  // response_format только для JSON-запросов (не для чата)
  if (opts.json !== false) {
    body.response_format = { type: 'json_object' };
  }

  const t0 = Date.now();
  const token = localStorage.getItem('supabase_token') || SUPABASE_ANON_KEY;
  const headers = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { error: raw.slice(0, 500) }; }

  console.log(`[LCA] ${opts.label || 'call'} ${elapsed}s, status=${res.status}`);

  if (!res.ok) {
    const upstream = data.upstream_body || data.error || raw.slice(0, 200);
    let hint = '';
    if (res.status === 401 || /insufficient|balance|payment/i.test(upstream)) {
      hint = ' — возможно, закончился баланс на DeepSeek.';
    } else if (res.status === 504 || /timeout/i.test(upstream)) {
      hint = ' — попробуйте более короткое описание.';
    } else if (res.status === 404 || /model.*not.*found/i.test(upstream)) {
      hint = ' — модель не найдена.';
    }
    throw new Error(`API ${res.status}${hint}<br><small style="font-family:monospace;opacity:0.7">${escape(upstream).slice(0, 300)}</small>`);
  }

  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) {
    const reason = data?.choices?.[0]?.finish_reason || 'unknown';
    if (reason === 'length') {
      throw new Error(
        'DeepSeek обрезал ответ по лимиту длины. ' +
        'Если вы добавляли уточнения через AI Agent — попробуйте упростить вопросы или нажать «Новый расчёт» с обычным описанием.'
      );
    }
    if (reason === 'content_filter') {
      throw new Error('DeepSeek заблокировал ответ по фильтру контента. Попробуйте переформулировать запрос.');
    }
    throw new Error(
      `DeepSeek вернул пустой ответ (finish_reason: ${reason}). ` +
      `Возможные причины: закончился баланс на platform.deepseek.com, либо слишком сложный запрос.`
    );
  }
  return text;
}
let jsonWorker = null;
let workerCallbacks = new Map();
let workerIdCounter = 0;

function initJsonWorker() {
  try {
    jsonWorker = new Worker('/json-worker.js');
    jsonWorker.addEventListener('message', (e) => {
      const { id, success, result, error } = e.data;
      const callback = workerCallbacks.get(id);
      if (callback) {
        workerCallbacks.delete(id);
        if (success) {
          callback.resolve(result);
        } else {
          callback.reject(new Error(error));
        }
      }
    });
  } catch (e) {
    console.warn('[LCA] Web Worker not available, using main thread');
  }
}

function parseJsonWithWorker(text) {
  return new Promise((resolve, reject) => {
    if (!jsonWorker) {
      // Fallback to main thread
      try {
        resolve(parseJsonResponseSync(text));
      } catch (e) {
        reject(e);
      }
      return;
    }
    
    const id = ++workerIdCounter;
    workerCallbacks.set(id, { resolve, reject });
    jsonWorker.postMessage({ id, action: 'parse', data: { text } });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (workerCallbacks.has(id)) {
        workerCallbacks.delete(id);
        // Fallback to main thread
        try {
          resolve(parseJsonResponseSync(text));
        } catch (e) {
          reject(e);
        }
      }
    }, 5000);
  });
}

function parseJsonResponseSync(text) {
  const cleaned = String(text).replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const first = cleaned.indexOf('{');
  if (first < 0) {
    console.error('[LCA] No JSON object in response. Raw:', text);
    throw new Error(I18N[currentLang].err_parse + ' (нет JSON в ответе)');
  }

  const body = cleaned.slice(first);

  // Попытка 1 — как есть до последней }
  try {
    const last = body.lastIndexOf('}');
    return JSON.parse(body.slice(0, last + 1));
  } catch (e1) {}

  // Попытка 2 — экранируем неэкранированные \n и \r внутри строк
  try {
    return JSON.parse(escapeInlineNewlines(body));
  } catch (e2) {}

  // Попытка 3 — экранируем + ремонтируем обрезанный хвост
  try {
    return JSON.parse(repairTruncatedJson(escapeInlineNewlines(body)));
  } catch (e3) {}

  // Попытка 4 — только ремонт обрезанного хвоста
  try {
    return JSON.parse(repairTruncatedJson(body));
  } catch (e4) {}

  // Попытка 5 — индустриальная библиотека jsonrepair
  if (typeof window !== 'undefined' && window.JSONRepair && window.JSONRepair.jsonrepair) {
    try {
      const repaired = window.JSONRepair.jsonrepair(body);
      console.warn('[LCA] JSON починен через jsonrepair');
      return JSON.parse(repaired);
    } catch (e5) {
      console.error('[LCA] jsonrepair тоже не справился:', e5.message);
    }
  }

  throw new Error(I18N[currentLang].err_parse);
}

async function callClaude(productText) {
  const langName = LANG_NAMES[currentLang];
  const modeNote = currentMode === 'factor'
    ? 'Prefer well-known emission factor databases (Ecoinvent, IPCC AR6, CCDB, GREET).'
    : '';

  // КОМПАКТНЫЙ промпт — только структура, БЕЗ analytical text.
  const systemPrompt =
`LCA expert (ISO 14067, PAS 2050). Reply with VALID JSON ONLY in ${langName}. ${modeNote}

If input is not a product/material/process/energy carrier for LCA → reply:
{"error":"not_lca","message":"<one-sentence reason in ${langName}>"}

Else reply with this exact schema:
{
  "product_title": "...",
  "functional_unit": "...",
  "system_boundary": "cradle-to-grave",
  "method": "IPCC AR6 GWP100",
  "region": "...",
  "accounting_cycle": "YYYY-MM-DD ~ YYYY-MM-DD",
  "total_co2eq": <number>,
  "stages": [
    {
      "name": "<stage name>",
      "co2eq": <number>,
      "share_pct": <number>,
      "description": "<≤ 12 words>",
      "key_inputs": ["...", "..."],
      "factor_source": "Ecoinvent 3.10",
      "sub_processes": [
        {"name":"...", "amount":<n>, "unit":"kg", "factor":<n>, "factor_unit":"kg CO2-eq/kg", "factor_source":"...", "co2eq":<n>}
      ]
    }
  ]
}

5 stages required (in ${langName}): Raw material acquisition, Manufacturing, Distribution, Use phase, End of life.
Each stage = exactly 2 sub_processes. Numbers in kg CO2-eq. share_pct sums to 100.

HARD CONSTRAINTS — failure to comply will break the parser:
- Output must fit within 8000 tokens. Be concise but complete.
- Every string value MUST be a SINGLE LINE — NO newlines, NO line breaks inside any string.
- Stage and sub_process names ≤ 8 words. Descriptions ≤ 15 words.
- DO NOT include any fields outside the schema (no assumptions/limitations/recommendations/total_description/notes).
- If the input contains "Уточнения" / "refinements" — keep output structure identical, just update values.`;

  const userContent = [
    {
      type: 'text',
      text: productText
    }
  ];

  const text = await apiCall(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userContent }
    ],
    { max_tokens: 8000, temperature: 0.2, label: 'stage1-model' }
  );
  return parseJsonResponse(text);
}
function escapeInlineNewlines(s) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { out += ch; esc = true; continue; }
    if (ch === '"')  { out += ch; inStr = !inStr; continue; }
    if (inStr) {
      if (ch === '\n')      out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else if (ch.charCodeAt(0) < 0x20) out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
      else out += ch;
    } else {
      out += ch;
    }
  }
  return out;
}
function repairTruncatedJson(s) {
  // Снимаем висячий хвост после неполного значения
  s = s.replace(/,\s*$/, '');
  // Если последний символ — внутри строки, обрезаем до закрывающей кавычки
  // (грубо: до последней неэкранированной ")
  const lastQuote = s.lastIndexOf('"');
  const lastClose = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const num = Number(n);
  if (Math.abs(num) >= 100) return num.toFixed(0);
  if (Math.abs(num) >= 10)  return num.toFixed(1);
  if (Math.abs(num) >= 1)   return num.toFixed(2);
  return num.toFixed(3);
}

function escape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showError(msg) {
  const e = $('#errorBox');
  e.innerHTML = msg;
  e.classList.add('show');
}
function hideError() { $('#errorBox').classList.remove('show'); }
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}
const PROJECTS_KEY = 'lca-projects';

function getProjects() {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
  } catch { return []; }
}

function saveProjectLocal(project) {
  const projects = getProjects();
  const existing = projects.findIndex(p => p.id === project.id);
  if (existing >= 0) {
    projects[existing] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

async function createProject(name) {
  // Save to Supabase FIRST to get UUID
  let supabaseId = null;
  if (currentUser && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('user_projects').insert({
        user_id: currentUser.id,
        name: name
      }).select('id').single();
      
      if (error) {
        console.error('[createProject] Supabase error:', error);
      } else if (data) {
        supabaseId = data.id;
        console.log('[createProject] Saved to Supabase, UUID:', supabaseId);
      }
    } catch (err) {
      console.error('[createProject] Exception:', err);
    }
  }
  
  // Save to localStorage with Supabase UUID (or Date.now() as fallback)
  const project = {
    id: supabaseId || Date.now(),
    name,
    createdAt: new Date().toISOString(),
    calculations: []
  };
  saveProjectLocal(project);
  return project;
}

async function addToProject(projectId, report) {
  const projects = getProjects();
  const project = projects.find(p => p.id === projectId);
  if (project) {
    // Save to Supabase if logged in and projectId is a UUID
    let supabaseId = null;
    if (currentUser && supabaseClient && projectId) {
      try {
        const { data, error } = await supabaseClient.from('project_calculations').insert({
          project_id: projectId,
          user_id: currentUser.id,
          report_data: report
        }).select('id').single();
        
        if (error) {
          console.error('[addToProject] Supabase error:', error);
        } else if (data) {
          supabaseId = data.id;
          console.log('[addToProject] Saved to Supabase, UUID:', supabaseId);
        }
      } catch (err) {
        console.error('[addToProject] Exception:', err);
      }
    }
    
    project.calculations.push({
      id: supabaseId || Date.now(),
      product: report.product_title,
      total: report.total_co2eq,
      data: report,
      addedAt: new Date().toISOString()
    });
    saveProjectLocal(project);
  }
}

function deleteProject(projectId) {
  console.log('deleteProject: Starting delete for projectId:', projectId);
  
  // Validate projectId
  if (!projectId) {
    console.error('deleteProject: projectId is invalid:', projectId);
    return;
  }
  
  // Check if projectId is a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
  const isUUID = typeof projectId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
  
  // Delete from localStorage (always, regardless of ID format)
  const projects = getProjects().filter(p => p.id !== projectId);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  console.log('deleteProject: Deleted from localStorage');
  
  // Delete from Supabase only if logged in AND projectId is a valid UUID
  if (isUUID && currentUser && supabaseClient) {
    console.log('deleteProject: Deleting from Supabase...');
    
    // Delete project_calculations
    supabaseClient.from('project_calculations')
      .delete()
      .eq('project_id', projectId)
      .then(({ data, error }) => {
        if (error) {
          console.error('deleteProject: Error deleting project_calculations:', error);
        } else {
          console.log('deleteProject: Successfully deleted from project_calculations:', data);
        }
      });
    
    // Delete user_projects
    supabaseClient.from('user_projects')
      .delete()
      .eq('id', projectId)
      .then(({ data, error }) => {
        if (error) {
          console.error('deleteProject: Error deleting user_projects:', error);
        } else {
          console.log('deleteProject: Successfully deleted from user_projects:', data);
        }
      });
  } else if (!isUUID) {
    console.log('deleteProject: Skipping Supabase delete - projectId is not a UUID:', projectId);
  }
  
  console.log('deleteProject: Delete operation completed');
}

function deleteCalcFromProject(projectId, calcId) {
  // Delete from localStorage
  const projects = getProjects();
  const project = projects.find(p => p.id === projectId);
  if (project) {
    project.calculations = project.calculations.filter(c => c.id !== calcId);
    saveProjectLocal(project);
  }
  // Delete from Supabase if logged in and ID is UUID
  if (currentUser && supabaseClient && typeof calcId === 'string' && calcId.includes('-')) {
    supabaseClient.from('project_calculations').delete().eq('id', calcId)
      .then(({ error }) => {
        if (error) console.error('[deleteCalcFromProject] Supabase error:', error);
        else console.log('[deleteCalcFromProject] Deleted from Supabase:', calcId);
      });
  }
}
async function createProject(name) {
  // Save to Supabase FIRST to get UUID
  let supabaseId = null;
  if (currentUser && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('user_projects').insert({
        user_id: currentUser.id,
        name: name
      }).select('id').single();
      
      if (error) {
        console.error('[createProject] Supabase error:', error);
      } else if (data) {
        supabaseId = data.id;
        console.log('[createProject] Saved to Supabase, UUID:', supabaseId);
      }
    } catch (err) {
      console.error('[createProject] Exception:', err);
    }
  }
  
  // Save to localStorage with Supabase UUID (or Date.now() as fallback)
  const project = {
    id: supabaseId || Date.now(),
    name,
    createdAt: new Date().toISOString(),
    calculations: []
  };
  saveProjectLocal(project);
  return project;
}

async function addToProject(projectId, report) {
  const projects = getProjects();
  const project = projects.find(p => p.id === projectId);
  if (project) {
    // Save to Supabase if logged in and projectId is a UUID
    let supabaseId = null;
    if (currentUser && supabaseClient && projectId) {
      try {
        const { data, error } = await supabaseClient.from('project_calculations').insert({
          project_id: projectId,
          user_id: currentUser.id,
          report_data: report
        }).select('id').single();
        
        if (error) {
          console.error('[addToProject] Supabase error:', error);
        } else if (data) {
          supabaseId = data.id;
          console.log('[addToProject] Saved to Supabase, UUID:', supabaseId);
        }
      } catch (err) {
        console.error('[addToProject] Exception:', err);
      }
    }
    
    project.calculations.push({
      id: supabaseId || Date.now(),
      product: report.product_title,
      total: report.total_co2eq,
      data: report,
      addedAt: new Date().toISOString()
    });
    saveProjectLocal(project);
  }
}
function saveProjectLocal(project) {
  const projects = getProjects();
  const existing = projects.findIndex(p => p.id === project.id);
  if (existing >= 0) {
    projects[existing] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}
function initJsonWorker() {
  try {
    jsonWorker = new Worker('/json-worker.js');
    jsonWorker.addEventListener('message', (e) => {
      const { id, success, result, error } = e.data;
      const callback = workerCallbacks.get(id);
      if (callback) {
        workerCallbacks.delete(id);
        if (success) {
          callback.resolve(result);
        } else {
          callback.reject(new Error(error));
        }
      }
    });
  } catch (e) {
    console.warn('[LCA] Web Worker not available, using main thread');
  }
}
function parseJsonWithWorker(text) {
  return new Promise((resolve, reject) => {
    if (!jsonWorker) {
      // Fallback to main thread
      try {
        resolve(parseJsonResponseSync(text));
      } catch (e) {
        reject(e);
      }
      return;
    }
    
    const id = ++workerIdCounter;
    workerCallbacks.set(id, { resolve, reject });
    jsonWorker.postMessage({ id, action: 'parse', data: { text } });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (workerCallbacks.has(id)) {
        workerCallbacks.delete(id);
        // Fallback to main thread
        try {
          resolve(parseJsonResponseSync(text));
        } catch (e) {
          reject(e);
        }
      }
    }, 5000);
  });
}
document.addEventListener('DOMContentLoaded', async function() {
  console.log('[LCA] Initializing...');

  // Ждём завершения авторизации
  await checkAuth();
    // URL params (?history=, ?project=) handled by index.html only

  var savedTheme = localStorage.getItem('lca-theme');
  var themeToggle = document.getElementById('themeToggle');

  // Автоопределение тёмной темы: localStorage > системные настройки
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
  if (themeToggle) {
    var isDark = document.documentElement.classList.contains('dark');
    themeToggle.textContent = isDark ? String.fromCodePoint(0x2600, 0xFE0F) : String.fromCodePoint(0x1F319);
    themeToggle.addEventListener('click', function() {
      document.documentElement.classList.toggle('dark');
      var isDark = document.documentElement.classList.contains('dark');
      themeToggle.textContent = isDark ? String.fromCodePoint(0x2600, 0xFE0F) : String.fromCodePoint(0x1F319);
      localStorage.setItem('lca-theme', isDark ? 'dark' : 'light');
    });
  }

  // Автоопределение языка: браузерный > localStorage > ru по умолчанию
  var browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  var savedLang = localStorage.getItem('lca-lang');
  if (savedLang && savedLang !== 'zh') {
    // Используем сохранённый язык, кроме zh (китайский не по умолчанию)
    applyLanguage(savedLang);
  } else if (browserLang.startsWith('ru')) {
    applyLanguage('ru');
  } else if (browserLang.startsWith('en')) {
    applyLanguage('en');
  } else {
    applyLanguage('ru');
  }

  document.querySelectorAll('.lang button').forEach(function(b) {
    b.addEventListener('click', function() {
      applyLanguage(b.dataset.lang);
      localStorage.setItem('lca-lang', b.dataset.lang);
    });
  });
  
  document.getElementById('submitBtn').addEventListener('click', run);
  document.getElementById('productInput').addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run();
  });
  
  // backToHome removed - no home page in this file
  
  document.addEventListener('click', function(e) {
    var stepBtn = e.target.closest('.cs-step');
    if (stepBtn) switchStep(stepBtn.dataset.step);
    var viewBtn = e.target.closest('.cs-view button');
    if (viewBtn) switchView(viewBtn.dataset.view);
  });
  
  document.getElementById('exportExcel').addEventListener('click', function() { if (lastReport) { buildExcelPreview(lastReport); showModal('modalExcel'); } });
  document.getElementById('exportWord').addEventListener('click', function() { if (lastReport) showWordPreview(lastReport); });
  document.getElementById('exportJson').addEventListener('click', function() { if (lastReport) downloadJson(lastReport); });
  document.getElementById('exportPdf').addEventListener('click', function() { showPdfPreview(); });
  document.getElementById('exportPrint').addEventListener('click', function() { window.print(); });
  
  document.getElementById('agentClose').addEventListener('click', function() {
    document.getElementById('agent').classList.remove('show');
  });
  document.getElementById('agentFab').addEventListener('click', function() {
    document.getElementById('agent').classList.add('show');
  });
  // Скрываем FAB на главной странице
  if (document.getElementById('pageHome') && !document.getElementById('pageHome').classList.contains('hidden')) {
    document.getElementById('agentFab').classList.remove('show');
  }
  document.getElementById('agentSend').addEventListener('click', function() {
    var msg = document.getElementById('agentMsg').value.trim();
    if (typeof agentChatMode !== 'undefined' && agentChatMode) { sendChatMessage(msg); } else { applyAgentAnswers(); }
  });
  
  document.querySelectorAll('.modes button').forEach(function(b) {
    b.addEventListener('click', function() {
      document.querySelectorAll('.modes button').forEach(function(x) { x.classList.remove('active'); });
      b.classList.add('active');
      currentMode = b.dataset.mode;
    });
  });
  
  var examples = [
    { l: '\u9ED1\u9EA6\u9762\u5305, 1 kg', v: '1 kg \u6CE2\u5170\u70D8\u7119\u7684\u9ED1\u9EA6\u9762\u5305\uFF0C\u725B\u76AE\u7EB8\u5305\u88C5' },
    { l: 'T\u6064, 200g', v: '1 \u4EF6 200g \u68C9\u8D28 T \u6064\uFF0C\u5B5F\u52A0\u62C9\u56FD\u751F\u4EA7' },
    { l: '1 kWh \u7164\u7535', v: '1 kWh \u6765\u81EA\u7164\u706B\u7535\u5382\u7684\u7535\u529B' },
    { l: '\u725B\u5976, 1L', v: '1 \u5347 2.5% \u725B\u5976\uFF0C\u767D\u4FC4\u7F57\u65AF\u7267\u573A' }
  ];
  var host = document.getElementById('exampleChips');
  if (host) {
    examples.forEach(function(ex) {
      var b = document.createElement('button');
      b.textContent = ex.l;
      b.addEventListener('click', function() {
        document.getElementById('productInput').value = ex.v;
        document.getElementById('productInput').focus();
      });
      host.appendChild(b);
    });
  }
  
  console.log('[LCA] Init complete');
});
  var examples = [
    { l: '\u9ED1\u9EA6\u9762\u5305, 1 kg', v: '1 kg \u6CE2\u5170\u70D8\u7119\u7684\u9ED1\u9EA6\u9762\u5305\uFF0C\u725B\u76AE\u7EB8\u5305\u88C5' },
    { l: 'T\u6064, 200g', v: '1 \u4EF6 200g \u68C9\u8D28 T \u6064\uFF0C\u5B5F\u52A0\u62C9\u56FD\u751F\u4EA7' },
    { l: '1 kWh \u7164\u7535', v: '1 kWh \u6765\u81EA\u7164\u706B\u7535\u5382\u7684\u7535\u529B' },
    { l: '\u725B\u5976, 1L', v: '1 \u5347 2.5% \u725B\u5976\uFF0C\u767D\u4FC4\u7F57\u65AF\u7267\u573A' }
  ];
  var host = document.getElementById('exampleChips');
  if (host) {
    examples.forEach(function(ex) {
      var b = document.createElement('button');
      b.textContent = ex.l;
      b.addEventListener('click', function() {
        document.getElementById('productInput').value = ex.v;
        document.getElementById('productInput').focus();
      });
      host.appendChild(b);
    });
  }
  
  console.log('[LCA] Init complete');
