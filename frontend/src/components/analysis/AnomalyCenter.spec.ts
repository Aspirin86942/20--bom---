import { render, screen } from "@testing-library/vue";

import AnomalyCenter from "./AnomalyCenter.vue";

test("renders anomaly list and count", () => {
  render(AnomalyCenter, {
    props: {
      items: [
        { id: "a1", code: "MISSING_ATTR", message: "物料属性缺失" },
        { id: "a2", code: "MISSING_AMOUNT", message: "金额缺失或为 0" },
      ],
    },
  });

  expect(screen.getByText("异常总数：2")).toBeInTheDocument();
  expect(screen.getByText("MISSING_ATTR")).toBeInTheDocument();
  expect(screen.getByText("金额缺失或为 0")).toBeInTheDocument();
});

test("renders empty state when anomalies are absent", () => {
  render(AnomalyCenter, {
    props: {
      items: [],
    },
  });

  expect(screen.getByText("异常总数：0")).toBeInTheDocument();
  expect(screen.getByText("当前无异常")).toBeInTheDocument();
});
