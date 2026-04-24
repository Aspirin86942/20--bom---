import { render, screen } from "@testing-library/vue";

import ErrorDrawer from "./ErrorDrawer.vue";

test("groups repeated import warnings by code and message", () => {
  render(ErrorDrawer, {
    props: {
      errors: [
        { id: "row_423:MISSING_OR_ZERO_AMOUNT", code: "MISSING_OR_ZERO_AMOUNT", message: "金额缺失或为 0" },
        { id: "row_424:MISSING_OR_ZERO_AMOUNT", code: "MISSING_OR_ZERO_AMOUNT", message: "金额缺失或为 0" },
        { id: "row_425:MISSING_OR_ZERO_AMOUNT", code: "MISSING_OR_ZERO_AMOUNT", message: "金额缺失或为 0" },
      ],
    },
  });

  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(1);
  expect(items[0]).toHaveTextContent("MISSING_OR_ZERO_AMOUNT - 金额缺失或为 0（3 条）");
});

test("hides drawer when there are no import messages", () => {
  const { container } = render(ErrorDrawer, {
    props: {
      errors: [],
    },
  });

  expect(container.querySelector("aside")).not.toBeInTheDocument();
});
