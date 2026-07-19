import { afterEach, describe, expect, it, vi } from "vitest"

import { preferencesStore } from "@/lib/storage"
import { sessionStore } from "@/lib/session"

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe("storage and session failure branches", () => {
  it("returns defaults when preferences JSON parse throws", () => {
    localStorage.setItem("boxd.preferences.v1", "{bad")
    // force JSON.parse throw path is covered by invalid JSON above
    expect(preferencesStore.get()).toEqual({ theme: "system", language: "zh", minimumLogLevel: "all" })
  })

  it("swallows preferences setItem failures", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota")
    })
    expect(() => preferencesStore.set({ theme: "dark", language: "en", minimumLogLevel: "info" })).not.toThrow()
    spy.mockRestore()
  })

  it("swallows session set/remove failures", () => {
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota")
    })
    expect(() => sessionStore.set({ token: "t", expiresAt: "2099-01-01T00:00:00Z" })).not.toThrow()
    setSpy.mockRestore()

    sessionStorage.setItem("boxd.session.v1", JSON.stringify({ token: "t", expiresAt: "2099-01-01T00:00:00Z" }))
    const removeSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(() => sessionStore.clear()).not.toThrow()
    removeSpy.mockRestore()
  })

  it("returns null when session getItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(sessionStore.get()).toBeNull()
    spy.mockRestore()
  })
})
