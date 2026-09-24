"""LCA Calculation Engine — matrix-based LCA calculations."""
import sqlite3
import numpy as np
from scipy import sparse
from scipy.sparse import linalg as spla
from typing import Optional
import json
import time
from pathlib import Path


class LcaEngine:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self):
        schema_path = Path(__file__).parent / "schema.sql"
        if schema_path.exists():
            self.conn.executescript(schema_path.read_text(encoding="utf-8"))

    def close(self):
        if self.conn:
            self.conn.close()

    # ─── Process queries ───────────────────────────────────────────

    def search_processes(self, query: str, limit: int = 20) -> list[dict]:
        cur = self.conn.execute(
            "SELECT id, name, category, location FROM processes "
            "WHERE name LIKE ? OR category LIKE ? LIMIT ?",
            (f"%{query}%", f"%{query}%", limit),
        )
        return [dict(row) for row in cur.fetchall()]

    def get_process(self, process_id: str) -> Optional[dict]:
        cur = self.conn.execute(
            "SELECT * FROM processes WHERE id = ?", (process_id,)
        )
        row = cur.fetchone()
        if not row:
            return None
        result = dict(row)
        result["exchanges"] = self._get_exchanges(process_id)
        return result

    def _get_exchanges(self, process_id: str) -> list[dict]:
        cur = self.conn.execute(
            "SELECT e.*, f.name as flow_name, f.category as flow_category "
            "FROM exchanges e JOIN flows f ON e.flow_id = f.id "
            "WHERE e.process_id = ?",
            (process_id,),
        )
        return [dict(row) for row in cur.fetchall()]

    def list_categories(self) -> list[str]:
        cur = self.conn.execute(
            "SELECT DISTINCT category FROM processes WHERE category IS NOT NULL ORDER BY category"
        )
        return [row[0] for row in cur.fetchall()]

    # ─── Product system builder ────────────────────────────────────

    def build_product_system(self, process_ids: list[str], demand: float = 1.0) -> dict:
        """Build technology matrix (A) and intervention matrix (B) from processes."""
        # Collect all unique flows
        all_flows = set()
        process_flow_map = {}

        for pid in process_ids:
            exchanges = self._get_exchanges(pid)
            process_flow_map[pid] = exchanges
            for ex in exchanges:
                all_flows.add(ex["flow_id"])

        flow_list = sorted(all_flows)
        flow_idx = {f: i for i, f in enumerate(flow_list)}
        n = len(flow_list)
        p = len(process_ids)
        proc_idx = {pid: i for i, pid in enumerate(process_ids)}

        # Build matrices
        rows_A, cols_A, vals_A = [], [], []
        rows_B, cols_B, vals_B = [], [], []

        for pid in process_ids:
            pi = proc_idx[pid]
            for ex in process_flow_map[pid]:
                fi = flow_idx[ex["flow_id"]]
                amount = ex["amount"]
                if ex["is_input"]:
                    # Input flow: negative in technology matrix
                    rows_A.append(fi)
                    cols_A.append(pi)
                    vals_A.append(-abs(amount))
                else:
                    # Output flow: positive in technology matrix
                    rows_A.append(fi)
                    cols_A.append(pi)
                    vals_A.append(amount)

        A = sparse.csr_matrix(
            (vals_A, (rows_A, cols_A)), shape=(n, p), dtype=np.float64
        )

        # Build demand vector (first process is the reference)
        f = np.zeros(p)
        if process_ids:
            f[proc_idx[process_ids[0]]] = demand

        return {
            "technology_matrix": A,
            "demand_vector": f,
            "flow_list": flow_list,
            "process_list": process_ids,
            "flow_index": flow_idx,
            "process_index": proc_idx,
        }

    # ─── LCA Calculation ───────────────────────────────────────────

    def calculate(self, product_system: dict, method: str = "IPCC AR6 GWP100") -> dict:
        """Calculate LCA impacts using matrix-based approach.

        Solves: (I - A)^-1 * f = s (scaling vector)
        Then: impacts = sum of impact factors * scaling
        """
        A = product_system["technology_matrix"]
        f = product_system["demand_vector"]
        flow_list = product_system["flow_list"]
        process_list = product_system["process_list"]

        n, p = A.shape
        I = sparse.eye(p, format="csr")

        # Solve for scaling vector: (I - A) * s = f
        try:
            s = spla.spsolve(I - A, f)
        except Exception as e:
            # Fallback: use least squares for singular matrices
            s, _, _, _ = spla.lsqr(I - A, f)

        # Get impact factors for this method
        impact_factors = self._get_impact_factors(method)

        # Calculate impacts per flow
        flow_impacts = {}
        total_impact = 0.0

        for i, flow_id in enumerate(flow_list):
            if flow_id in impact_factors:
                factor = impact_factors[flow_id]
                # The flow contribution is A[i, :] * s
                flow_amount = A[i, :].dot(s)
                impact = flow_amount * factor
                flow_impacts[flow_id] = {
                    "amount": float(flow_amount),
                    "factor": factor,
                    "impact": float(impact),
                }
                total_impact += impact

        # Calculate impacts per process
        process_impacts = {}
        for j, pid in enumerate(process_list):
            proc_impact = 0.0
            for i, flow_id in enumerate(flow_list):
                if flow_id in impact_factors:
                    proc_impact += A[i, j] * s[j] * impact_factors[flow_id]
            process_impacts[pid] = float(proc_impact)

        return {
            "method": method,
            "total_impact": float(total_impact),
            "scaling_vector": s.tolist(),
            "flow_impacts": flow_impacts,
            "process_impacts": process_impacts,
            "calculation_time": time.time(),
        }

    def _get_impact_factors(self, method: str) -> dict:
        """Get impact factors for a given LCIA method."""
        cur = self.conn.execute(
            "SELECT ic.id, ic.name FROM impact_categories ic WHERE ic.method = ?",
            (method,),
        )
        categories = cur.fetchall()

        if not categories:
            # Fallback: use default IPCC factors
            return self._default_ipcc_factors()

        factors = {}
        for cat in categories:
            cur2 = self.conn.execute(
                "SELECT flow_id, factor FROM impact_factors WHERE impact_category_id = ?",
                (cat["id"],),
            )
            for row in cur2:
                factors[row["flow_id"]] = row["factor"]

        return factors

    def _default_ipcc_factors(self) -> dict:
        """Default IPCC AR6 GWP100 factors (kg CO2-eq per unit)."""
        return {
            "co2": 1.0,
            "ch4": 27.9,
            "n2o": 273.0,
            "hfc-134a": 1530.0,
            "pfc": 7390.0,
            "sf6": 25200.0,
            "nf3": 17400.0,
        }

    # ─── Results ───────────────────────────────────────────────────

    def save_result(self, product_system_id: str, method: str, result: dict) -> int:
        cur = self.conn.execute(
            "INSERT INTO lca_results (product_system_id, method, total_impact, result_data, created_at) "
            "VALUES (?, ?, ?, ?, datetime('now'))",
            (
                product_system_id,
                method,
                result["total_impact"],
                json.dumps(result),
            ),
        )
        self.conn.commit()
        return cur.lastrowid

    def get_result(self, result_id: int) -> Optional[dict]:
        cur = self.conn.execute(
            "SELECT * FROM lca_results WHERE id = ?", (result_id,)
        )
        row = cur.fetchone()
        if not row:
            return None
        result = dict(row)
        if result["result_data"]:
            result["result_data"] = json.loads(result["result_data"])
        return result
