import { test, expect } from "@playwright/test";

test("landing page renders core pitch", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /AI mentor/i })).toBeVisible();
  await expect(page.getByText(/won't pretend|refuses to solve/i).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in|start free/i }).first()).toBeVisible();
});

test("privacy and terms pages render", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: /privacy/i })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: /terms/i })).toBeVisible();
});
