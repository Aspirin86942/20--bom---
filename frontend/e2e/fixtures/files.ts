import path from "path";
import { fileURLToPath } from "url";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

export const validWorkbookPath = path.resolve(
  fixtureDir,
  "../../../BOM成本查询_2026041415170958.xlsx",
);

export const invalidTextPath = path.resolve(
  fixtureDir,
  "../data/not-a-workbook.txt",
);

export const brokenWorkbookPath = path.resolve(
  fixtureDir,
  "../data/broken-workbook.xlsx",
);
