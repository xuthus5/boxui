import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import App from "@/App"
import { sessionStore } from "@/lib/session"
import { preferencesStore } from "@/lib/storage"
import { renderApp } from "@/test/render"

function sse(data: unknown) {
  const encoder = new TextEncoder()
  const events = Array.isArray(data) ? data : [data]
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")))
      controller.close()
    },
  }))
}

function installAPI() {
  vi.stubGlobal("fetch", vi.fn((input: string | URL | Request) => {
    const path = typeof input === "string" ? input : input instanceof URL ? input.pathname : new URL(input.url).pathname
    if (path === "/api/stats/logs" || path === "/api/stats/app-logs") {
      return Promise.resolve(sse([
        { level: "info", message: "info entry" },
        { level: "error", message: "error entry" },
      ]))
    }
    if (path === "/api/stats/traffic") {
      return Promise.resolve(sse({ upload_bytes: 0, download_bytes: 0, timestamp: "2026-01-01T00:00:00Z" }))
    }
    if (path === "/api/service/status") return Promise.resolve(new Response(JSON.stringify({ running: true, uptime: "1m" })))
    if (path === "/api/stats/traffic/history") return Promise.resolve(new Response(JSON.stringify({ points: [] })))
    if (path === "/api/runtime/memory") {
      return Promise.resolve(new Response(JSON.stringify({ alloc: 1, total: 1, sys: 1, num_gc: 0, heap_inuse: 1, stack_inuse: 1, num_goroutine: 1 })))
    }
    if (path === "/api/runtime/version") {
      return Promise.resolve(new Response(JSON.stringify({ version: "dev", kernel_version: "1.0" })))
    }
    return Promise.resolve(new Response("{}"))
  }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  sessionStore.clear()
  localStorage.clear()
})

describe("default minimum log level preference", () => {
  it("uses the saved minimum level as the logs page default", async () => {
    preferencesStore.set({ language: "zh", theme: "system", minimumLogLevel: "error" })
    sessionStore.set({ token: "token", expiresAt: "2099-01-01T00:00:00Z" })
    installAPI()
    renderApp(<App />, "/observability/logs")
    const panel = await screen.findByRole("tabpanel")
    expect(within(panel).getByRole("combobox", { name: "最低日志级别" })).toHaveTextContent("Error")
    expect(await within(panel).findByText("error entry")).toBeInTheDocument()
    expect(within(panel).queryByText("info entry")).not.toBeInTheDocument()
  })

  it("filters dashboard recent logs by the saved minimum level", async () => {
    preferencesStore.set({ language: "zh", theme: "system", minimumLogLevel: "error" })
    sessionStore.set({ token: "token", expiresAt: "2099-01-01T00:00:00Z" })
    installAPI()
    renderApp(<App />, "/dashboard")
    expect(await screen.findByText("error entry")).toBeInTheDocument()
    expect(screen.queryByText("info entry")).not.toBeInTheDocument()
  })
})
