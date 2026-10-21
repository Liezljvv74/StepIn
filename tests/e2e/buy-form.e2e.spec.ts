import { test, expect } from '@playwright/test'

// Uses the first upcoming event on the dev database. Nothing is bought.
test('the guest count cannot go past the number of name rows', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await page.locator('.events .card').first().click()
  const quantity = page.locator('input[name="quantity"]')
  const max = Number(await quantity.getAttribute('max'))

  await quantity.fill(String(max + 5))
  await expect(quantity).toHaveValue(String(max))
  await expect(page.locator('input[name$=".name"]')).toHaveCount(max)

  await quantity.fill('3')
  await expect(quantity).toHaveValue('3')
  await expect(page.locator('input[name$=".name"]')).toHaveCount(3)
})
