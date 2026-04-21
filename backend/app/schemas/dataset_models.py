from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ImportResponse(BaseModel):
    dataset_id: str
    status: str
    summary: dict[str, int]
    errors: list[dict[str, object]] = Field(default_factory=list)


class DatasetDetailResponse(BaseModel):
    dataset_id: str
    rows: list[dict[str, object]] = Field(default_factory=list)
    subtree_aggregates: dict[str, dict[str, object]] = Field(default_factory=dict)
    warnings: list[dict[str, object]] = Field(default_factory=list)


class DatasetQueryParams(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    search: str = ""
    material_attr: str = Field(default="", alias="materialAttr")
    amount_min: Decimal | None = Field(default=None, alias="amountMin")
    level_min: int | None = Field(default=None, alias="levelMin")
    level_max: int | None = Field(default=None, alias="levelMax")
    status: str = ""
    sort_by: str = Field(default="sort_index", alias="sortBy")
    sort_order: str = Field(default="asc", alias="sortOrder")