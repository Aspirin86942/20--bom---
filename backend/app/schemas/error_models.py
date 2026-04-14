from pydantic import BaseModel, Field


class ImportErrorItem(BaseModel):
    severity: str
    code: str
    row_index: int | None = None
    field: str | None = None
    raw_value: str | None = None
    message: str
    action: str


class ImportSummary(BaseModel):
    fatal_count: int = 0
    warning_count: int = 0


class ValidationReport(BaseModel):
    status: str
    summary: ImportSummary = Field(default_factory=ImportSummary)
    errors: list[ImportErrorItem] = Field(default_factory=list)
