const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const { serveWeb } = require("./serve-web.cjs");
(async () => {
  const server = await serveWeb();
  let browser;
  try {
    browser = await chromium.launch({
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium")
          ? "/usr/bin/chromium"
          : chromium.executablePath()),
      args: ["--no-sandbox"],
    });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(server.url);
    await page
      .getByRole("button", { name: "Login as Student", exact: true })
      .click();
    await page.getByText("Today’s journeys").waitFor();
    await page.screenshot({
      path: "artifacts/commuter-home.png",
      fullPage: true,
    });
    console.log("Student login and dashboard passed");
    const tab = async (name) => {
      await page.getByRole("tab", { name, exact: true }).click();
    };
    await tab("Route");
    await page
      .getByRole("button", { name: "Doorstep home pickup", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save route & schedule", exact: true })
      .click();
    await page.getByText("✓ ROUTE & SCHEDULE SAVED").waitFor();
    await page
      .getByRole("button", { name: "Activate the matching plan", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Choose this plan", exact: true })
      .last()
      .click();
    await page
      .getByRole("button", { name: "Simulate payment · GHS 950", exact: true })
      .click();
    await page.getByText("✓ PAYMENT SUCCESSFUL · DEMO").waitFor();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download / share receipt", exact: true })
      .click();
    assert.ok((await download).suggestedFilename().endsWith(".txt"));
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    console.log("Route edit, VIP checkout, receipt download passed");
    await tab("Pass");
    await page
      .getByRole("button", { name: "Show demo scan token", exact: true })
      .click();
    const token = await page.getByText(/^SP2\|/).innerText();
    assert.ok(token.startsWith("SP2|r1|school|"));
    await page.screenshot({
      path: "artifacts/boarding-pass.png",
      fullPage: true,
    });
    await tab("Profile");
    await page.getByRole("button", { name: "driver", exact: true }).click();
    await page.getByText("Passenger manifest", { exact: true }).waitFor();
    await page.getByRole("button", { name: "SP • 02", exact: true }).click();
    await page.context().setOffline(true);
    await page
      .getByRole("button", { name: "Scan QR / validate pass", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Scan Ama Osei’s pass", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Validate & board", exact: true })
      .click();
    await page.getByText("Pass validated. Passenger marked boarded.").waitFor();
    console.log("Role switch, school manifest, QR boarding passed");
    await page.screenshot({
      path: "artifacts/driver-manifest.png",
      fullPage: true,
    });
    await tab("Profile");
    await page.getByRole("button", { name: "commuter", exact: true }).click();
    await page.getByText("Boarded", { exact: true }).waitFor();
    await tab("Pass");
    await page.getByText("● ACTIVE BOARDING PASS", { exact: true }).waitFor();
    console.log(
      "Cached pass display and QR boarding work with network disconnected",
    );
    await page.context().setOffline(false);
    await page.reload();
    await page.getByText("Doorstep VIP", { exact: true }).waitFor();
    await page.getByText("Boarded", { exact: true }).waitFor();
    console.log("Driver-to-commuter sync and reload persistence passed");
    await tab("Track");
    await page.getByText("Along the way", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Toggle map zoom", exact: true })
      .click();
    await page.screenshot({ path: "artifacts/tracker.png", fullPage: true });
    await tab("Profile");
    await page.getByRole("button", { name: "admin", exact: true }).click();
    await page.getByText("Subscription register", { exact: true }).waitFor();
    console.log("Tracker and admin overview passed");
    assert.deepEqual(errors, []);
    console.log("No browser runtime errors");
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
