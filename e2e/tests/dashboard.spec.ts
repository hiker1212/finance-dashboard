import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
  })

  test('shows page heading and KPI cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    // KPI labels — use .first() since chart legends also contain "Income"/"Expenses"
    await expect(page.getByText('Income').first()).toBeVisible()
    await expect(page.getByText('Expenses').first()).toBeVisible()
    await expect(page.getByText('Net savings')).toBeVisible()
  })

  test('renders spending pie chart', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /spending by category/i })).toBeVisible()
    await expect(page.locator('svg').first()).toBeVisible()
  })

  test('renders monthly trend chart', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /income vs expenses/i })).toBeVisible()
    await expect(page.locator('svg').nth(1)).toBeVisible()
  })

  test('shows recent transactions section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /recent transactions/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /view all/i })).toBeVisible()
  })

  test('month picker is visible and functional', async ({ page }) => {
    const picker = page.locator('input[type="month"]').first()
    await expect(picker).toBeVisible()
    const value = await picker.inputValue()
    expect(value).toMatch(/^\d{4}-\d{2}$/)
  })

  test('PDF export button is present', async ({ page }) => {
    await expect(page.getByTitle('Export PDF report')).toBeVisible()
  })

  test('AI Insights panel is present with generate button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /ai spending insights/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /generate insights/i })).toBeVisible()
  })

  test('clicking View all navigates to transactions', async ({ page }) => {
    await page.getByRole('link', { name: /view all/i }).click()
    await expect(page).toHaveURL('/transactions')
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  })
})
