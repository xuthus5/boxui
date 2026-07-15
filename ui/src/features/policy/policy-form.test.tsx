import { useState } from "react"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { PolicyFormFields } from "@/features/policy/policy-form-fields"
import { i18n } from "@/i18n"
import {
  cloneJsonObject,
  getPolicyPath,
  isJsonObject,
  moveItem,
  setPolicyPath,
  type JsonObject,
  type PolicyFieldSpec,
} from "@/features/policy/policy-form-model"
import { renderApp } from "@/test/render"

describe("policy form JSON helpers", () => {
  it("recognizes JSON objects", () => {
    expect(isJsonObject({ action: "route" })).toBe(true)
    expect(isJsonObject([])).toBe(false)
    expect(isJsonObject(null)).toBe(false)
    expect(isJsonObject(undefined)).toBe(false)
  })

  it("reads nested object paths", () => {
    expect(getPolicyPath({ action: { server: "dns-remote" } }, "action.server")).toBe("dns-remote")
    expect(getPolicyPath({ action: [] }, "action.server")).toBeUndefined()
    expect(getPolicyPath({}, "action.server")).toBeUndefined()
  })

  it("writes nested paths without mutating the source", () => {
    const source = { action: { outbound: "proxy" } }
    const next = setPolicyPath(source, "action.server", "dns-remote")

    expect(next).toEqual({ action: { outbound: "proxy", server: "dns-remote" } })
    expect(source).toEqual({ action: { outbound: "proxy" } })
    expect(next).not.toBe(source)
    expect(next.action).not.toBe(source.action)
    expect(setPolicyPath({}, "action.server", "dns-remote")).toEqual({ action: { server: "dns-remote" } })
    expect(setPolicyPath({ action: [] }, "action.server", "dns-remote")).toEqual({ action: { server: "dns-remote" } })
  })

  it("prunes empty parents when nested values are removed", () => {
    expect(setPolicyPath({ action: { server: "dns-remote" } }, "action.server", undefined)).toEqual({})
    expect(setPolicyPath({ action: { server: "dns-remote", strategy: "prefer_ipv4" } }, "action.server", undefined)).toEqual({ action: { strategy: "prefer_ipv4" } })
    expect(setPolicyPath({ tag: "rule" }, "tag", undefined)).toEqual({})
  })

  it("moves items immutably and leaves invalid moves unchanged", () => {
    const source = ["a", "b", "c"] as const

    expect(moveItem(source, 1, -1)).toEqual(["b", "a", "c"])
    expect(moveItem(source, 1, 1)).toEqual(["a", "c", "b"])
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"])
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"])
    expect(moveItem(["a", "b"], -1, 1)).toEqual(["a", "b"])
    expect(source).toEqual(["a", "b", "c"])
  })

  it("deep clones JSON objects", () => {
    const source = { rules: [{ action: "route" }], options: { enabled: true } }
    const clone = cloneJsonObject(source)

    expect(clone).toEqual(source)
    expect(clone).not.toBe(source)
    expect(clone.rules).not.toBe(source.rules)
    expect(clone.options).not.toBe(source.options)
  })
})

const namespace = "policy.dns"
const label = (name: string) => i18n.t(`${namespace}.${name}`)

function renderFields(fields: readonly PolicyFieldSpec[], object: JsonObject = {}) {
  const onChange = vi.fn()
  renderApp(<PolicyFormFields fields={fields} object={object} namespace={namespace} onChange={onChange} />)
  return onChange
}

function SelectHarness() {
  const [object, setObject] = useState<JsonObject>({})
  const [valid, setValid] = useState(true)
  const [, setRender] = useState(0)
  return <>
    <button onClick={() => setRender((value) => value + 1)}>Rerender</button>
    <output>{String(object.action)}</output>
    <output aria-label="select validity">{valid ? "valid" : "invalid"}</output>
    <PolicyFormFields
      fields={[{ path: "action", label: "action", kind: "select", options: ["__unset__", "reject"], required: true }]}
      object={object}
      namespace={namespace}
      onChange={setObject}
      onFieldValidityChange={(_path, next) => setValid(next)}
    />
  </>
}

