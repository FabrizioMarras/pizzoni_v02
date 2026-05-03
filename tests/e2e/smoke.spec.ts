import { test, expect } from '@playwright/test'

test('public access redirects to login', async ({ page }) => {
  await page.goto('/eventi')
  await expect(page).toHaveURL(/\/accedi$/)
})

test('legacy aliases redirect to canonical paths', async ({ page }) => {
  await page.goto('/pizzerias')
  await expect(page).toHaveURL(/\/pizzerie$/)

  await page.goto('/visits')
  await expect(page).toHaveURL(/\/eventi$/)
})
