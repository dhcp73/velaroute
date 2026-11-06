import { defineConfig } from "@playwright/test";
export default defineConfig({ testDir: "./e2e", timeout: 120_000, workers: 1, use: { headless: true, reducedMotion: "reduce", trace: "retain-on-failure" }, reporter: [["list"], ["json", { outputFile: "reports/redesign-e2e.json" }]] });
