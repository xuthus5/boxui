import { isLogThreshold, type LogThreshold } from "@/features/observability/log-level"

const PREFERENCES_KEY = "boxui.preferences.v1"

export type Theme = "light" | "dark" | "system"
export type Language = "zh" | "en"
export type { LogThreshold }
export interface Preferences {
  theme: Theme
  language: Language
  minimumLogLevel: LogThreshold
}

const defaults: Preferences = { theme: "system", language: "zh", minimumLogLevel: "all" }

function normalizePreferences(value: unknown): Preferences | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<Preferences>
  if (!["light", "dark", "system"].includes(item.theme ?? "")) return null
  if (!["zh", "en"].includes(item.language ?? "")) return null
  return {
    theme: item.theme as Theme,
    language: item.language as Language,
    minimumLogLevel: isLogThreshold(item.minimumLogLevel) ? item.minimumLogLevel : defaults.minimumLogLevel,
  }
}

export const preferencesStore = {
  get(): Preferences {
    try {
      const raw = localStorage.getItem(PREFERENCES_KEY)
      if (!raw) return defaults
      const value: unknown = JSON.parse(raw)
      return normalizePreferences(value) ?? defaults
    } catch {
      return defaults
    }
  },
  set(preferences: Preferences) {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    } catch {
      return
    }
  },
}
