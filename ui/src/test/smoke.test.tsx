import { screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import App from "@/App"
import { PagePlaceholder } from "@/app/page-placeholder"
import { renderApp } from "@/test/render"

describe("App", () => {
  it("renders the boxd login entry", () => {
    renderApp(<App />)
    expect(screen.getByRole("heading", { name: /boxd/i })).toBeInTheDocument()
  })

  it("renders translated placeholders", () => {
    renderApp(<PagePlaceholder titleKey="pages.dashboard" />)
    expect(screen.getByRole("heading", { name: "仪表盘" })).toBeInTheDocument()
  })
})
