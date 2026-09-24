"""JSON-RPC server over stdin/stdout for Tauri integration."""
import sys
import json
import os
from typing import Any
from .engine import LcaEngine
from .importer import ZolcaImporter
from .methods import LciaMethods


class RpcServer:
    def __init__(self):
        self.engine: LcaEngine | None = None
        self.db_path = os.path.expanduser("~/.lca-app/lca.db")

    def handle(self, request: dict) -> dict:
        method = request.get("method", "")
        params = request.get("params", {})
        req_id = request.get("id")

        try:
            result = self._dispatch(method, params)
            return {"jsonrpc": "2.0", "id": req_id, "result": result}
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -1, "message": str(e)},
            }

    def _dispatch(self, method: str, params: dict) -> Any:
        handlers = {
            "open_database": self._open_database,
            "search_processes": self._search_processes,
            "get_process": self._get_process,
            "build_product_system": self._build_product_system,
            "calculate": self._calculate,
            "import_zolca": self._import_zolca,
            "list_methods": self._list_methods,
            "list_categories": self._list_categories,
            "health_check": self._health_check,
        }

        handler = handlers.get(method)
        if not handler:
            raise ValueError(f"Unknown method: {method}")

        return handler(params)

    def _open_database(self, params: dict) -> dict:
        db_path = params.get("path", self.db_path)
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.engine = LcaEngine(db_path)
        return {"status": "ok", "path": db_path}

    def _search_processes(self, params: dict) -> dict:
        query = params.get("query", "")
        limit = params.get("limit", 20)
        results = self.engine.search_processes(query, limit)
        return {"processes": results}

    def _get_process(self, params: dict) -> dict:
        process_id = params.get("id", "")
        process = self.engine.get_process(process_id)
        if not process:
            raise ValueError(f"Process not found: {process_id}")
        return process

    def _build_product_system(self, params: dict) -> dict:
        process_ids = params.get("process_ids", [])
        demand = params.get("demand", 1.0)
        if not process_ids:
            raise ValueError("No processes specified")

        ps = self.engine.build_product_system(process_ids, demand)
        # Return metadata, not the full matrices (too large for JSON)
        return {
            "n_flows": ps["technology_matrix"].shape[0],
            "n_processes": ps["technology_matrix"].shape[1],
            "flow_list": ps["flow_list"],
            "process_list": ps["process_list"],
        }

    def _calculate(self, params: dict) -> dict:
        process_ids = params.get("process_ids", [])
        method = params.get("method", "IPCC AR6 GWP100")
        demand = params.get("demand", 1.0)

        if not process_ids:
            raise ValueError("No processes specified")

        ps = self.engine.build_product_system(process_ids, demand)
        result = self.engine.calculate(ps, method)

        return {
            "method": result["method"],
            "total_impact": result["total_impact"],
            "unit": LciaMethods.get_unit(method),
            "process_impacts": result["process_impacts"],
        }

    def _import_zolca(self, params: dict) -> dict:
        path = params.get("path", "")
        if not path:
            raise ValueError("No path specified")

        importer = ZolcaImporter(self.db_path)
        try:
            stats = importer.import_zolca(path)
            return stats
        finally:
            importer.close()

    def _list_methods(self, params: dict) -> dict:
        return {"methods": LciaMethods.list_methods()}

    def _list_categories(self, params: dict) -> dict:
        categories = self.engine.list_categories() if self.engine else []
        return {"categories": categories}

    def _health_check(self, params: dict) -> dict:
        return {
            "status": "ok",
            "engine": self.engine is not None,
            "db_path": self.db_path,
        }


def main():
    """Run JSON-RPC server on stdin/stdout."""
    server = RpcServer()

    # Auto-open default database
    server.engine = LcaEngine(server.db_path)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except json.JSONDecodeError:
            response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -1, "message": "Invalid JSON"},
            }
        else:
            response = server.handle(request)

        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
