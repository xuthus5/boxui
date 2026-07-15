import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import App from "@/App"
import { sessionStore } from "@/lib/session"
import { renderApp } from "@/test/render"

afterEach(() => { vi.unstubAllGlobals(); sessionStore.clear() })

describe("policy pages", () => {
  it("shows route configuration and the default installer", async () => {
    sessionStore.set({ token: "token", expiresAt: "2099-01-01T00:00:00Z" })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      route: { final: "proxy", rules: [] },
    }))))

    renderApp(<App />, "/policy/route")

    expect(await screen.findByRole("heading", { name: "路由" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "安装默认路由" })).toBeInTheDocument()
  })

  it("shows the DNS visual editor instead of a blank fallback", async () => {
    sessionStore.set({ token: "token", expiresAt: "2099-01-01T00:00:00Z" })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ dns: {} }))))

    renderApp(<App />, "/policy/dns")

    expect(await screen.findByRole("heading", { name: "DNS" })).toBeInTheDocument()
    expect(screen.getByText("DNS 全局设置")).toBeInTheDocument()
    expect(screen.getByText("暂无 DNS 服务器")).toBeInTheDocument()
  })
})
