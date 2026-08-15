import { expect, test, type Page } from "@playwright/test";

/**
 * Regression suite for the flows that keep breaking: auth, project creation,
 * the plugin connect panel, Explorer refresh and photo attachment.
 */

const unique = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

async function openDashboard(page: Page) {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: /projects/i }).first()).toBeVisible();
}

async function createProject(page: Page, name: string) {
  await openDashboard(page);
  await page.getByRole("button", { name: /new project/i }).first().click();
  const nameField = page.getByLabel(/project name/i).or(page.getByPlaceholder(/project/i)).first();
  await nameField.fill(name);
  await page.getByRole("button", { name: /^create/i }).first().click();
  await expect(page.getByText(name).first()).toBeVisible();
}

test.describe("auth", () => {
  test("sign up creates an account and lands on the dashboard", async ({ page }) => {
    const email = `${unique()}@example.com`;
    await page.goto("/auth");
    await page.getByRole("tab", { name: /create account/i }).click();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("lemonade-e2e-pass");
    await page.getByRole("button", { name: /create account/i }).last().click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 30_000 });
  });

  test("sign in rejects a wrong password without breaking the page", async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: /^sign in$/i }).last().click();
    await expect(page.getByRole("button", { name: /^sign in$/i }).last()).toBeVisible();
  });

  test("forgot password is reachable and the reset page renders", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("button", { name: /forgot password/i })).toBeVisible();
    await page.goto("/reset-password");
    await expect(page.getByRole("heading", { name: /set a new password/i })).toBeVisible();
  });
});

test.describe("workspace", () => {
  test("project creation, connect panel, explorer refresh and photo attach", async ({ page }) => {
    const name = unique();
    await createProject(page, name);
    await page.getByText(name).first().click();
    await expect(page).toHaveURL(/projects\//, { timeout: 30_000 });

    // Connection status is honest about the plugin being absent.
    await expect(page.getByText(/disconnected|waiting for plugin/i).first()).toBeVisible();

    // Connect panel exposes the download + token.
    await expect(page.getByRole("button", { name: /download plugin/i })).toBeVisible();
    await expect(page.getByLabel(/connection token/i)).toHaveValue(/.{8,}/);

    // Explorer tab refresh queues a command instead of throwing.
    await page.getByRole("tab", { name: /explorer/i }).click();
    await page.getByRole("button", { name: /refresh/i }).click();
    await page.getByRole("tab", { name: /activity/i }).click();
    await expect(page.getByText("get_tree").first()).toBeVisible();

    // Photo attachment shows a preview chip before sending.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await page.setInputFiles('input[type="file"]', {
      name: "shot.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(page.getByRole("button", { name: /remove shot\.png/i })).toBeVisible();
  });

  test("plugin disconnects, reconnects and pushes Explorer changes without polling", async ({
    page,
  }) => {
    const name = unique();
    await createProject(page, name);
    await page.getByText(name).first().click();

    const token = await page.getByLabel(/connection token/i).inputValue();
    const api = page.request;
    const connect = () =>
      api.post("/api/public/plugin/connect", {
        data: { token, placeName: "E2E Place", placeId: "4242" },
      });
    const pushTree = (partName: string) =>
      api.post("/api/public/plugin/tree", {
        data: {
          token,
          placeName: "E2E Place",
          placeId: "4242",
          tree: {
            name: "E2E Place",
            children: [
              {
                name: "Workspace",
                className: "Workspace",
                children: [{ name: partName, className: "Part" }],
              },
            ],
          },
        },
      });

    expect((await connect()).ok()).toBeTruthy();
    expect((await pushTree("BeforeReconnect")).ok()).toBeTruthy();
    await expect(page.getByText("Connected", { exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: /explorer/i }).click();
    await page.getByRole("button", { name: "Workspace" }).click();
    await expect(page.getByRole("button", { name: /BeforeReconnect/ })).toBeVisible();

    // Let the 8-second heartbeat expire. No endpoint call keeps it artificially connected.
    await expect(page.getByText("Disconnected", { exact: true }).first()).toBeVisible({
      timeout: 12_000,
    });

    expect((await connect()).ok()).toBeTruthy();
    await expect(page.getByText("Connected", { exact: true }).first()).toBeVisible();

    const pushedAt = Date.now();
    expect((await pushTree("AfterReconnect")).ok()).toBeTruthy();
    await expect(page.getByRole("button", { name: /AfterReconnect/ })).toBeVisible({
      timeout: 2_500,
    });
    expect(Date.now() - pushedAt).toBeLessThan(2_500);
  });
});
