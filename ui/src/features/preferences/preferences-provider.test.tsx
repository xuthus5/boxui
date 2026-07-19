import { screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import App from "@/App"
import { renderApp } from "@/test/render"

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); document.documentElement.classList.remove("dark") })

describe("PreferencesProvider", () => {
  it("uses the dark system preference", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }))
    renderApp(<App />, "/login")
    expect(screen.getByRole("heading", { name: "boxd" })).toBeInTheDocument()
    expect(document.documentElement).toHaveClass("dark")
  })
})

describe("PreferencesProvider language failures", () => {
  it("logs when language switching fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const { i18n } = await import("@/i18n")
    const change = vi.spyOn(i18n, "changeLanguage").mockRejectedValueOnce(new Error("lang failed"))
    const { PreferencesProvider } = await import("@/features/preferences/preferences-provider")
    const { render } = await import("@testing-library/react")
    render(<PreferencesProvider><div>child</div></PreferencesProvider>)
    await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled())
    change.mockRestore()
    errorSpy.mockRestore()
  })
})
