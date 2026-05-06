import { test } from "@playwright/test";

// 占位用例：当前阶段只用于确保 ./e2e/specs 下至少有一个可发现的 Playwright spec，
// 这样 `npx playwright test --list` 不会因为 0 个测试直接退出 1。
test("playwright placeholder discovery", async () => {
  // 为什么保留为空：
  // Task 1 只要求完成配置与产物治理，这里避免提前迁移 legacy e2e 或引入额外业务断言。
});
