import type { TrafficHistoryPoint } from "@/lib/api/types"

export interface TrafficRatePoint {
  timestamp: string
  upload_rate: number
  download_rate: number
}

export function calculateTrafficRates(points: TrafficHistoryPoint[]): TrafficRatePoint[] {
  return points.map((point, index) => {
    const previous = points[index - 1]
    if (!previous) return { timestamp: point.timestamp, upload_rate: 0, download_rate: 0 }
    const elapsed = (new Date(point.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000
    if (!Number.isFinite(elapsed) || elapsed <= 0) return { timestamp: point.timestamp, upload_rate: 0, download_rate: 0 }
    return {
      timestamp: point.timestamp,
      upload_rate: Math.max(0, point.upload_bytes - previous.upload_bytes) / elapsed,
      download_rate: Math.max(0, point.download_bytes - previous.download_bytes) / elapsed,
    }
  })
}
