import {
  resolveBomGridDisplayMode,
  shouldAutoExpandFilteredRows,
} from "./useGridDisplayMode";

test("uses flat mode for non-search filters", () => {
  expect(resolveBomGridDisplayMode({ materialAttr: "外购", amountMin: "" })).toBe(
    "flat",
  );
  expect(resolveBomGridDisplayMode({ materialAttr: "", amountMin: "10" })).toBe(
    "flat",
  );
  expect(
    resolveBomGridDisplayMode({ materialAttr: "委外", amountMin: "10" }),
  ).toBe("flat");
});

test("keeps tree mode when only search is active", () => {
  expect(resolveBomGridDisplayMode({ materialAttr: "", amountMin: "" })).toBe(
    "tree",
  );
});

test("auto expands only for tree search", () => {
  expect(shouldAutoExpandFilteredRows("tree", "电阻")).toBe(true);
  expect(shouldAutoExpandFilteredRows("tree", "")).toBe(false);
  expect(shouldAutoExpandFilteredRows("flat", "电阻")).toBe(false);
});
