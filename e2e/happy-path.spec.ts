/**
 * Happy-path navigation through the consumer flow.
 *
 * Pre-req: MOCK_TRENDS=true so authed pages render + result-* mock ids resolve.
 *
 * This is intentionally a "click around without crashing" smoke — not a
 * synthetic full generation. The Edge Function path remains blocked on real
 * Gemini + Supabase Storage which mock mode does not stand in for.
 *
 * Post-Botdog pivot: the homepage `/` IS the generator (single linkedin-headshot
 * tool with a style picker). There is no trend grid and no `/trend/*` routes,
 * and login is email + password.
 */
import { test, expect } from '@playwright/test'

test('happy path: home → login → studio → creations → settings → result', async ({ page }) => {
  // 1. Home is the generator — hero + upload card render
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText(/Upload one selfie/i)).toBeVisible()

  // 2. Login (email + password)
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible()

  // 3. Studio (authed — MOCK_TRENDS bypasses the auth gate). Pin to the h1 to
  // avoid colliding with the "Pick a trend" section eyebrow.
  await page.goto('/me/studio')
  await expect(page.getByRole('heading', { level: 1, name: /Pick a trend/i })).toBeVisible()

  // 4. Creations (history)
  await page.goto('/me/creations')
  await expect(page.getByRole('heading', { name: /creations/i })).toBeVisible()

  // 5. Settings
  await page.goto('/me/settings')
  await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible()
  await expect(page.getByText(/Your quota/i)).toBeVisible()
  await expect(page.getByText(/Buy credits/i)).toBeVisible()

  // 6. Result (mock-completed)
  await page.goto('/result/mock-completed')
  await expect(page.getByRole('heading', { name: /fresh off the model/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Download/i })).toBeVisible()

  // 7. Result (mock-processing) — verifies the loading state renders
  await page.goto('/result/mock-processing')
  await expect(page.getByRole('heading', { name: /Cooking your/i })).toBeVisible()
})