function StructuredHarness() {
  const [object, setObject] = useState<JsonObject>({ headers: { X: "old" }, tag: "old" })
  const [revision, setRevision] = useState(0)
  const [valid, setValid] = useState(true)
  const [, setRender] = useState(0)
  return <>
    <button onClick={() => setRender((value) => value + 1)}>Parent rerender</button>
    <button onClick={() => { setObject((value) => ({ ...value, tag: "changed" })); setRevision((value) => value + 1) }}>Advanced JSON update</button>
    <button onClick={() => setObject((value) => ({ ...value, headers: { X: "new" } }))}>External field update</button>
    <output>{valid ? "valid" : "invalid"}</output>
    <PolicyFormFields
      fields={[{ path: "headers", label: "headers", kind: "json-object" }]}
      object={object}
      namespace={namespace}
      revision={revision}
      onChange={setObject}
      onFieldValidityChange={(_path, next) => setValid(next)}
    />
  </>
}

describe("policy form field conversions", () => {
  it("updates text, textarea, numbers, booleans, and required controls", async () => {
    const user = userEvent.setup()
    const textChange = renderFields([{ path: "tag", label: "tag", required: true }])
    const text = screen.getByLabelText(label("tag"))
    expect(text).toBeRequired()
    fireEvent.change(text, { target: { value: "rule-1" } })
    expect(textChange).toHaveBeenLastCalledWith({ tag: "rule-1" })
    cleanup()

    const areaChange = renderFields([{ path: "description", label: "description", kind: "textarea" }])
    fireEvent.change(screen.getByLabelText(label("description")), { target: { value: "line 1\nline 2" } })
    expect(areaChange).toHaveBeenLastCalledWith({ description: "line 1\nline 2" })
    cleanup()

    const numberChange = renderFields([{ path: "port", label: "port", kind: "number" }], { port: 53 })
    fireEvent.change(screen.getByLabelText(label("port")), { target: { value: "443" } })
    expect(numberChange).toHaveBeenLastCalledWith({ port: 443 })
    cleanup()

    const emptyNumberChange = renderFields([{ path: "port", label: "port", kind: "number" }], { port: 53 })
    fireEvent.change(screen.getByLabelText(label("port")), { target: { value: "" } })
    expect(emptyNumberChange).toHaveBeenLastCalledWith({})
    cleanup()

    const booleanChange = renderFields([{ path: "invert", label: "invert", kind: "boolean" }], { invert: true })
    await user.click(screen.getByRole("switch", { name: label("invert") }))
    expect(booleanChange).toHaveBeenLastCalledWith({ invert: false })
  })

  it("parses string and numeric lists and rejects non-finite values", () => {
    const listChange = renderFields([{ path: "domain", label: "domain", kind: "list" }])
    fireEvent.change(screen.getByLabelText(label("domain")), { target: { value: "example.com, example.org\nexample.net" } })
    expect(listChange).toHaveBeenLastCalledWith({ domain: ["example.com", "example.org", "example.net"] })
    cleanup()

    const emptyListChange = renderFields([{ path: "domain", label: "domain", kind: "list" }], { domain: ["example.com"] })
    fireEvent.change(screen.getByLabelText(label("domain")), { target: { value: "" } })
    expect(emptyListChange).toHaveBeenLastCalledWith({})
    cleanup()

    const numberListChange = renderFields([{ path: "port", label: "port", kind: "number-list" }])
    fireEvent.change(screen.getByLabelText(label("port")), { target: { value: "53, 853" } })
    expect(numberListChange).toHaveBeenLastCalledWith({ port: [53, 853] })
    fireEvent.change(screen.getByLabelText(label("port")), { target: { value: "1e309" } })
    expect(numberListChange).toHaveBeenCalledTimes(1)
    cleanup()

    const emptyNumberListChange = renderFields([{ path: "port", label: "port", kind: "number-list" }], { port: [53] })
    fireEvent.change(screen.getByLabelText(label("port")), { target: { value: "" } })
    expect(emptyNumberListChange).toHaveBeenLastCalledWith({})
  })

  it("uses null for required Base UI Select state without colliding with option values", async () => {
    const user = userEvent.setup()
    renderApp(<SelectHarness />)

    await user.click(screen.getByRole("button", { name: "Rerender" }))
    const select = screen.getByRole("combobox", { name: label("action") })
    expect(select).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("select validity")).toHaveTextContent("invalid")

    await user.click(select)
    await user.click(await screen.findByRole("option", { name: "__unset__" }))
    expect(screen.getByText("__unset__", { selector: "output" })).toBeInTheDocument()
    expect(select).toHaveAttribute("aria-invalid", "false")
    await user.click(select)
    await user.click(await screen.findByRole("option", { name: label("notSet") }))
    expect(screen.getByText("undefined", { selector: "output" })).toBeInTheDocument()
    expect(select).toHaveAttribute("aria-invalid", "true")
  })

  it("uses custom transforms and falls back only when they return undefined", () => {
    const onChange = vi.fn()
    const onValidity = vi.fn()
    const transform = vi.fn((_object, _field, raw: string) => raw === "ignore" ? null : raw === "fallback" ? undefined : { transformed: raw })
    renderApp(<PolicyFormFields fields={[{ path: "tag", label: "tag" }]} object={{}} namespace={namespace}
      onChange={onChange} onFieldValidityChange={onValidity} transformField={transform} />)
    const input = screen.getByLabelText(label("tag"))

    fireEvent.change(input, { target: { value: "custom" } })
    expect(onChange).toHaveBeenLastCalledWith({ transformed: "custom" })
    fireEvent.change(input, { target: { value: "ignore" } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(onValidity).toHaveBeenLastCalledWith("tag", false)
    fireEvent.change(input, { target: { value: "fallback" } })
    expect(onChange).toHaveBeenLastCalledWith({ tag: "fallback" })
    expect(input).toHaveAttribute("aria-invalid", "false")
    expect(onValidity).toHaveBeenLastCalledWith("tag", true)
  })

  it("validates JSON objects and arrays and clears invalid state", () => {
    const onChange = vi.fn()
    const onValidity = vi.fn()
    const view = renderApp(<PolicyFormFields
      fields={[
        { path: "headers", label: "headers", kind: "json-object" },
        { path: "rules", label: "rules", kind: "json-array" },
      ]}
      object={{}}
      namespace={namespace}
      onChange={onChange}
      onFieldValidityChange={onValidity}
    />)

    fireEvent.change(screen.getByLabelText(label("headers")), { target: { value: "{}" } })
    expect(onChange).toHaveBeenLastCalledWith({ headers: {} })
    fireEvent.change(screen.getByLabelText(label("headers")), { target: { value: "[]" } })
    expect(screen.getByLabelText(label("headers"))).toHaveAttribute("aria-invalid", "true")
    expect(onValidity).toHaveBeenLastCalledWith("headers", false)
    fireEvent.change(screen.getByLabelText(label("headers")), { target: { value: "" } })
    expect(onChange).toHaveBeenLastCalledWith({})
    expect(onValidity).toHaveBeenLastCalledWith("headers", true)

    fireEvent.change(screen.getByLabelText(label("rules")), { target: { value: '[1,{"action":"route"}]' } })
    expect(onChange).toHaveBeenLastCalledWith({ rules: [1, { action: "route" }] })
    fireEvent.change(screen.getByLabelText(label("rules")), { target: { value: "{}" } })
    expect(onValidity).toHaveBeenLastCalledWith("rules", false)
    view.unmount()
    expect(onValidity).toHaveBeenLastCalledWith("rules", true)
  })

  it("synchronizes structured drafts after external and Advanced JSON updates", async () => {
    const user = userEvent.setup()
    renderApp(<StructuredHarness />)
    const input = screen.getByLabelText(label("headers"))
    expect(input).toHaveValue(JSON.stringify({ X: "old" }, null, 2))

    fireEvent.change(input, { target: { value: "invalid" } })
    await user.click(screen.getByRole("button", { name: "Parent rerender" }))
    expect(screen.getByText("invalid", { selector: "output" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Advanced JSON update" }))
    expect(input).toHaveValue(JSON.stringify({ X: "old" }, null, 2))
    expect(screen.getByText("valid", { selector: "output" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "External field update" }))
    expect(input).toHaveValue(JSON.stringify({ X: "new" }, null, 2))
  })
})
