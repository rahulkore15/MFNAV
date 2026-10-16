import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';

test('Capture Short Term Fund Direct-Growth NAV daily', async ({ page }) => {

  // 1. Go to NAV page
  await page.goto('https://www.icicipruamc.com/mutual-fund/nav-&-idcw');
  await page.getByRole('textbox', { name: 'Search by fund name' }).click();
  await page.getByRole('textbox', { name: 'Search by fund name' }).fill('short');
  await page.getByRole('button', { name: 'SEARCH', exact: true }).click();
  await page.getByRole('checkbox', { name: /ICICI Prudential Short Term Fund Direct - Growth/ }).click();
  // 2. Wait for table to load
  await page.waitForSelector('text=Fund Name', { timeout: 30000 });
  await page.waitForTimeout(3000); // site loads data via API

  // 3. Find the row for "Short Term Fund" + "Direct - Growth"
  // From your screenshot, there are 2 rows with same name, we take first exact match
  const targetRow = page.locator('tr').filter({ hasText: 'Short Term Fund' }).filter({ hasText: 'Direct - Growth' }).first();

  await expect(targetRow).toBeVisible({ timeout: 20000 });

  // 4. Extract NAV value
  const navText = await targetRow.locator('td').nth(1).innerText();
  const changeText = await targetRow.locator('td').nth(2).innerText();
  // Example text: "₹70.7746 (as on 09-Oct-26)"

  //console.log('Full Cell Text:', navText);

  // Clean the NAV value - only number
  const navMatch = navText.match(/₹\s*([\d.]+)/);
  const navValue = navMatch? navMatch[1] : navText.split('\n')[0].trim();

  const dateMatch = navText.match(/\(as on (.+?)\)/);
  const navDate = dateMatch? dateMatch[1] : new Date().toLocaleDateString('en-IN');

    // Clean 1 Day Change + detect up/down
  // Example: "0.01% ↑" or "0.02% ↓"
  const changeMatch = changeText.match(/([-\d.]+%)/);
  const changeValue = changeMatch? changeMatch[1] : changeText.trim();

  let trend = 'FLAT';
if (changeText.includes('↑') || changeText.includes('up') || parseFloat(changeValue) > 0) trend = 'UP';
if (changeText.includes('↓') || changeText.includes('down') || changeValue.startsWith('-')) trend = 'DOWN';

  console.log(`NAV Captured: ${navValue} on ${navDate} | 1 Day Change: ${changeValue} ${trend}`);

  // 5. Save to CSV for daily tracking
  const csvPath = path.resolve('nav-history.csv');
  const csvLine = `${new Date().toISOString()},${navDate},${navValue},Short Term Fund Direct-Growth\n`;

  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, 'Timestamp,NAV_Date,NAV_Value,Fund_Name\n');
  }
  fs.appendFileSync(csvPath, csvLine);

  console.log(`Saved to ${csvPath}`);

  // 6. Assertion
  expect(parseFloat(navValue)).toBeGreaterThan(0);
});