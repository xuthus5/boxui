import { fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, it, vi } from "vitest"

import App from "@/App"
import { sessionStore } from "@/lib/session"
import { installMockAPI } from "@/test/mock-api"
import { renderApp } from "@/test/render"

afterEach(() => { vi.unstubAllGlobals(); sessionStore.clear() })

function authenticate() {
  sessionStore.set({ token: "token", expiresAt: "2099-01-01T00:00:00Z" })
  return userEvent.setup()
}

describe("proxy and policy interactions", () => {
  it("adds, edits, and deletes inbound configuration", async () => {
    const user = authenticate(); installMockAPI(); renderApp(<App />, "/proxy/inbounds")
    await screen.findByText("mixed-in")
    await user.click(screen.getByRole("button", { name: "新增入站" }))
    fireEvent.change(screen.getByLabelText("Tag"), { target: { value: "new-in" } })
    await user.click(screen.getByRole("combobox", { name: "类型" }))
    await user.click(await screen.findByRole("option", { name: "mixed" }))
    await user.click(screen.getByRole("combobox", { name: "监听地址" }))
    await user.click(await screen.findByRole("option", { name: "::（IPv6 全接口）" }))
    fireEvent.change(screen.getByLabelText("监听端口"), { target: { value: "1081" } })
    await user.click(screen.getByRole("button", { name: "保存" }))
    await user.click(screen.getByRole("button", { name: "编辑" }))
    await user.click(screen.getByRole("button", { name: "取消" }))
    await user.click(screen.getByRole("button", { name: "删除" }))
    await user.click(screen.getByRole("button", { name: "确认删除" }))
  }, 15000)

  it("installs defaults and saves route, DNS, and outbound configuration", async () => {
    const user = authenticate(); installMockAPI()
    const outbound = renderApp(<App />, "/proxy/outbounds")
    await user.click(await screen.findByRole("button", { name: "安装默认出站" }))
    outbound.unmount()
    const route = renderApp(<App />, "/policy/route")
    await user.click(await screen.findByRole("button", { name: "保存配置" }))
    await user.click(screen.getByRole("button", { name: "安装默认路由" }))
    route.unmount()
    renderApp(<App />, "/policy/dns")
    await user.click(await screen.findByRole("button", { name: "安装默认 DNS" }))
  })
})
