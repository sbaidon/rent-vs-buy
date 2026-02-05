import { test, expect } from "@playwright/test";

// Mobile-specific tests
test.describe("Mobile View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("should display mobile hamburger menu", async ({ page, isMobile }) => {
    test.skip(!isMobile, "This test is for mobile only");

    const menuButton = page.getByTestId("mobile-menu-button");
    await expect(menuButton).toBeVisible();
  });

  test("should open mobile menu and show navigation", async ({ page, isMobile }) => {
    test.skip(!isMobile, "This test is for mobile only");

    const menuButton = page.getByTestId("mobile-menu-button");
    await menuButton.click();

    // Mobile menu should show navigation links
    await expect(page.getByText("Calculator")).toBeVisible();
    await expect(page.getByText("Explore")).toBeVisible();
  });

  test("should navigate via mobile menu", async ({ page, isMobile }) => {
    test.skip(!isMobile, "This test is for mobile only");

    const menuButton = page.getByTestId("mobile-menu-button");
    await menuButton.click();

    // Click explore link
    await page.getByText("Explore").click();
    await expect(page).toHaveURL(/\/explore/);
  });

  test("should display calculator inputs on mobile", async ({ page, isMobile }) => {
    test.skip(!isMobile, "This test is for mobile only");

    // Home price slider should be visible
    const homePriceSlider = page.locator("#homePrice-input");
    await expect(homePriceSlider).toBeVisible();
  });

  test("should show results when scrolled", async ({ page, isMobile }) => {
    test.skip(!isMobile, "This test is for mobile only");

    // Scroll to bottom to see results
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Wait a bit for scroll to settle
    await page.waitForTimeout(500);
    
    const resultsHero = page.getByTestId("results-hero");
    await expect(resultsHero).toBeVisible({ timeout: 10000 });
  });

  test("should allow scrolling", async ({ page, isMobile }) => {
    test.skip(!isMobile, "This test is for mobile only");

    const initialScrollY = await page.evaluate(() => window.scrollY);
    await page.evaluate(() => window.scrollTo(0, 500));
    const newScrollY = await page.evaluate(() => window.scrollY);
    
    expect(newScrollY).toBeGreaterThan(initialScrollY);
  });
});

test.describe("Responsive Layout", () => {
  test("mobile menu button visible on mobile only", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const menuButton = page.getByTestId("mobile-menu-button");
    
    if (isMobile) {
      await expect(menuButton).toBeVisible();
    } else {
      await expect(menuButton).toBeHidden();
    }
  });

  test("chart should render correctly", async ({ page, isMobile }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='results-tabs']", { state: "attached", timeout: 15000 });

    if (isMobile) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    }

    // Click chart tab
    const chartTab = page.getByTestId("tab-chart");
    await chartTab.click();

    // Chart should be visible
    await expect(page.getByTestId("chart-container")).toBeVisible();
  });
});
