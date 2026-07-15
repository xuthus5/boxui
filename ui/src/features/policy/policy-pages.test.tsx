import { cleanup, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import App from "@/App"
import { i18n } from "@/i18n"
import { sessionStore } from "@/lib/session"
import { preferencesStore } from "@/lib/storage"
import { renderApp } from "@/test/render"

const config = {
  route: {
    final: "proxy",
    rules: [
      { type: "logical", mode: "and", rules: [], action: "reject" },
      { domain_suffix: ["example.com"], action: "route", outbound: "proxy" },
    ],
    rule_set: [{ type: "inline", tag: "geo", rules: [] }],
  },
  dns: {
    final: "legacy",
    fakeip: { enabled: true, inet4_range: "198.18.0.0/15" },
    servers: [
      { tag: "legacy", address: "local", detour: "direct" },
      { type: "https", tag: "remote", server: "dns.example", server_port: 443 },
    ],
    rules: [
      { type: "logical", mode: "or", rules: [], action: "reject" },
      { domain_suffix: ["example.com"], action: "route", server: "remote" },
    ],
  },
}

function stubConfig() {
  sessionStore.set({ token: "token", expiresAt: "2099-01-01T00:00:00Z" })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(config))))
}

async function renderPolicy(path: "/policy/route" | "/policy/dns", heading: string) {
  stubConfig()
  renderApp(<App />, path)
  await screen.findByRole("heading", { name: heading })
}

async function expectPolicyTabs(visual: string, advanced: string) {
  expect(screen.getByRole("tab", { name: visual })).toBeInTheDocument()
  await userEvent.click(screen.getByRole("tab", { name: advanced }))
  expect(screen.getByRole("textbox", { name: /流量策略 JSON|Traffic policy JSON/ })).toBeInTheDocument()
  await userEvent.click(screen.getByRole("tab", { name: visual }))
}

beforeEach(async () => {
  preferencesStore.set({ language: "zh", theme: "system" })
  await i18n.changeLanguage("zh")
})

afterEach(async () => {
  cleanup()
  vi.unstubAllGlobals()
  sessionStore.clear()
  await i18n.changeLanguage("zh")
})

describe("policy bilingual interactions", () => {
  it("resolves complete Chinese route copy across cards, actions, and dialogs", async () => {
    await renderPolicy("/policy/route", "路由")
    await expectPolicyTabs("可视化配置", "高级 JSON")

    for (const title of ["全局路由设置", "路由规则", "路由规则集"]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.getByText("共 2 条规则")).toBeInTheDocument()
    expect(screen.getByText("共 1 个规则集")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "更多规则 2" }))
    const menu = await screen.findByRole("menu")
    for (const action of ["复制", "上移", "下移", "删除"]) {
      expect(within(menu).getByRole("menuitem", { name: action })).toBeInTheDocument()
    }
    await userEvent.keyboard("{Escape}")

    await userEvent.click(screen.getByRole("button", { name: "编辑规则 1" }))
    expect(screen.getByRole("dialog", { name: "编辑规则 1" })).toBeInTheDocument()
    for (const tab of ["基础与网络", "域名与地址", "端口与进程", "规则集与网络环境", "执行动作", "高级 JSON"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument()
    }
    expect(screen.getByText("逻辑子规则可在当前表单中编辑，其他复杂字段可在高级 JSON 中维护。")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "取消" }))

    await userEvent.click(screen.getByRole("button", { name: "新增规则" }))
    expect(screen.getByRole("alert")).toHaveTextContent("缺少必填字段")
    expect(screen.getByRole("alert")).toHaveTextContent("请补全当前规则类型和动作所需的值。")
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "取消" }))

    await userEvent.click(screen.getByRole("button", { name: "编辑规则集 geo" }))
    expect(screen.getByRole("dialog", { name: "编辑规则集" })).toBeInTheDocument()
    expect(screen.getByText("Inline 规则集")).toBeInTheDocument()
    expect(screen.getByText("复杂 inline 规则内容请在高级 JSON 中维护。")).toBeInTheDocument()
  }, 20_000)

  it("resolves complete Chinese DNS copy across cards, actions, validation, and guidance", async () => {
    await renderPolicy("/policy/dns", "DNS")
    await expectPolicyTabs("可视化配置", "高级 JSON")

    for (const title of ["DNS 全局设置", "旧式 FakeIP", "DNS 服务器", "DNS 规则"]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.getByText("共 2 台服务器")).toBeInTheDocument()
    expect(screen.getByText("共 2 条规则")).toBeInTheDocument()
    expect(screen.getByText(/标签 legacy/)).toBeInTheDocument()
    expect(screen.getByText(/前置出站 direct/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "更多 DNS 服务器 legacy" }))
    expect(await screen.findByRole("menuitem", { name: "复制" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "删除" })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")

    await userEvent.click(screen.getByRole("button", { name: "编辑 DNS 服务器 legacy" }))
    for (const tab of ["基础", "拨号与解析", "TLS 与 HTTP", "类型专属", "高级 JSON"]) {
      expect(screen.getByRole("tab", { name: tab })).toBeInTheDocument()
    }
    await userEvent.click(screen.getByRole("button", { name: "取消" }))

    await userEvent.click(screen.getByRole("button", { name: "新增 DNS 服务器" }))
    expect(screen.getByRole("alert")).toHaveTextContent("请填写当前服务器类型所需的 Tag 和地址信息。")
    await userEvent.click(screen.getByRole("button", { name: "取消" }))

    await userEvent.click(screen.getByRole("button", { name: "编辑 DNS 规则 1" }))
    expect(screen.getByText("逻辑子规则请在高级 JSON 中维护。")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "取消" }))

    await userEvent.click(screen.getByRole("button", { name: "删除 DNS 规则 1" }))
    const confirmation = screen.getByRole("alertdialog", { name: "删除 DNS 规则 #1？" })
    expect(confirmation).toHaveTextContent("此操作无法撤销。")
    expect(within(confirmation).getByRole("button", { name: "确认删除" })).toBeInTheDocument()
  }, 20_000)

  it("switches Route and DNS primary UI to English without Chinese or raw policy keys", async () => {
    preferencesStore.set({ language: "en", theme: "system" })
    await i18n.changeLanguage("en")
    await renderPolicy("/policy/route", "Route")
    await expectPolicyTabs("Visual editor", "Advanced JSON")
    for (const label of ["Global route settings", "Route rules", "Route rule sets", "Add route rule", "Add rule set"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    await userEvent.click(screen.getByRole("button", { name: "Add route rule" }))
    expect(screen.getByRole("dialog", { name: "Add route rule" })).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Required fields missing")
    expect(document.body).not.toHaveTextContent(/[一-龥]/)
    expect(document.body).not.toHaveTextContent(/policy\.(route|dns)\./)

    cleanup()
    await renderPolicy("/policy/dns", "DNS")
    await expectPolicyTabs("Visual editor", "Advanced JSON")
    for (const label of ["DNS settings", "Legacy FakeIP", "DNS servers", "DNS rules", "Add DNS server", "Add DNS rule"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    await userEvent.click(screen.getByRole("button", { name: "Add DNS rule" }))
    expect(screen.getByRole("dialog", { name: "Add DNS rule" })).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Required fields missing")
    expect(document.body).not.toHaveTextContent(/[一-龥]/)
    expect(document.body).not.toHaveTextContent(/policy\.(route|dns)\./)
  }, 20_000)
})
