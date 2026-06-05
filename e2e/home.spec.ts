import { expect, test } from '@playwright/test'

test.describe('Home', () => {
  test('renders title + tagline', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /professional headshot/i })).toBeVisible()
    await expect(page.getByText(/Upload one selfie/i)).toBeVisible()
  })

  test('sets metadata title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Botdog/)
  })
})
