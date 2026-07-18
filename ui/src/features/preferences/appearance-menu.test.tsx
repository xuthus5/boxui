import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import App from "@/App"
import { sessionStore } from "@/lib/session"
import { installMockAPI } from "@/test/mock-api"
import { renderApp } from "@/test/render"

afterEach(() => {
  vi.unstubAllGlobals()
  sessionStore.clear()
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

describe("AppearanceMenu", () => {
  it("switches theme and language from the page header", async () => {
    sessionStore.set({ token: "token", expiresAt: "2099-01-01T00:00:00Z" })
    installMockAPI()
    const user = userEvent.setup()
    renderApp(<App />, "/dashboard")
    expect(await screen.findByRole("heading", { name: "仪表盘" })).toBeInTheDocument()

    const header = screen.getByRole("banner")
    await user.click(within(header).getByRole("button", { name: "外观" }))
    await user.click(await screen.findByRole("menuitemradio", { name: "深色" }))
    expect(document.documentElement).toHaveClass("dark")
    expect(localStorage.getItem("boxui.preferences.v1")).toContain("dark")

    await user.click(within(header).getByRole("button", { name: "外观" }))
    await user.click(await screen.findByRole("menuitemradio", { name: "English" }))
    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
    expect(within(header).getByRole("button", { name: "Appearance" })).toBeInTheDocument()
    expect(localStorage.getItem("boxui.preferences.v1")).toContain('"language":"en"')
  })
})
