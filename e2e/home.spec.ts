import { expect, test } from '@playwright/test'

test.describe('Home', () => {
  test('renders title + tagline', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Trend Image Generator/i })).toBeVisible()
    await expect(page.getByText(/Try viral image-generation trends/i)).toBeVisible()
  })

  test('sets metadata title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Trend Image Generator/)
  })
})
