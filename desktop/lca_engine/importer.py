"""Import .zolca files (openLCA format) into SQLite."""
import sqlite3
import zipfile
import json
import os
from pathlib import Path
from typing import Optional


class ZolcaImporter:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self._init_schema()

    def _init_schema(self):
        schema_path = Path(__file__).parent / "schema.sql"
        if schema_path.exists():
            self.conn.executescript(schema_path.read_text(encoding="utf-8"))

    def close(self):
        if self.conn:
            self.conn.close()

    def import_zolca(self, zolca_path: str, progress_callback=None) -> dict:
        """Import a .zolca file into SQLite.

        .zolca files are ZIP archives containing JSON-LD data.
        """
        stats = {"processes": 0, "flows": 0, "exchanges": 0, "errors": []}

        with zipfile.ZipFile(zolca_path, "r") as zf:
            file_list = zf.namelist()

            # Group files by type
            json_files = [f for f in file_list if f.endswith(".json")]
            total = len(json_files)

            for i, json_file in enumerate(json_files):
                if progress_callback:
                    progress_callback(i + 1, total, json_file)

                try:
                    with zf.open(json_file) as f:
                        data = json.loads(f.read().decode("utf-8"))
                        self._process_jsonld(data, stats)
                except Exception as e:
                    stats["errors"].append(f"{json_file}: {str(e)}")

        self.conn.commit()
        return stats

    def _process_jsonld(self, data: dict, stats: dict):
        """Process a single JSON-LD object."""
        obj_type = data.get("@type", "")

        if obj_type == "Process":
            self._import_process(data, stats)
        elif obj_type == "Flow":
            self._import_flow(data, stats)
        elif obj_type == "ImpactCategory":
            self._import_impact_category(data, stats)
        elif obj_type == "ImpactMethod":
            pass  # Methods are metadata, skip for now

    def _import_process(self, data: dict, stats: dict):
        process_id = data.get("@id", "")
        name = data.get("name", "")
        category = data.get("category", "")
        location = data.get("location", "")
        process_type = data.get("processType", "UNIT_PROCESS")

        if not process_id or not name:
            return

        try:
            self.conn.execute(
                "INSERT OR REPLACE INTO processes (id, name, category, location, process_type, ref_id) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (process_id, name, category, location, process_type, process_id),
            )
            # Idempotent re-import: clear prior exchanges so they are not doubled.
            self.conn.execute("DELETE FROM exchanges WHERE process_id = ?", (process_id,))
            stats["processes"] += 1

            # Import exchanges
            for ex in data.get("exchanges", []):
                self._import_exchange(process_id, ex, stats)

        except sqlite3.Error as e:
            stats["errors"].append(f"Process {name}: {e}")

    def _import_flow(self, data: dict, stats: dict):
        flow_id = data.get("@id", "")
        name = data.get("name", "")
        category = data.get("category", "")
        flow_type = data.get("flowType", "ELEMENTARY_FLOW")

        if not flow_id or not name:
            return

        try:
            self.conn.execute(
                "INSERT OR REPLACE INTO flows (id, name, category, flow_type, ref_id) "
                "VALUES (?, ?, ?, ?, ?)",
                (flow_id, name, category, flow_type, flow_id),
            )
            stats["flows"] += 1
        except sqlite3.Error as e:
            stats["errors"].append(f"Flow {name}: {e}")

    def _import_exchange(self, process_id: str, ex: dict, stats: dict):
        flow_ref = ex.get("flow", {})
        flow_id = flow_ref.get("@id", "")
        amount = ex.get("amount", 0)
        unit = ex.get("unit", {}).get("name", "kg")
        is_input = ex.get("isInput", False)

        if not flow_id:
            return

        # Ensure flow exists
        self.conn.execute(
            "INSERT OR IGNORE INTO flows (id, name, ref_id) VALUES (?, ?, ?)",
            (flow_id, flow_ref.get("name", "unknown"), flow_id),
        )

        try:
            self.conn.execute(
                "INSERT INTO exchanges (process_id, flow_id, amount, unit, is_input) "
                "VALUES (?, ?, ?, ?, ?)",
                (process_id, flow_id, amount, unit, 1 if is_input else 0),
            )
            stats["exchanges"] += 1
        except sqlite3.Error as e:
            stats["errors"].append(f"Exchange in {process_id}: {e}")

    def _import_impact_category(self, data: dict, stats: dict):
        cat_id = data.get("@id", "")
        name = data.get("name", "")
        method_ref = data.get("impactMethod", {})
        method = method_ref.get("name", "Unknown")

        if not cat_id or not name:
            return

        try:
            self.conn.execute(
                "INSERT OR REPLACE INTO impact_categories (id, name, method, ref_id) "
                "VALUES (?, ?, ?, ?)",
                (cat_id, name, method, cat_id),
            )
        except sqlite3.Error:
            pass

    def import_directory(self, dir_path: str, progress_callback=None) -> dict:
        """Import all .json files from a directory (unzipped .zolca)."""
        stats = {"processes": 0, "flows": 0, "exchanges": 0, "errors": []}
        json_files = list(Path(dir_path).rglob("*.json"))
        total = len(json_files)

        for i, json_file in enumerate(json_files):
            if progress_callback:
                progress_callback(i + 1, total, str(json_file.name))

            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                self._process_jsonld(data, stats)
            except Exception as e:
                stats["errors"].append(f"{json_file.name}: {str(e)}")

        self.conn.commit()
        return stats
