import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';

test('Capture Short Term Fund Direct-Growth NAV daily', async ({ page }) => {
  await page.goto('https://www.icicipruamc.com/mutual-fund/nav-&-idcw', { timeout: 60000 });

  await page.getByRole('textbox', { name: 'Search by fund name' }).click();
  await page.getByRole('textbox', { name: 'Search by fund name' }).fill('short');
  await page.getByRole('button', { name: 'SEARCH', exact: true }).click();

  await page.getByRole('checkbox', { name: /Short Term Fund Direct - Growth/ }).first().click();
  await page.waitForSelector('text=Fund Name', { timeout: 30000 });
  await page.waitForTimeout(5000);

  const targetRow = page.locator('tr').filter({ hasText: 'Short Term Fund' }).filter({ hasText: 'Direct - Growth' }).first();
  await expect(targetRow).toBeVisible({ timeout: 30000 });

  const navText = await targetRow.locator('td').nth(1).innerText();
  const changeText = await targetRow.locator('td').nth(2).innerText();

  // LIVE VALUES ONLY - no defaults
  const navMatch = navText.match(/(?:₹\s*)?([\d.]+)/);
  if (!navMatch) throw new Error('LIVE NAV not found: ' + navText);
  const navValue = navMatch[1];

  const dateMatch = navText.match(/\(as on (.+?)\)/);
  const navDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-GB');

  const changeMatch = changeText.match(/([-\d.]+%)/);
  const changeValue = changeMatch ? changeMatch[1] : '';

  let trend = '';
  if (changeText.includes('↑') || parseFloat(changeValue) > 0) trend = 'UP';
  if (changeText.includes('↓') || changeValue.startsWith('-')) trend = 'DOWN';

  const finalText = `NAV Captured: ${navValue} on ${navDate} | 1 Day Change: ${changeValue} ${trend} | Fund: Short Term Direct-Growth - LIVE`;
  console.log(finalText);

  // Write ONLY if live value captured
  fs.writeFileSync('nav-email.txt', finalText);
  fs.writeFileSync(path.join(process.cwd(), 'nav-email.txt'), finalText);

  const csvPath = path.join(process.cwd(), 'nav-history.csv');
  if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, 'Timestamp,NAV_Date,NAV_Value,Change\n');
  fs.appendFileSync(csvPath, `${new Date().toISOString()},${navDate},${navValue},${changeValue}\n`);

  expect(parseFloat(navValue)).toBeGreaterThan(50);
});
