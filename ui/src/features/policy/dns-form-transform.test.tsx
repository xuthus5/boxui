import { cleanup, fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PolicyFormFields } from "@/features/policy/policy-form-fields"
import {
  dnsActionFields,
  dnsRuleMatchFields,
  transformDNSField,
} from "@/features/policy/dns-form-model"
import type { JsonObject, PolicyFieldSpec } from "@/features/policy/policy-form-model"
import { renderApp } from "@/test/render"

const queryTypeField = dnsRuleMatchFields.find((field) => field.path === "query_type")!
const rcodeField = dnsActionFields.predefined.find((field) => field.path === "rcode")!
const routingMarkField = { path: "routing_mark", label: "routingMark" } satisfies PolicyFieldSpec

function transform(object: JsonObject, field: PolicyFieldSpec, raw: string) {
  return transformDNSField(object, field, raw)
}

describe("DNS string and number transforms", () => {
  it("preserves query type scalar or array shapes and numeric tokens", () => {
    expect(transform({ query_type: 28 }, queryTypeField, "28")).toEqual({ query_type: 28 })
    expect(transform({ query_type: [28, "AAAA"] }, queryTypeField, "28, AAAA"))
      .toEqual({ query_type: [28, "AAAA"] })
    expect(transform({}, queryTypeField, "A\n28")).toEqual({ query_type: ["A", 28] })
    expect(transform({ query_type: "A" }, queryTypeField, "")).toEqual({})
  })

  it("rejects invalid query type tokens and uint16 overflow", () => {
    expect(transform({}, queryTypeField, "65536")).toBeNull()
    expect(transform({}, queryTypeField, "1.5")).toBeNull()
    expect(transform({}, queryTypeField, "Infinity")).toBeNull()
    expect(transform({}, queryTypeField, "A!")).toBeNull()
  })

  it("writes RCODE names or bounded integer values", () => {
    expect(transform({}, rcodeField, "REFUSED")).toEqual({ rcode: "REFUSED" })
    expect(transform({ rcode: "REFUSED" }, rcodeField, "5")).toEqual({ rcode: 5 })
    expect(transform({ rcode: 5 }, rcodeField, "")).toEqual({})
    expect(transform({}, rcodeField, "4096")).toBeNull()
    expect(transform({}, rcodeField, "1.5")).toBeNull()
  })

  it("writes decimal routing marks as uint32 numbers and preserves valid base strings", () => {
    expect(transform({}, routingMarkField, "123")).toEqual({ routing_mark: 123 })
    expect(transform({}, routingMarkField, "0x7b")).toEqual({ routing_mark: "0x7b" })
    expect(transform({}, routingMarkField, "0b1111011")).toEqual({ routing_mark: "0b1111011" })
    expect(transform({ routing_mark: 1 }, routingMarkField, "")).toEqual({})
    expect(transform({}, routingMarkField, "4294967296")).toBeNull()
    expect(transform({}, routingMarkField, "-1")).toBeNull()
    expect(transform({}, routingMarkField, "NaN")).toBeNull()
  })

  it("returns undefined for fields using the default transform", () => {
    expect(transform({}, { path: "server", label: "server" }, "dns.example")).toBeUndefined()
  })
})

describe("PolicyFormFields DNS transform integration", () => {
  it("does not stringify numeric query types, RCODEs, or routing marks", () => {
    const onChange = vi.fn()
    const object = { query_type: 28, rcode: 5, routing_mark: "0x10", custom: "keep" }
    renderApp(<PolicyFormFields
      fields={[queryTypeField, rcodeField, routingMarkField]}
      object={object}
      namespace="policy.dns"
      onChange={onChange}
      transformField={transformDNSField}
    />)

    fireEvent.change(screen.getByLabelText("policy.dns.queryType"), { target: { value: "28, AAAA" } })
    expect(onChange).toHaveBeenLastCalledWith({ ...object, query_type: [28, "AAAA"] })
    fireEvent.change(screen.getByLabelText("policy.dns.rcode"), { target: { value: "3" } })
    expect(onChange).toHaveBeenLastCalledWith({ ...object, rcode: 3 })
    fireEvent.change(screen.getByLabelText("policy.dns.routingMark"), { target: { value: "0x20" } })
    expect(onChange).toHaveBeenLastCalledWith({ ...object, routing_mark: "0x20" })
    cleanup()
  })
})
