import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { I18nextProvider } from "react-i18next"

import { DNSServerCard } from "@/features/policy/dns-server-card"
import { i18n } from "@/i18n"

describe("DNSServerCard", () => {
  it("renders unnamed server and confirms delete", async () => {
    const onEdit = vi.fn()
    const onCopy = vi.fn()
    const onDelete = vi.fn()
    render(
      <I18nextProvider i18n={i18n}>
        <DNSServerCard item={{ type: "udp", server: "1.1.1.1" }} onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} />
      </I18nextProvider>,
    )
    expect(screen.getByText("未命名")).toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole("button", { name: /编辑 DNS 服务器/ }))
    expect(onEdit).toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: /复制 DNS 服务器/ }))
    expect(onCopy).toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: /删除 DNS 服务器/ }))
    await user.click(screen.getByRole("button", { name: "确认删除" }))
    expect(onDelete).toHaveBeenCalled()
  })
})
