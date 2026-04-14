import "@testing-library/jest-dom/vitest";
import { config } from "@vue/test-utils";
import ElementPlus from "element-plus";
import VXETable from "vxe-table";


config.global.plugins = [ElementPlus, VXETable];


class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}


if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;
}
