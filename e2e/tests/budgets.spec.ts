import { test, expect, request } from '@playwright/test'

const API = 'http://localhost:3001/api'

test.describe('Budgets', () => {
  // Ensure at least Groceries (id=1) has a budget before each test
  test.beforeEach(async () => {
    const ctx = await request.newContext()
    await ctx.put(`${API}/budgets/1`, { data: { monthly_limit: 400 } })
    await ctx.dispose()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/budgets')
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible()
  })

  test('shows page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Budgets' })).toBeVisible()
  })

  test('shows budget cards for seeded categories', async ({ page }) => {
    await expect(page.getByText('Groceries')).toBeVisible()
  })

  test('budget cards show spent and limit amounts', async ({ page }) => {
    await expect(page.getByText('$400.00 / month')).toBeVisible()
  })

  test('can open edit modal for a budget', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/Budget for/)).toBeVisible()
  })

  test('can update a budget limit', async ({ page }) => {
    await page.getByRole('button', { name: 'Edit' }).first().click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    const limitInput = modal.getByLabel('Monthly limit ($)')
    await limitInput.clear()
    await limitInput.fill('500')
    await modal.getByRole('button', { name: 'Save' }).click()
    await expect(modal).not.toBeVisible()
    await expect(page.getByText('$500.00 / month')).toBeVisible()
  })

  test('can remove a budget', async ({ page }) => {
    page.on('dialog', d => d.accept())
    await page.getByRole('button', { name: 'Remove' }).first().click()
    await page.waitForResponse(r => r.url().includes('/api/budgets') && r.request().method() === 'DELETE')
    await page.waitForTimeout(300)
    // Budget card should be gone or show empty state
    const cards = page.getByText('$400.00 / month')
    await expect(cards).not.toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.getByRole('link', { name: /dashboard/i }).first().click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})
