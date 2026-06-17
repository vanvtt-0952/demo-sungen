import { test, expect } from '../base';
import { type Page, type BrowserContext } from '@playwright/test';
import { TestDataLoader } from '../test-data';

// This file is auto-generated from Gherkin feature files
// DO NOT EDIT MANUALLY - changes will be overwritten
// To modify tests, edit the corresponding .feature file and regenerate

const testData = TestDataLoader.load('contact-points', 'contact-points');

/**
 * Feature: contact-points Screen
 *   As an authenticated Sun* employee
  I want to view the contact points list
  So that I can identify the right department contact person per office location
  Path: /vi/contact-points
 */

test.describe('contact-points Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Open contact-points page
    await page.goto('/vi/contact-points', { waitUntil: 'load' });
    await page.waitForLoadState('domcontentloaded');
    
  });

  test.describe('user', () => {
    test.use({ storageState: 'specs/.auth/user.json' });

    test('VP-UI-001 Bảng hiển thị đúng với tiêu đề trang khi tải', { tag: ['@high'] }, async ({ page }) => {
      // Wait for Contact Points Table to be visible
      await page.getByRole('table').nth(0).waitFor({ state: 'visible' });
      // Assert Page Title has text page_title
      await expect(page.getByRole('heading', { name: 'Danh sách điểm liên hệ' })).toHaveText(testData.get('page_title'));
      
      // Assert Contact Points Table is visible
      await expect(page.getByRole('table').nth(0)).toBeVisible();
      
    });
  

    test('VP-UI-002 Bảng hiển thị đủ 5 cột khi tải', { tag: ['@high'] }, async ({ page }) => {
      // Wait for Contact Points Table to be visible
      await page.getByRole('table').nth(0).waitFor({ state: 'visible' });
      // Assert Contact Points Table is visible
      await expect(page.getByRole('table').nth(0)).toBeVisible();
      
      // Assert Liên lạc column in Contact Points Table table
      await expect(page.getByRole('table').nth(0).getByRole('columnheader', { name: 'Liên lạc' })).toBeVisible();
      // Assert Vị trí column in Contact Points Table table
      await expect(page.getByRole('table').nth(0).getByRole('columnheader', { name: 'Vị trí' })).toBeVisible();
      // Assert Vấn đề column in Contact Points Table table
      await expect(page.getByRole('table').nth(0).getByRole('columnheader', { name: 'Vấn đề' })).toBeVisible();
      // Assert DaNang Office column in Contact Points Table table
      await expect(page.getByRole('table').nth(0).getByRole('columnheader', { name: 'DaNang Office' })).toBeVisible();
      // Assert HCMC Office column in Contact Points Table table
      await expect(page.getByRole('table').nth(0).getByRole('columnheader', { name: 'HCMC Office' })).toBeVisible();
      // Assert Hanoi Office column in Contact Points Table table
      await expect(page.getByRole('table').nth(0).getByRole('columnheader', { name: 'Hanoi Office' })).toBeVisible();
    });
  

    test('VP-DATA-003 Ô dash placeholder tồn tại trong bảng liên hệ', { tag: ['@normal'] }, async ({ page }) => {
      // Assert Contact Points Table is visible
      await expect(page.getByRole('table').nth(0)).toBeVisible();
      
      // Assert No Contact Cell has text no_contact_placeholder
      await expect(page.getByText(testData.get('no_contact_placeholder'), { exact: true }).nth(0)).toHaveText(testData.get('no_contact_placeholder'));
      
    });
  

  });

  test('VP-AUTH-001 Session required — unauthenticated direct access is redirected', { tag: ['@high'] }, async ({ page }) => {
    // Assert on Auth page
    await expect(page).toHaveURL(/\/vi\/login/);
    
    // Assert Contact Points Table is not visible
    await expect(page.getByRole('table').nth(0)).toBeHidden();
    
  });

});
