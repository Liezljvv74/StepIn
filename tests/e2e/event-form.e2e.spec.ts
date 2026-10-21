import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import { seedTestUser, cleanupTestUser, testUser } from '../helpers/seedUser'

// Nothing here is saved: it only checks the forms staff type into.
test.describe('Event and booking forms', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()
    page = await (await browser.newContext()).newPage()
    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('the slug follows the name and date while typing', async () => {
    await page.goto('http://localhost:3000/admin/collections/events/create')
    await page.locator('input[name="name"]').fill('Spring Dance')
    const slug = page.locator('input[name="slug"]')
    await expect(slug).toHaveValue('spring-dance')
    await page.locator('#field-date input').first().fill('11/14/2026 7:30 PM')
    await page.keyboard.press('Escape')
    await expect(slug).toHaveValue('spring-dance-2026-11-14')

    // A slug typed by hand is kept when the name changes.
    await slug.fill('my-own-address')
    await page.locator('input[name="name"]').fill('Autumn Dance')
    await expect(slug).toHaveValue('my-own-address')
  })

  test('the Repeat and Confirm fields can be filled in', async () => {
    await page.goto('http://localhost:3000/admin/collections/events/create')
    await page.locator('input[name="repeatTimes"]').fill('3')
    await expect(page.locator('input[name="repeatTimes"]')).toHaveValue('3')
    await expect(page.locator('#field-repeatEvery .react-select')).not.toHaveClass(/--read-only|disabled/)
    await expect(page.locator('input[name="confirmTableChanges"]')).toBeEnabled()
  })

  test('Cancel the whole booking can be ticked', async () => {
    await page.goto('http://localhost:3000/admin/collections/bookings/create')
    await expect(page.locator('input[name="cancelBooking"]')).toBeEnabled()
  })
})
