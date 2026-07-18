export const levelRanks = { debug: 0, info: 1, warn: 2, error: 3 } as const

export type LogThreshold = "all" | keyof typeof levelRanks

export const logThresholds = ["all", "debug", "info", "warn", "error"] as const

export function isLogThreshold(value: unknown): value is LogThreshold {
  return typeof value === "string" && (logThresholds as readonly string[]).includes(value)
}

export function meetsLogThreshold(level: string, threshold: LogThreshold) {
  if (threshold === "all") return true
  const rank = levelRanks[level.toLowerCase() as keyof typeof levelRanks]
  return rank !== undefined && rank >= levelRanks[threshold]
}
