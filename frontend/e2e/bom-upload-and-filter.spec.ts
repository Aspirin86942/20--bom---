import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('BOM 上传和筛选功能', () => {
  test('应该能够上传 Excel 文件并显示数据', async ({ page }) => {
    await page.goto('/');

    // 等待上传面板出现
    await expect(page.locator('.upload-panel')).toBeVisible();

    // 上传测试文件
    const testFile = path.join(__dirname, '../../BOM成本查询_2026041415170958.xlsx');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // 等待数据加载完成（等待表格出现）
    await page.waitForSelector('.vxe-table', { timeout: 10000 });

    // 验证表格已渲染
    await expect(page.locator('.vxe-table')).toBeVisible();

    // 验证至少有一些行数据
    const rows = page.locator('.vxe-body--row');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });

    console.log('✓ 文件上传成功，表格已显示');
  });

  test('应该能够使用物料属性筛选器', async ({ page }) => {
    await page.goto('/');

    // 上传文件
    const testFile = path.join(__dirname, '../../BOM成本查询_2026041415170958.xlsx');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // 等待表格加载
    await expect(page.locator('.vxe-table')).toBeVisible({ timeout: 10000 });
    await expect
      .poll(async () => page.locator('.vxe-body--row').count(), { timeout: 10000 })
      .toBeGreaterThan(0);

    // 记录初始行数
    const initialRows = await page.locator('.vxe-body--row').count();
    console.log(`初始行数: ${initialRows}`);

    // 点击"外购"筛选
    await page.getByRole('button', { name: '外购' }).click();
    await page.waitForTimeout(2000); // 等待筛选和展开完成

    // 验证筛选后的行数变化
    const filteredRows = await page.locator('.vxe-body--row').count();
    console.log(`筛选后行数: ${filteredRows}`);
    expect(filteredRows).toBeGreaterThan(0);

    // 验证筛选器按钮状态
    const activeButton = page.getByRole('button', { name: '外购' });
    await expect(activeButton).toHaveClass(/active/);

    console.log('✓ 物料属性筛选器工作正常');
  });

  test('应该能够使用搜索功能', async ({ page }) => {
    await page.goto('/');

    // 上传文件
    const testFile = path.join(__dirname, '../../BOM成本查询_2026041415170958.xlsx');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // 等待表格加载
    await expect(page.locator('.vxe-table')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // 先折叠所有节点，再展开，以获取完整的总行数
    await page.getByRole('button', { name: '全部折叠' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: '全部展开' }).click();
    await page.waitForTimeout(1000);

    // 记录全部展开后的总行数
    const totalRows = await page.locator('.vxe-body--row').count();
    console.log(`全部展开后总行数: ${totalRows}`);

    // 输入搜索关键词
    const searchInput = page.locator('input[aria-label="搜索编码/名称"]');
    await searchInput.fill('电阻');
    await page.waitForTimeout(2000); // 等待搜索和自动展开完成

    // 验证搜索后的行数变化
    const searchedRows = await page.locator('.vxe-body--row').count();
    console.log(`搜索后行数: ${searchedRows}`);

    // 搜索应该过滤掉不匹配的行，所以搜索后行数应该少于总行数
    expect(searchedRows).toBeGreaterThan(0);
    expect(searchedRows).toBeLessThan(totalRows);

    console.log('✓ 搜索功能工作正常');
  });

  test('应该能够展开和折叠所有节点', async ({ page }) => {
    await page.goto('/');

    // 上传文件
    const testFile = path.join(__dirname, '../../BOM成本查询_2026041415170958.xlsx');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFile);

    // 等待表格加载
    await expect(page.locator('.vxe-table')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // 点击"全部折叠"
    await page.getByRole('button', { name: '全部折叠' }).click();
    await page.waitForTimeout(1000);

    const collapsedRows = await page.locator('.vxe-body--row').count();
    console.log(`折叠后行数: ${collapsedRows}`);

    // 点击"全部展开"
    await page.getByRole('button', { name: '全部展开' }).click();
    await page.waitForTimeout(1000);

    const expandedRows = await page.locator('.vxe-body--row').count();
    console.log(`展开后行数: ${expandedRows}`);

    expect(expandedRows).toBeGreaterThan(collapsedRows);

    console.log('✓ 展开/折叠功能工作正常');
  });
});
