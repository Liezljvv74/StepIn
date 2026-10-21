import { test, expect } from '@playwright/test'

// Uses the first upcoming event on the dev database. Nothing is bought.
test('any number of guests, up to the seats left, with a name row each', async ({ page }) => {
  await page.goto('http://localhost:3000/')
  await page.locator('.events .card').first().click()
  const quantity = page.locator('input[name="quantity"]')
  const names = page.locator('input[name$=".name"]')
  const seatsLeft = await quantity.getAttribute('max') // null: no table plan, no limit

  // More than the old limit of 10 is fine while the room has the seats.
  const party = Math.min(15, Number(seatsLeft ?? Infinity))
  await quantity.fill(String(party))
  await expect(quantity).toHaveValue(String(party))
  await expect(names).toHaveCount(party)

  if (seatsLeft !== null) {
    await quantity.fill(String(Number(seatsLeft) + 5))
    await expect(quantity).toHaveValue(seatsLeft)
    await expect(names).toHaveCount(Number(seatsLeft))
  }
})
