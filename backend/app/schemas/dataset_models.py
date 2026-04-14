from pydantic import BaseModel, Field


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
