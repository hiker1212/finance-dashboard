import { test, expect } from '@playwright/test'

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/transactions')
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible()
  })

  test('shows summary bar with Income, Expenses, Net', async ({ page }) => {
    await expect(page.getByText('Income').first()).toBeVisible()
    await expect(page.getByText('Expenses').first()).toBeVisible()
    await expect(page.getByText('Net')).toBeVisible()
  })

  test('export buttons are present', async ({ page }) => {
    await expect(page.getByTitle('Export to Excel')).toBeVisible()
    await expect(page.getByTitle('Export PDF report')).toBeVisible()
  })

  test('+ Add button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('New Transaction')).toBeVisible()
  })

  test('can create a new transaction', async ({ page }) => {
    const label = `E2E create ${Date.now()}`
    await page.getByRole('button', { name: '+ Add' }).click()
    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()

    await modal.getByLabel('Description').fill(label)
    await modal.getByLabel('Amount ($)').fill('42.50')
    await modal.getByRole('button', { name: 'Add Transaction' }).click()

    await expect(modal).not.toBeVisible()
    await expect(page.getByText(label).first()).toBeVisible()
    await expect(page.getByText('-$42.50').first()).toBeVisible()
  })

  test('can edit an existing transaction', async ({ page }) => {
    const label = `Edit-me ${Date.now()}`
    // Create one
    await page.getByRole('button', { name: '+ Add' }).click()
    let modal = page.getByRole('dialog')
    await modal.getByLabel('Description').fill(label)
    await modal.getByLabel('Amount ($)').fill('10.00')
    await modal.getByRole('button', { name: 'Add Transaction' }).click()
    await expect(modal).not.toBeVisible()

    // Find and click its edit button (use .first() in case of duplicates)
    const txRow = page.locator('.divide-y > div').filter({ hasText: label }).first()
    await txRow.waitFor()
    await txRow.getByRole('button', { name: 'Edit' }).click()

    modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await expect(modal.getByText('Edit Transaction')).toBeVisible()
    await modal.getByLabel('Description').clear()
    await modal.getByLabel('Description').fill('Edited result')
    await modal.getByRole('button', { name: 'Update' }).click()
    await expect(modal).not.toBeVisible()
    await expect(page.getByText('Edited result').first()).toBeVisible()
  })

  test('can delete a transaction', async ({ page }) => {
    const label = `Delete-me ${Date.now()}`
    // Create one to delete
    await page.getByRole('button', { name: '+ Add' }).click()
    const modal = page.getByRole('dialog')
    await modal.getByLabel('Description').fill(label)
    await modal.getByLabel('Amount ($)').fill('5.00')
    await modal.getByRole('button', { name: 'Add Transaction' }).click()
    await expect(modal).not.toBeVisible()

    const txRow = page.locator('.divide-y > div').filter({ hasText: label }).first()
    await txRow.waitFor()

    page.on('dialog', d => d.accept())
    await txRow.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText(label)).not.toBeVisible()
  })

  test('modal closes on cancel', async ({ page }) => {
    await page.getByRole('button', { name: '+ Add' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('month picker filters the list', async ({ page }) => {
    const picker = page.locator('input[type="month"]').first()
    await picker.fill('2020-01')
    await page.waitForResponse(r => r.url().includes('/api/transactions'))
    await expect(page.getByText(/no transactions/i)).toBeVisible()
  })
})
