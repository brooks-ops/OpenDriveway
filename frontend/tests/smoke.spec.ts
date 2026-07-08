import { expect, test } from "@playwright/test";

const unique = Date.now();
const reservationStart = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000 + (unique % 10000) * 60 * 1000);
reservationStart.setSeconds(0, 0);
const reservationEnd = new Date(reservationStart.getTime() + 3 * 60 * 60 * 1000);

function datetimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test.beforeEach(async ({ page }) => {
  await page.context().grantPermissions(["geolocation"], { origin: "http://localhost:5174" });
  await page.context().setGeolocation({ latitude: 41.8601, longitude: -87.6225 });
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
});

test("landing page and search use live API listings", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /Find driveway parking on the map/ })).toBeVisible();

  await page.getByPlaceholder("Search parking").fill("Museum");
  await page.getByRole("button", { name: /Search/ }).click();

  await expect(page).toHaveURL(/\/search\?q=Museum/);
  await expect(page.getByText(/active listing/)).toBeVisible();
  await expect(page.locator("a[href^='/listings/']").first()).toBeVisible();
});

test("location services search nearby driveway listings", async ({ page }) => {
  await page.getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByText(/Showing driveway spaces near your current location/)).toBeVisible();

  await page.getByPlaceholder("Search parking").fill("Museum");
  await page.getByRole("button", { name: /^Search/ }).click();

  await expect(page).toHaveURL(/lat=41\.8601/);
  await expect(page).toHaveURL(/lng=-87\.6225/);
  await expect(page.getByText(/within 25 miles/)).toBeVisible();
  await expect(page.locator("a[href^='/listings/']").first()).toBeVisible();
});

test("local demo user can sign up and become a host", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.getByLabel("Full name").fill("Smoke Test Host");
  await page.getByLabel("Email").fill(`host-${unique}@opendriveway.dev`);
  await page.getByLabel("Password").fill("local-demo-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(`host-${unique}@opendriveway.dev`)).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Become a Host" }).click();
  await expect(page.getByText("Role").locator("..")).toContainText("host");
  await expect(page.getByRole("link", { name: /New/ })).toBeVisible();
});

test("host can create a listing and find it in search", async ({ page }) => {
  const title = `Smoke test driveway ${unique}`;
  await page.goto("/login?mode=signup&intent=host&next=/dashboard/listings/new");
  await page.getByLabel("Full name").fill("Smoke Test Creator");
  await page.getByLabel("Email").fill(`creator-${unique}@opendriveway.dev`);
  await page.getByLabel("Password").fill("local-demo-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill("A real-looking local demo listing created by the frontend smoke test.");
  await page.getByLabel("Address line 1").fill("1900 S Prairie Ave");
  await page.getByLabel("City", { exact: true }).fill("Chicago");
  await page.getByLabel("State", { exact: true }).fill("IL");
  await page.getByLabel("Postal code", { exact: true }).fill("60616");
  await page.getByLabel("Latitude", { exact: true }).fill("41.854900");
  await page.getByLabel("Longitude", { exact: true }).fill("-87.620700");
  await page.getByLabel("Hourly price in cents", { exact: true }).fill("2600");
  await page.getByLabel("Capacity", { exact: true }).fill("1");
  await page.locator("select[name='status']").selectOption("active");
  await page.getByRole("button", { name: "Create listing" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto(`/search?q=${encodeURIComponent(title)}`);
  await expect(page.getByText(title)).toBeVisible();
});

test("driver can view a listing and create a reservation", async ({ page }) => {
  await page.goto("/login?mode=signup");
  await page.getByLabel("Full name").fill("Smoke Test Driver");
  await page.getByLabel("Email").fill(`driver-${unique}@opendriveway.dev`);
  await page.getByLabel("Password").fill("local-demo-password");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.goto("/search?q=Museum");
  await page.locator("a[href^='/listings/']").first().click();
  await expect(page.getByRole("heading")).toBeVisible();

  await page.getByLabel("Start", { exact: true }).fill(datetimeLocalValue(reservationStart));
  await page.getByLabel("End", { exact: true }).fill(datetimeLocalValue(reservationEnd));
  await page.getByRole("button", { name: /Reserve/ }).click();
  await expect(page).toHaveURL(/\/dashboard\?booking=.*payment=demo/);
  await expect(page.getByText(/confirmed/)).toBeVisible();
});
