"""Client for openLCA IPC Server (JSON-RPC over HTTP)."""
import httpx
import os
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

OPENLCA_URL = os.getenv("OPENLCA_URL", "http://localhost:8080")


class OlcaClient:
    def __init__(self, base_url: str = None):
        self.base_url = (base_url or OPENLCA_URL).rstrip("/")
        self._request_id = 0
        self._desc_cache: dict[str, tuple[float, list[dict]]] = {}
        self._desc_ttl = 120.0

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    async def _rpc(self, method: str, params: dict = None, timeout: float = 30.0):
        payload = {
            "jsonrpc": "2.0",
            "method": method,
            "id": self._next_id(),
        }
        if params is not None:
            payload["params"] = params

        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(self.base_url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        if "error" in data and data["error"]:
            logger.error("openLCA RPC error: %s", data["error"])
            return None
        return data.get("result")

    async def get_descriptors(self, entity_type: str) -> list[dict]:
        now = time.monotonic()
        hit = self._desc_cache.get(entity_type)
        if hit and now - hit[0] < self._desc_ttl:
            return hit[1]
        result = await self._rpc("data/get/descriptors", {"@type": entity_type})
        descriptors = result if isinstance(result, list) else ([result] if result else [])
        self._desc_cache[entity_type] = (now, descriptors)
        return descriptors

    async def search_process(self, query: str, limit: int = 5) -> list[dict]:
        q = (query or "").lower().strip()
        descriptors = await self.get_descriptors("Process")
        if not q:
            return descriptors[:limit]
        scored = []
        for d in descriptors:
            name = (d.get("name") or "").lower()
            if q in name:
                scored.append((name.startswith(q), len(name), d))
        scored.sort(key=lambda x: (not x[0], x[1]))
        return [d for _, _, d in scored[:limit]]

    async def get_process(self, process_id: str) -> Optional[dict]:
        return await self._rpc("data/get", {"@type": "Process", "@id": process_id})

    async def get_flow(self, flow_id: str) -> Optional[dict]:
        return await self._rpc("data/get", {"@type": "Flow", "@id": flow_id})

    async def _first_method_id(self, method_name: str = None) -> Optional[str]:
        methods = await self.get_descriptors("ImpactMethod")
        if not methods:
            return None
        if method_name:
            for m in methods:
                if method_name.lower() in (m.get("name") or "").lower():
                    return m.get("@id")
        return methods[0].get("@id")

    async def calculate_lcia(self, process_id: str, method: str = None) -> Optional[dict]:
        """Full async calculation for a process: returns {'@id': result_id} state or None."""
        method_id = await self._first_method_id(method)
        system = await self._rpc("data/create/system", {"process": {"@id": process_id}})
        if not system:
            return None
        setup = {"productSystem": {"@type": "ProductSystem", "@id": system.get("@id")}}
        if method_id:
            setup["impactMethod"] = {"@type": "ImpactMethod", "@id": method_id}
        state = await self._rpc("result/calculate", setup, timeout=60.0)
        if not state:
            return None
        result_id = state.get("@id")
        ready = state.get("isReady", False)
        for _ in range(120):
            if ready:
                break
            import asyncio

            await asyncio.sleep(1.5)
            st = await self._rpc("result/state", {"@id": result_id})
            ready = bool(st and st.get("isReady"))
        if not ready:
            await self.dispose_result(result_id)
            return None
        return {"@id": result_id, "method_id": method_id}

    async def get_total_impacts(self, result_id: str) -> list[dict]:
        result = await self._rpc("result/total-impacts", {"@id": result_id})
        return result if isinstance(result, list) else []

    async def get_total_flows(self, result_id: str) -> list[dict]:
        result = await self._rpc("result/total-flows", {"@id": result_id})
        return result if isinstance(result, list) else []

    async def dispose_result(self, result_id: str) -> None:
        try:
            await self._rpc("result/dispose", {"@id": result_id})
        except Exception as e:
            logger.warning("dispose failed: %s", e)

    async def gwp_factor(self, process_id: str) -> Optional[dict]:
        """Real GWP100 factor per reference unit from the DB, via LCIA calculation."""
        calc = await self.calculate_lcia(process_id)
        if not calc:
            return None
        try:
            impacts = await self.get_total_impacts(calc["@id"])
            hit = None
            for imp in impacts:
                name = ((imp.get("impactCategory") or {}).get("name") or "").lower()
                if "climate" in name or "co2" in name or "gwp" in name:
                    hit = imp
                    break
            if hit is None and impacts:
                hit = impacts[0]
            if not hit:
                return None
            process = await self.get_process(process_id)
            ref_amount = 1.0
            ref_unit = ""
            if process:
                for exh in process.get("exchanges", []):
                    if exh.get("isQuantitativeReference") or exh.get("quantitativeReference"):
                        ref_amount = abs(exh.get("amount") or 1.0) or 1.0
                        ref_unit = (exh.get("unit") or {}).get("name", "")
                        break
            factor = hit.get("amount", 0.0) / ref_amount
            return {
                "factor": abs(factor),
                "factor_unit": f"kg CO2-eq/{ref_unit or 'unit'}",
                "category": (hit.get("impactCategory") or {}).get("name", ""),
            }
        finally:
            await self.dispose_result(calc["@id"])

    async def health_check(self) -> bool:
        try:
            result = await self._rpc(
                "data/get/descriptors", {"@type": "UnitGroup"}, timeout=5.0
            )
            return result is not None
        except Exception as e:
            logger.error("openLCA health check failed: %s", e)
            return False
