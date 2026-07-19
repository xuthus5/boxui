import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import App from "@/App"
import { sessionStore } from "@/lib/session"
import { renderApp } from "@/test/render"

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
})

function requestPath(input: string | URL | Request) {
  if (typeof input === "string") {
    try { return new URL(input, "http://localhost").pathname } catch { return input.split("?")[0] }
  }
  if (input instanceof URL) return input.pathname
  try { return new URL(input.url, "http://localhost").pathname } catch { return String(input.url).split("?")[0] }
}

function stub(defaultPassword: boolean) {
  sessionStore.set({ token: "token", expiresAt: "2099-01-01T00:00:00Z" })
  vi.stubGlobal("fetch", vi.fn((input: string | URL | Request) => {
    const path = requestPath(input)
    if (path === "/api/settings/password") {
      return Promise.resolve(new Response(JSON.stringify({ defaultPassword })))
    }
    if (path === "/api/settings/jwt-secret") {
      return Promise.resolve(new Response(JSON.stringify({ masked: "ab**cd", present: true, length: 32 })))
    }
    if (path.startsWith("/api/settings/")) {
      return Promise.resolve(new Response(JSON.stringify({
        url: "https://cp.cloudflare.com/", enabled: true, interval: "3m", tolerance: 50,
      })))
    }
    if (path === "/api/config/rule-sets/auto-update") {
      return Promise.resolve(new Response(JSON.stringify({ enabled: false, interval: "24h" })))
    }
    if (path === "/api/service/status") {
      return Promise.resolve(new Response(JSON.stringify({ running: true, uptime: "1m" })))
    }
    if (path === "/api/runtime/memory") {
      return Promise.resolve(new Response(JSON.stringify({
        alloc: 1, total: 1, sys: 1, num_gc: 0, heap_inuse: 1, stack_inuse: 1, num_goroutine: 1,
      })))
    }
    if (path === "/api/runtime/version") {
      return Promise.resolve(new Response(JSON.stringify({ version: "dev", kernel_version: "1.13.14" })))
    }
    if (path === "/api/stats/traffic/history") {
      return Promise.resolve(new Response(JSON.stringify({ points: [] })))
    }
    if (path.startsWith("/api/stats/")) {
      return Promise.resolve(new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: {}\n\n"))
          controller.close()
        },
      })))
    }
    return Promise.resolve(new Response(JSON.stringify({})))
  }))
}

describe("default password gate", () => {
  it("redirects non-settings pages to settings when default password is active", async () => {
    stub(true)
    renderApp(<App />, "/dashboard")
    expect(await screen.findByText("请先轮换默认管理员密码后，才能使用其他面板功能。")).toBeInTheDocument()
    expect(await screen.findByRole("heading", { name: "应用设置" })).toBeInTheDocument()
  })

  it("allows dashboard when default password is not active", async () => {
    stub(false)
    renderApp(<App />, "/dashboard")
    expect(await screen.findByRole("heading", { name: "仪表盘" })).toBeInTheDocument()
  })
})
