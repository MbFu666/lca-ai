# LCA·AI Desktop

Desktop application for Life Cycle Assessment calculations.

## Architecture

- **Tauri 2.x** — UI shell (Rust)
- **React 19** — Frontend
- **Python 3.12** — LCA engine (numpy/scipy)
- **SQLite** — Local database

## Directory Structure

```
desktop/
├── lca_engine/          # Python LCA engine
│   ├── engine.py        # Matrix solver (numpy/scipy)
│   ├── importer.py      # .zolca file importer
│   ├── methods.py       # LCIA methods (IPCC, ReCiPe)
│   ├── rpc_server.py    # JSON-RPC over stdin/stdout
│   └── schema.sql       # SQLite schema
├── tauri/               # Tauri Rust backend
│   ├── Cargo.toml
│   ├── src/main.rs
│   └── tauri.conf.json
└── react-ui/            # React frontend
    ├── package.json
    ├── src/App.tsx
    └── vite.config.ts
```

## Development

### Prerequisites
- Python 3.12+ with numpy, scipy
- Rust toolchain
- Node.js 18+

### Setup
```bash
# Install Python dependencies
cd lca_engine
pip install -r requirements.txt

# Install React dependencies
cd ../react-ui
npm install

# Run development
cd ../tauri
cargo tauri dev
```

## Python LCA Engine

The engine provides matrix-based LCA calculations:

```python
from lca_engine import LcaEngine

engine = LcaEngine("lca.db")
results = engine.calculate(
    process_ids=["process-1", "process-2"],
    method="IPCC AR6 GWP100"
)
print(f"Total impact: {results['total_impact']} kg CO2-eq")
```

## LCIA Methods

- IPCC AR6 GWP100
- IPCC AR5 GWP100
- ReCiPe 2016 Midpoint
- CML 2001
