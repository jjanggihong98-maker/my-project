import { expect, test } from "@playwright/test";

test("첫 화면이 열리고 스크린샷 올리기 입력이 보인다", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("UI Spec Builder");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "UI Spec Builder"
  );
  await expect(page.getByLabel("스크린샷 파일 선택")).toBeVisible();
});
