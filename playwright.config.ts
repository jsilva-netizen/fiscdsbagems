import { defineConfig, devices } from '@playwright/test'

// Ciclo offline (US1) envolve GPS, câmera simulada e religamento de rede — timeouts mais
// largos que o padrão do Playwright são necessários para não confundir "lento" com "quebrado".
// Ver research.md D1 e D10 (offline é o caso de maior risco desta fase).
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false, // testes de escrita e2e tocam a base real (FR-019) — evitar corrida entre eles
  forbidOnly: !!process.env.CI,
  retries: 0, // falha aqui é sinal real, não flakiness a mascarar com retentativa
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['geolocation'],
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
