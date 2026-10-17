import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import path from 'path';

test('Capture Short Term Fund Direct-Growth NAV daily', async ({ page }) => {
  await page.goto('https://www.icicipruamc.com/mutual-fund/nav-&-idcw');
  await page.getByRole('textbox', { name: 'Search by fund name' }).click();
  await page.getByRole('textbox', { name: 'Search by fund name' }).fill('short');
  await page.getByRole('button', { name: 'SEARCH', exact: true }).click();
  await page.getByRole('checkbox', { name: /ICICI Prudential Short Term Fund Direct - Growth/ }).click();

  await page.waitForSelector('text=Fund Name', { timeout: 30000 });
  await page.waitForTimeout(3000);

  const targetRow = page.locator('tr').filter({ hasText: 'Short Term Fund' }).filter({ hasText: 'Direct - Growth' }).first();
  await expect(targetRow).toBeVisible({ timeout: 20000 });

  const navText = await targetRow.locator('td').nth(1).innerText();
  const changeText = await targetRow.locator('td').nth(2).innerText();

  const navMatch = navText.match(/₹\s*([\d.]+)/);
  const navValue = navMatch ? navMatch[1] : navText.split('\n')[0].trim();

  const dateMatch = navText.match(/\(as on (.+?)\)/);
  const navDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-IN');

  const changeMatch = changeText.match(/([-\d.]+%)/);
  const changeValue = changeMatch ? changeMatch[1] : changeText.trim();

  let trend = 'FLAT';
  if (changeText.includes('↑')) trend = 'UP';
  if (changeText.includes('↓')) trend = 'DOWN';
  if (parseFloat(changeValue) > 0) trend = 'UP';
  if (changeValue.startsWith('-')) trend = 'DOWN';

  const finalText = `NAV Captured: ${navValue} on ${navDate} | 1 Day Change: ${changeValue} ${trend} | Fund: ICICI Short Term Direct-Growth`;
  console.log(finalText);

  const workspace = process.cwd();
  fs.writeFileSync(path.join(workspace, 'nav-email.txt'), finalText);
  fs.writeFileSync('nav-email.txt', finalText);

  const csvPath = path.join(workspace, 'nav-history.csv');
  const csvLine = `${new Date().toISOString()},${navDate},${navValue},${changeValue} ${trend}\n`;
  if (!fs.existsSync(csvPath)) {
    fs.writeFileSync(csvPath, 'Timestamp,NAV_Date,NAV_Value,Change\n');
  }
  fs.appendFileSync(csvPath, csvLine);

  expect(parseFloat(navValue)).toBeGreaterThan(0);
});
