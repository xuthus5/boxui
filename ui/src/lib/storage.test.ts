import { afterEach, describe, expect, it } from "vitest"

import { preferencesStore } from "@/lib/storage"

afterEach(() => localStorage.clear())

const defaults = { language: "zh", theme: "system", minimumLogLevel: "all" }

describe("preferencesStore", () => {
  it("uses Chinese and system theme by default", () => {
    expect(preferencesStore.get()).toEqual(defaults)
  })

  it("persists supported preferences", () => {
    preferencesStore.set({ language: "en", theme: "dark", minimumLogLevel: "warn" })
    expect(preferencesStore.get()).toEqual({ language: "en", theme: "dark", minimumLogLevel: "warn" })
  })

  it("fills missing minimum log level for older preferences", () => {
    localStorage.setItem("boxd.preferences.v1", JSON.stringify({ language: "en", theme: "light" }))
    expect(preferencesStore.get()).toEqual({ language: "en", theme: "light", minimumLogLevel: "all" })
  })

  it("ignores malformed preferences", () => {
    localStorage.setItem("boxd.preferences.v1", "{}")
    expect(preferencesStore.get()).toEqual(defaults)
  })

  it("ignores unsupported preference values", () => {
    localStorage.setItem("boxd.preferences.v1", JSON.stringify({ language: "fr", theme: "blue", minimumLogLevel: "fatal" }))
    expect(preferencesStore.get()).toEqual(defaults)
  })
})
