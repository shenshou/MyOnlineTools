import { expect, test } from '@playwright/test'

test('JSON tool formats input in the browser', async ({ page }) => {
  await page.goto('/MyOnlineTools/#/tool/json')
  await page.getByLabel('待处理文本').fill('{"hello":"world"}')
  await page.getByRole('button', { name: '立即处理' }).click()
  await expect(page.locator('pre[aria-label="处理结果"]')).toContainText('"hello": "world"')
})

test('regex tool executes in its worker and returns matches', async ({ page }) => {
  await page.goto('/MyOnlineTools/#/tool/regex')
  await page.getByLabel('正则表达式').fill('\\d+')
  await page.getByLabel('Flags').fill('g')
  await page.getByLabel('待处理文本').fill('Order 123 and 456')
  await page.getByRole('button', { name: '立即处理' }).click()
  const output = page.locator('pre[aria-label="处理结果"]')
  await expect(output).toContainText('123')
  await expect(output).toContainText('456')
})

test('navigation route loads and displays its public data', async ({ page }) => {
  await page.goto('/MyOnlineTools/#/navigation')
  await expect(page.getByRole('heading', { name: '网址导航' })).toBeVisible()
  await expect(page.getByText('B站', { exact: true })).toBeVisible({ timeout: 20000 })
})
