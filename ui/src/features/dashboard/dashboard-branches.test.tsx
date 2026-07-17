import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ServiceCard } from "@/features/dashboard/service-card"
import { TrafficChart } from "@/features/dashboard/traffic-chart"
import { calculateTrafficRates } from "@/features/dashboard/traffic-rate"
import { RecentLogs } from "@/features/dashboard/recent-logs"
import { renderApp } from "@/test/render"

describe("dashboard component states", () => {
  it("shows a stopped service and pending action", async () => {
    const onAction = vi.fn()
    const user = userEvent.setup()
    renderApp(<ServiceCard status={{ running: false }} pending="restart" onAction={onAction} />)
    expect(screen.getByText("已停止")).toBeInTheDocument()
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /重启/ })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "启动" }))
    expect(onAction).not.toHaveBeenCalled()
  })

  it("renders an empty traffic chart", () => {
    renderApp(<TrafficChart points={[]} />)
    expect(screen.getByText(/上传 0 B/)).toBeInTheDocument()
  })

  it("calculates traffic rates from actual sample intervals and handles resets", () => {
    expect(calculateTrafficRates([
      { timestamp: "2026-01-01T00:00:00Z", upload_bytes: 100, download_bytes: 200 },
      { timestamp: "2026-01-01T00:00:02Z", upload_bytes: 500, download_bytes: 1000 },
      { timestamp: "2026-01-01T00:00:03Z", upload_bytes: 10, download_bytes: 20 },
      { timestamp: "invalid", upload_bytes: 20, download_bytes: 30 },
    ])).toEqual([
      { timestamp: "2026-01-01T00:00:00Z", upload_rate: 0, download_rate: 0 },
      { timestamp: "2026-01-01T00:00:02Z", upload_rate: 200, download_rate: 400 },
      { timestamp: "2026-01-01T00:00:03Z", upload_rate: 0, download_rate: 0 },
      { timestamp: "invalid", upload_rate: 0, download_rate: 0 },
    ])
  })

  it("switches between real-time and cumulative traffic", async () => {
    const user = userEvent.setup()
    renderApp(<TrafficChart points={[
      { timestamp: "2026-01-01T00:00:00Z", upload_bytes: 0, download_bytes: 0 },
      { timestamp: "2026-01-01T00:00:01Z", upload_bytes: 2048, download_bytes: 4096 },
    ]} />)
    expect(screen.getByText(/上传 2.00 KB\/s/)).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: "累计流量" }))
    expect(screen.getByText(/上传 2.00 KB · 下载 4.00 KB/)).toBeInTheDocument()
  })

  it("renders empty and populated recent logs", () => {
    const view = renderApp(<RecentLogs items={[]} />)
    expect(screen.getByText("暂无日志")).toBeInTheDocument()
    view.unmount()
    renderApp(<RecentLogs items={[{ level: "error", message: "ready", timestamp: "2026-01-01T00:00:00Z" }]} />)
    expect(screen.getByText("ready")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "时间" })).toBeInTheDocument()
    expect(document.querySelector("time")).toHaveAttribute("datetime", "2026-01-01T00:00:00Z")
  })
})
