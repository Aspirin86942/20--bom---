import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { ElMessage } from "element-plus";
import UploadPanel from "./UploadPanel.vue";

vi.mock("element-plus", async () => {
  const actual = await vi.importActual("element-plus");
  return {
    ...actual,
    ElMessage: {
      error: vi.fn(),
    },
  };
});

describe("UploadPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("accepts valid .xlsx file", () => {
    const wrapper = mount(UploadPanel);
    const file = new File(["content"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const uploadFile = {
      name: "test.xlsx",
      size: 1024,
      raw: file,
    };

    wrapper.vm.handleFileChange(uploadFile as any);

    expect(ElMessage.error).not.toHaveBeenCalled();
    expect(wrapper.emitted("select")).toBeTruthy();
    expect(wrapper.emitted("select")?.[0]).toEqual([file]);
  });

  it("rejects non-.xlsx file", () => {
    const wrapper = mount(UploadPanel);
    const file = new File(["content"], "test.xls", { type: "application/vnd.ms-excel" });

    const uploadFile = {
      name: "test.xls",
      size: 1024,
      raw: file,
    };

    wrapper.vm.handleFileChange(uploadFile as any);

    expect(ElMessage.error).toHaveBeenCalledWith("仅支持 .xlsx 格式的 Excel 文件");
    expect(wrapper.emitted("select")).toBeFalsy();
  });

  it("rejects file larger than 50MB", () => {
    const wrapper = mount(UploadPanel);
    const file = new File(["content"], "large.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const uploadFile = {
      name: "large.xlsx",
      size: 51 * 1024 * 1024, // 51MB
      raw: file,
    };

    wrapper.vm.handleFileChange(uploadFile as any);

    expect(ElMessage.error).toHaveBeenCalledWith("文件大小不能超过 50MB");
    expect(wrapper.emitted("select")).toBeFalsy();
  });

  it("accepts file exactly at 50MB limit", () => {
    const wrapper = mount(UploadPanel);
    const file = new File(["content"], "limit.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const uploadFile = {
      name: "limit.xlsx",
      size: 50 * 1024 * 1024, // exactly 50MB
      raw: file,
    };

    wrapper.vm.handleFileChange(uploadFile as any);

    expect(ElMessage.error).not.toHaveBeenCalled();
    expect(wrapper.emitted("select")).toBeTruthy();
  });

  it("handles missing raw file gracefully", () => {
    const wrapper = mount(UploadPanel);

    const uploadFile = {
      name: "test.xlsx",
      size: 1024,
      raw: undefined,
    };

    wrapper.vm.handleFileChange(uploadFile as any);

    expect(ElMessage.error).not.toHaveBeenCalled();
    expect(wrapper.emitted("select")).toBeFalsy();
  });

  it("renders a slim re-import bar in compact mode", () => {
    const wrapper = mount(UploadPanel, {
      props: {
        compact: true,
      },
    });

    expect(wrapper.classes()).toContain("upload-panel--compact");
    expect(wrapper.text()).toContain("重新导入 Excel");
    expect(wrapper.text()).toContain("点击替换当前数据");
    expect(wrapper.text()).not.toContain("支持 .xlsx 格式的 BOM 文件");
    expect(wrapper.find(".upload-panel__compact").exists()).toBe(true);
  });
});
