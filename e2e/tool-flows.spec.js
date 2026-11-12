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

test('guest users are prompted to authorize before adding a website', async ({ page }) => {
  await page.goto('/MyOnlineTools/#/navigation')
  await page.getByRole('button', { name: '添加网址' }).click()
  await expect(page.getByRole('dialog', { name: 'GitHub 管理员授权' })).toBeVisible()
  await expect(page.getByLabel('Personal Access Token')).toBeVisible()
})

test('administrator authorization rejects tokens without repository write access', async ({ page }) => {
  await page.route('https://api.github.com/repos/shenshou/MyOnlineTools', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        full_name: 'shenshou/MyOnlineTools',
        permissions: { push: false },
      }),
    })
  })

  await page.goto('/MyOnlineTools/#/navigation')
  await page.getByRole('button', { name: '管理员登录' }).click()
  await page.getByLabel('Personal Access Token').fill('github_pat_test_without_write_permission')
  await page.getByRole('button', { name: '验证并登录' }).click()

  await expect(page.getByText('当前 GitHub 账号没有此仓库的写入权限')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'GitHub 管理员授权' })).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('mot-navigation-github-token'))).toBeNull()
})

test('website details drawer exposes a dialog and closes with Escape', async ({ page }) => {
  await page.goto('/MyOnlineTools/#/navigation')
  await page.getByRole('button', { name: '详情' }).first().click()
  const dialog = page.getByRole('dialog', { name: '网站详情' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('invalid navigation import is rejected without closing the import dialog', async ({ page }) => {
  await page.route('https://api.github.com/repos/shenshou/MyOnlineTools', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        full_name: 'shenshou/MyOnlineTools',
        permissions: { push: true },
      }),
    })
  })

  await page.goto('/MyOnlineTools/#/navigation')
  await page.getByRole('button', { name: '管理员登录' }).click()
  await page.getByLabel('Personal Access Token').fill('github_pat_test_with_write_permission')
  await page.getByRole('button', { name: '验证并登录' }).click()
  await page.getByLabel('关闭').click()

  await page.locator('button[title="导入 JSON"]').click()
  const dialog = page.getByRole('dialog', { name: '导入网址数据' })
  await expect(dialog).toBeVisible()
  await page.getByLabel('JSON 数据').fill('{ invalid json')
  await page.getByRole('button', { name: '开始导入' }).click()
  await expect(page.locator('.nav-alert-error')).toBeVisible()
  await expect(dialog).toBeVisible()
})
