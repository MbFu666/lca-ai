"""LLM parser: product description -> LCA inventory via Supabase lca-proxy (DeepSeek)."""
import httpx
import os
import json
import logging

logger = logging.getLogger(__name__)

LCA_PROXY_URL = os.getenv(
    "LCA_PROXY_URL", "https://pbisngkepszwzzjivxus.supabase.co/functions/v1/lca-proxy"
)
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")

LANG_NAMES = {"ru": "Russian", "en": "English", "zh": "Chinese (Simplified)"}

SYSTEM_PROMPT_TEMPLATE = """LCA expert (ISO 14067, PAS 2050). Reply with VALID JSON ONLY in {lang_name}.

Building materials (brick, cement, concrete, steel), agricultural products, chemicals, fuels and energy carriers ARE valid LCA products - never reject them.
If input is not a product/material/process/energy carrier for LCA (e.g. a question, a service, an abstract idea) -> reply:
{{"error":"not_lca","message":"<one-sentence reason in {lang_name}>"}}

Else reply with this exact schema:
{{
  "product_title": "...",
  "functional_unit": "...",
  "system_boundary": "cradle-to-grave",
  "method": "IPCC AR6 GWP100",
  "region": "...",
  "accounting_cycle": "YYYY-MM-DD ~ YYYY-MM-DD",
  "total_co2eq": <number>,
  "stages": [
    {{
      "name": "<stage name>",
      "co2eq": <number>,
      "share_pct": <number>,
      "description": "<= 12 words",
      "key_inputs": ["...", "..."],
      "factor_source": "TianGong LCA",
      "sub_processes": [
        {{"name":"...", "amount":<n>, "unit":"kg", "factor":<n>, "factor_unit":"kg CO2-eq/kg", "factor_source":"...", "co2eq":<n>}}
      ]
    }}
  ]
}}

5 stages required (in {lang_name}): Raw material acquisition, Manufacturing, Distribution, Use phase, End of life.
Each stage = exactly 2 sub_processes. Numbers in kg CO2-eq. share_pct sums to 100.

HARD CONSTRAINTS:
- Output must fit within 4000 tokens. Be concise but complete.
- Every string value MUST be a SINGLE LINE - NO newlines inside any string.
- Stage and sub_process names <= 8 words. Descriptions <= 15 words.
- DO NOT include fields outside the schema (no assumptions/limitations/recommendations).
- If the input contains refinements - keep output structure identical, just update values."""

PRECISION_DEEP_NOTE = "Depth: full LCA. Give 3 sub_processes per stage instead of 2, and cite a specific factor database for each."

REGION_DEFAULTS = {
    "europe": "Europe (EU-27 average grid and supply chains)",
    "north_america": "North America (US/Canada average grid and supply chains)",
    "asia": "Asia (CN/IN/SEA average grid and supply chains)",
}


class DeepSeekParser:
    def __init__(self, model: str = None):
        self.api_url = LCA_PROXY_URL
        self.model = model or DEEPSEEK_MODEL

    async def parse(
        self,
        description: str,
        lang: str = "ru",
        region: str = None,
        precision: str = "fast",
        user_token: str = None,
    ) -> dict:
        token = user_token or os.getenv("LCA_USER_TOKEN", "")
        if not token:
            raise ValueError("no user token: Authorization header required")

        lang_name = LANG_NAMES.get(lang, "English")

        precision_note = ""
        if precision == "deep" or precision == "full":
            precision_note = PRECISION_DEEP_NOTE

        region_note = ""
        if region and region in REGION_DEFAULTS:
            region_note = f"Unless the product description names a region explicitly, assume: {REGION_DEFAULTS[region]}. Reflect it in the 'region' field."

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(lang_name=lang_name)
        if precision_note:
            system_prompt += f"\n{precision_note}"
        if region_note:
            system_prompt += f"\n{region_note}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": description},
        ]

        body = {
            "model": self.model,
            "messages": messages,
            "max_tokens": 4000,
            "temperature": 0.2,
            "stream": False,
            "response_format": {"type": "json_object"},
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        text = ""
        last_error = ""
        for model in [self.model, "deepseek-chat"]:
            for _attempt in range(2):
                body["model"] = model
                async with httpx.AsyncClient(timeout=95.0) as client:
                    resp = await client.post(self.api_url, json=body, headers=headers)
                    if resp.status_code == 401:
                        raise ValueError("lca-proxy auth failed: invalid or expired token")
                    if resp.status_code == 429:
                        raise ValueError("lca-proxy rate limit exceeded")
                    if resp.status_code >= 500:
                        last_error = f"upstream {resp.status_code}"
                        continue  # transient: retry instead of aborting (review #18)
                    resp.raise_for_status()
                    data = resp.json()
                choices = data.get("choices") or [{}]
                text = (choices[0].get("message") or {}).get("content", "") or ""
                if text:
                    break
                last_error = f"empty response from {model}"
            if text:
                break

        if not text:
            raise ValueError(f"DeepSeek returned empty response ({last_error})")

        return self._parse_json(text)

    def _parse_json(self, text: str) -> dict:
        cleaned = text.replace("```json", "").replace("```", "").strip()
        first = cleaned.find("{")
        if first < 0:
            raise ValueError("No JSON object in DeepSeek response")

        body = cleaned[first:]
        last = body.rfind("}")
        if last < 0:
            raise ValueError("No closing brace in DeepSeek response")
        body = body[: last + 1]

        for attempt in (lambda s: json.loads(s), lambda s: json.loads(s, strict=False)):
            try:
                return attempt(body)
            except json.JSONDecodeError:
                continue
        return self._repair_json(body)

    def _repair_json(self, s: str) -> dict:
        s = s.rstrip().rstrip(",")
        last_quote = s.rfind('"')
        last_close = max(s.rfind("}"), s.rfind("]"))
        if last_quote > last_close:
            # truncated inside a string: cut to last complete structure
            s = s[: last_close + 1]
        s = s.replace(",}", "}").replace(",]", "]")
        # drop trailing incomplete key/value pair like  "name":
        s = s.rstrip()
        if s.endswith(":"):
            s = s[: s.rfind(",", 0, s.rfind('"')) + 1] if "," in s else s[: s.rfind('"')]
            s = s.rstrip().rstrip(",")
            if s and s[-1] in "}]":
                pass

        open_braces = s.count("{") - s.count("}")
        open_brackets = s.count("[") - s.count("]")
        s += "]" * max(0, open_brackets)
        s += "}" * max(0, open_braces)

        try:
            return json.loads(s)
        except json.JSONDecodeError:
            return json.loads(s, strict=False)
