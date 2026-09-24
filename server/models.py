"""Data models for the LCA API server."""
from pydantic import BaseModel, Field
from typing import Optional


class CalculateRequest(BaseModel):
    # Bounded input: prevents uncontrolled DeepSeek token spend (review #18).
    description: str = Field(..., min_length=1, max_length=4000)
    lang: str = Field("ru", pattern="^(ru|en|zh)$")
    mode: str = Field("full", pattern="^(full|screening)$")
    region: Optional[str] = Field(None, max_length=120)
    precision: str = Field("fast", pattern="^(fast|full)$")


class OlcaProcessResult(BaseModel):
    process_id: str
    name: str
    factor: float
    factor_unit: str
    source: str
    location: Optional[str] = None


class SubProcess(BaseModel):
    name: str
    amount: float
    unit: str
    factor: float
    factor_unit: str
    factor_source: str
    co2eq: float


class Stage(BaseModel):
    name: str
    co2eq: float
    share_pct: float
    description: str
    key_inputs: list[str]
    factor_source: str
    sub_processes: list[SubProcess]


class LcaReport(BaseModel):
    product_title: str
    functional_unit: str
    system_boundary: str
    method: str
    region: str
    accounting_cycle: str
    total_co2eq: float
    stages: list[Stage]
    error: Optional[str] = None
    message: Optional[str] = None
