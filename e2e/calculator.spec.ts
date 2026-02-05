import { test, expect } from "@playwright/test";

test.describe("Calculator Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the app to hydrate - look for a key element
    await page.waitForSelector("[data-testid='results-hero']", { state: "attached", timeout: 15000 });
  });

  test("should load the calculator page", async ({ page }) => {
    await expect(page).toHaveTitle(/Rent vs Buy Calculator/);
  });

  test("should display the main result card", async ({ page, isMobile }) => {
    // On mobile, scroll to make results visible
    if (isMobile) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
    await expect(page.getByTestId("results-hero")).toBeVisible();
    await expect(page.getByTestId("results-savings")).toBeVisible();
  });

  test("should display calculator sliders", async ({ page }) => {
    // Home price slider should be visible
    const homePriceSlider = page.locator("#homePrice-input");
    await expect(homePriceSlider).toBeVisible();

    // Monthly rent slider should be visible  
    const rentSlider = page.locator("#monthlyRent-input");
    await expect(rentSlider).toBeVisible();
  });

  test("should have working tabs", async ({ page, isMobile }) => {
    // On mobile, scroll to tabs
    if (isMobile) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
    
    // Wait for tabs to be visible
    await expect(page.getByTestId("results-tabs")).toBeVisible({ timeout: 10000 });

    const chartTab = page.getByTestId("tab-chart");
    const amortizationTab = page.getByTestId("tab-amortization");
    const summaryTab = page.getByTestId("tab-summary");

    // Click Chart tab
    await chartTab.click();
    await expect(page.getByTestId("chart-container")).toBeVisible();

    // Click Amortization tab - wait for chart to settle first
    await page.waitForTimeout(100);
    await amortizationTab.click();
    await expect(page.getByText(/loan amount/i).first()).toBeVisible();

    // Click Summary tab
    await summaryTab.click();
    await expect(page.getByText(/initial costs/i).first()).toBeVisible();
  });

  test("should display comparison result", async ({ page, isMobile }) => {
    if (isMobile) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
    
    const winner = page.getByTestId("results-winner");
    await expect(winner).toBeVisible({ timeout: 10000 });
    const winnerText = await winner.textContent();
    expect(winnerText).toMatch(/renting|buying/i);
  });
});

test.describe("Theme Toggle", () => {
  test("should toggle between light and dark mode", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='theme-toggle']", { state: "attached", timeout: 15000 });

    // Use first() since there may be desktop and mobile versions
    const lightButton = page.getByTestId("theme-light").first();
    const darkButton = page.getByTestId("theme-dark").first();

    await expect(lightButton).toBeVisible();

    // Click light mode
    await lightButton.click();
    await expect(page.locator("html")).toHaveClass(/light/);

    // Click dark mode
    await darkButton.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("Navigation", () => {
  test("should navigate to explore page", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    if (isMobile) {
      // Open mobile menu first
      await page.getByTestId("mobile-menu-button").click();
    }

    const exploreLink = page.getByRole("link", { name: /explore/i }).first();
    await exploreLink.click();
    await expect(page).toHaveURL(/\/explore/);
  });

  test("should navigate back to calculator", async ({ page, isMobile }) => {
    await page.goto("/explore");
    await page.waitForLoadState("domcontentloaded");

    if (isMobile) {
      // Open mobile menu first
      const menuButton = page.getByTestId("mobile-menu-button");
      if (await menuButton.isVisible()) {
        await menuButton.click();
      }
    }

    const calculatorLink = page.getByRole("link", { name: /calculator/i }).first();
    await calculatorLink.click();
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/(\?.*)?$/);
  });
});
