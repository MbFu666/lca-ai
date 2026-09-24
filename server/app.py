"""LCA·AI — FastAPI server connecting DeepSeek parser (via lca-proxy) with openLCA engine."""
import os
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from models import CalculateRequest, LcaReport
from olca_client import OlcaClient
from deepseek_parser import DeepSeekParser

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LCA·AI API", version="1.1.0")

# CORS: explicit allowlist (never "*" with credentials). Override via ALLOWED_ORIGINS env (comma-separated).
_ALLOWED = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "https://lca-ai.ru,https://www.lca-ai.ru").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

olca = OlcaClient(os.getenv("OPENLCA_URL", "http://localhost:8080"))
parser = DeepSeekParser()


def recalculate_totals(report: dict) -> dict:
    total = 0.0
    for stage in report.get("stages", []):
        stage_total = 0.0
        for proc in stage.get("sub_processes", []):
            stage_total += proc.get("co2eq", 0)
        stage["co2eq"] = round(stage_total, 4)
        total += stage_total
    report["total_co2eq"] = round(total, 4)
    for stage in report.get("stages", []):
        if total > 0:
            stage["share_pct"] = round(stage["co2eq"] / total * 100, 1)
        else:
            stage["share_pct"] = 0
    return report


async def enrich_with_openlca(report: dict) -> dict:
    """Find matching processes in openLCA and replace AI factors with real LCIA factors."""
    olca_ok = await olca.health_check()
    if not olca_ok:
        logger.warning("openLCA server not available, using AI factors")
        return report

    for stage in report.get("stages", []):
        for proc in stage.get("sub_processes", []):
            name = proc.get("name", "")
            try:
                matches = await olca.search_process(name, limit=1)
                if not matches:
                    continue
                match = matches[0]
                pid = match.get("@id")
                if not pid:
                    continue
                gwp = await olca.gwp_factor(pid)
                if gwp and gwp.get("factor"):
                    proc["factor"] = round(gwp["factor"], 6)
                    proc["factor_unit"] = gwp["factor_unit"]
                    proc["factor_source"] = f"TianGong LCA ({match.get('name', name)})"
                    proc["co2eq"] = round(proc.get("amount", 0) * gwp["factor"], 4)
                    logger.info("Enriched '%s' with openLCA GWP factor: %s", name, gwp["factor"])
                else:
                    detail = await olca.get_process(pid)
                    factor = _extract_factor(detail) if detail else None
                    if factor is not None:
                        proc["factor"] = factor
                        proc["factor_source"] = f"TianGong LCA ({match.get('name', name)})"
                        proc["co2eq"] = round(proc.get("amount", 0) * factor, 4)
            except Exception as e:
                logger.warning("Failed to enrich process '%s': %s", name, e)

    return report


def _extract_factor(process: dict) -> float | None:
    """Fallback: CO2 exchange amount as GWP factor."""
    for exh in process.get("exchanges", []):
        flow = exh.get("flow", {})
        flow_name = (flow.get("name") or "").lower()
        if "carbon dioxide" in flow_name or "co2" in flow_name:
            amount = exh.get("amount", 0)
            if isinstance(amount, (int, float)) and amount != 0:
                return abs(amount)
    return None


@app.post("/api/calculate")
async def calculate(req: CalculateRequest, request: Request):
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    try:
        logger.info("Calculating LCA for: %s", req.description[:80])

        precision = req.precision or ("full" if req.mode == "full" else "fast")
        report = await parser.parse(
            description=req.description,
            lang=req.lang,
            region=req.region,
            precision=precision,
            user_token=token,
        )

        if report.get("error") == "not_lca":
            return report

        report = await enrich_with_openlca(report)
        report = recalculate_totals(report)

        return report

    except ValueError as e:
        logger.error("Parse error: %s", e)
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("Calculation error: %s", e)
        raise HTTPException(status_code=500, detail=f"Calculation failed: {e}")


@app.get("/api/health")
async def health():
    olca_ok = await olca.health_check()
    return {
        "status": "ok",
        "openlca": "connected" if olca_ok else "unavailable",
    }


@app.get("/")
async def root():
    return {"service": "LCA·AI API", "version": "1.1.0"}
