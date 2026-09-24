-- LCA·AI Desktop — SQLite schema
-- Inspired by olca-core but simplified for local use

CREATE TABLE IF NOT EXISTS processes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    location TEXT,
    process_type TEXT DEFAULT 'unit',
    ref_id TEXT UNIQUE,
    last_modified TEXT
);

CREATE TABLE IF NOT EXISTS flows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    flow_type TEXT DEFAULT 'elementary',
    ref_id TEXT UNIQUE,
    last_modified TEXT
);

CREATE TABLE IF NOT EXISTS exchanges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_id TEXT NOT NULL,
    flow_id TEXT NOT NULL,
    input BOOLEAN DEFAULT 0,
    amount REAL DEFAULT 0,
    unit TEXT DEFAULT 'kg',
    is_input BOOLEAN DEFAULT 0,
    FOREIGN KEY (process_id) REFERENCES processes(id),
    FOREIGN KEY (flow_id) REFERENCES flows(id)
);

CREATE TABLE IF NOT EXISTS impact_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    ref_id TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS impact_factors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flow_id TEXT NOT NULL,
    impact_category_id TEXT NOT NULL,
    factor REAL NOT NULL,
    FOREIGN KEY (flow_id) REFERENCES flows(id),
    FOREIGN KEY (impact_category_id) REFERENCES impact_categories(id)
);

CREATE TABLE IF NOT EXISTS product_systems (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ref_process_id TEXT,
    created_at TEXT,
    FOREIGN KEY (ref_process_id) REFERENCES processes(id)
);

CREATE TABLE IF NOT EXISTS lca_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_system_id TEXT NOT NULL,
    method TEXT NOT NULL,
    total_impact REAL,
    result_data TEXT,
    created_at TEXT,
    FOREIGN KEY (product_system_id) REFERENCES product_systems(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchanges_process ON exchanges(process_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_flow ON exchanges(flow_id);
CREATE INDEX IF NOT EXISTS idx_impact_factors_flow ON impact_factors(flow_id);
CREATE INDEX IF NOT EXISTS idx_impact_factors_category ON impact_factors(impact_category_id);
CREATE INDEX IF NOT EXISTS idx_processes_name ON processes(name);
CREATE INDEX IF NOT EXISTS idx_flows_name ON flows(name);

-- FTS5 removed (review minor): tables were never populated or queried; search uses in-memory descriptors.
