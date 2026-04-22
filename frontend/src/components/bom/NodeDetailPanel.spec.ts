import { render, screen } from "@testing-library/vue";

import NodeDetailPanel from "./NodeDetailPanel.vue";

test("renders selected node details", () => {
  render(NodeDetailPanel, {
    props: {
      node: {
        code: "A001",
        name: "主件A",
        spec_model: "M3",
        bom_version: "V1",
        unit: "PCS",
        qty_actual: "2",
        amount: "10",
        data_status: "有效",
      },
    },
  });

  expect(screen.getByText("A001")).toBeInTheDocument();
  expect(screen.getByText("主件A")).toBeInTheDocument();
  expect(screen.getByText("V1")).toBeInTheDocument();
  expect(screen.getByText("有效")).toBeInTheDocument();
});

test("shows empty placeholder without selected node", () => {
  render(NodeDetailPanel, {
    props: {
      node: null,
    },
  });

  expect(screen.getByText("请选择节点查看详情")).toBeInTheDocument();
});
