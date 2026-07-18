import { useState } from "react"
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { InboundFormFields } from "@/features/proxy/inbound-form-fields"
import {
  applyInboundFieldChange, changeInboundType, changeTransportType, getPath, protocolFields, setPath, tlsFields, transportTypeFields, type FieldSpec, type JsonObject,
} from "@/features/proxy/inbound-form-model"
import { isFieldVisible, pruneInvisibleFields } from "@/features/proxy/proxy-form-model"
import { ProxyFormFields } from "@/features/proxy/proxy-form-fields"
import { renderApp } from "@/test/render"

afterEach(() => vi.unstubAllGlobals())

describe("inbound form model", () => {
  it("reads, writes, and prunes nested values", () => {
    expect(getPath({ tls: { enabled: true } }, "tls.enabled")).toBe(true)
    expect(getPath({ tls: [] }, "tls.enabled")).toBeUndefined()
    expect(setPath({}, "tag", "in")).toEqual({ tag: "in" })
    expect(setPath({ tag: "in" }, "tag", undefined)).toEqual({})
    expect(setPath({}, "tls.reality.enabled", true)).toEqual({ tls: { reality: { enabled: true } } })
    expect(setPath({ tls: "invalid" }, "tls.enabled", true)).toEqual({ tls: { enabled: true } })
    expect(setPath({ tls: { enabled: true, server_name: "host" } }, "tls.enabled", undefined)).toEqual({ tls: { server_name: "host" } })
    expect(setPath({ tls: { enabled: true } }, "tls.enabled", undefined)).toEqual({})
  })

  it("cleans managed fields and handles unknown metadata", () => {
    expect(changeInboundType({ type: "mixed", listen: "::", tls: {}, custom: "keep" }, "tun")).toEqual({ type: "tun", custom: "keep" })
    expect(protocolFields("unknown")).toEqual([])
    expect(transportTypeFields("unknown")).toHaveLength(1)
  })

  it("preserves shared and unknown fields across type changes", () => {
    const object = { type: "vless", listen: "::", listen_port: 443, users: [{ uuid: "old" }], tls: { enabled: true, custom: "keep" }, transport: { type: "ws", path: "/ws", custom: "keep" }, multiplex: { enabled: true, custom: "keep" }, custom: "keep" }
    expect(changeInboundType(object, "trojan")).toEqual({
      type: "trojan", listen: "::", listen_port: 443, tls: { enabled: true, custom: "keep" },
      transport: { type: "ws", path: "/ws", custom: "keep" }, multiplex: { enabled: true, custom: "keep" }, custom: "keep",
    })
    expect(changeInboundType(object, "vless")).toBe(object)
    expect(changeInboundType({ type: "vless", tls: {}, transport: {}, multiplex: {} }, "direct")).toEqual({ type: "direct" })
    expect(changeInboundType({ type: "tun", interface_name: "tun0", udp_timeout: "5m" }, "mixed")).toEqual({ type: "mixed", udp_timeout: "5m" })
  })

  it("cleans incompatible transport fields and keeps shared headers", () => {
    const object = { transport: { type: "http", host: ["a"], path: "/old", method: "GET", headers: { X: "1" }, idle_timeout: "1m", custom: "keep" } }
    expect(changeTransportType(object, "httpupgrade")).toEqual({ transport: { type: "httpupgrade", path: "/old", headers: { X: "1" }, custom: "keep" } })
    expect(changeTransportType({ transport: { type: "ws", path: "/ws", custom: "keep" } }, "")).toEqual({ transport: { custom: "keep" } })
    expect(changeTransportType({}, "quic")).toEqual({ transport: { type: "quic" } })
  })
})

function renderFields(fields: FieldSpec[], object: JsonObject, type = "mixed", revision = 0) {
  const onChange = vi.fn()
  renderApp(<InboundFormFields fields={fields} object={object} type={type} revision={revision} onChange={onChange} />)
  return onChange
}

function JSONFieldHarness() {
  const [object, setObject] = useState<JsonObject>({ transport: { headers: { X: "old" } } })
  return <>
    <button onClick={() => setObject({ transport: { headers: { X: "new" } } })}>External update</button>
    <InboundFormFields fields={[{ path: "transport.headers", label: "transportHeaders", kind: "json-object" }]} object={object} type="vless" onChange={setObject} />
  </>
}

function JSONFieldRevisionHarness() {
  const [object, setObject] = useState<JsonObject>({ transport: { headers: { X: "old" } } })
  const [revision, setRevision] = useState(0)
  const [valid, setValid] = useState(true)
  return <>
    <button onClick={() => { setObject((current) => ({ ...current, tag: "changed" })); setRevision((current) => current + 1) }}>JSON update</button>
    <span>{valid ? "valid" : "invalid"}</span>
    <ProxyFormFields fields={[{ path: "transport.headers", label: "transportHeaders", kind: "json-object" }]} object={object} namespace="proxy.inbound" onChange={setObject} onFieldValidityChange={(_path, next) => setValid(next)} revision={revision} />
  </>
}
function ListenRevisionHarness() {
  const [object, setObject] = useState<JsonObject>({ listen: "0.0.0.0" })
  const [revision, setRevision] = useState(0)
  return <>
    <button onClick={() => { setObject({ listen: "::" }); setRevision((current) => current + 1) }}>Listen update</button>
    <ProxyFormFields fields={[{ path: "listen", label: "listenAddress", kind: "listen-address" }]} object={object} namespace="proxy.inbound" onChange={setObject} revision={revision} />
  </>
}


describe("inbound form field conversions", () => {
  it("updates lists, numeric lists, numbers, text, and booleans", async () => {
    const user = userEvent.setup()
    const listChange = renderFields([{ path: "address", label: "tunAddress", kind: "list" }], { address: ["10.0.0.1/30"] }, "tun")
    fireEvent.change(screen.getByLabelText("接口地址"), { target: { value: "10.0.0.1/30, fd00::1/126" } })
    expect(listChange).toHaveBeenLastCalledWith({ address: ["10.0.0.1/30", "fd00::1/126"] })
    fireEvent.change(screen.getByLabelText("接口地址"), { target: { value: "" } })
    expect(listChange).toHaveBeenLastCalledWith({})
    cleanup()

    const numberListChange = renderFields([{ path: "include_uid", label: "includeUID", kind: "number-list" }], {})
    fireEvent.change(screen.getByLabelText("包含 UID"), { target: { value: "1000,1001" } })
    expect(numberListChange).toHaveBeenLastCalledWith({ include_uid: [1000, 1001] })
    fireEvent.change(screen.getByLabelText("包含 UID"), { target: { value: "invalid" } })
    expect(numberListChange).toHaveBeenCalledTimes(1)
    cleanup()

    const emptyNumberListChange = renderFields([{ path: "include_uid", label: "includeUID", kind: "number-list" }], { include_uid: [1000] })
    fireEvent.change(screen.getByLabelText("包含 UID"), { target: { value: "" } })
    expect(emptyNumberListChange).toHaveBeenLastCalledWith({})
    cleanup()

    const numberChange = renderFields([{ path: "mtu", label: "mtu", kind: "number" }], { mtu: 9000 })
    fireEvent.change(screen.getByLabelText("MTU"), { target: { value: "" } })
    expect(numberChange).toHaveBeenLastCalledWith({})
    cleanup()

    const listenChange = renderFields([{ path: "listen", label: "listenAddress", kind: "listen-address" }], {})
    await user.click(screen.getByRole("combobox", { name: "监听地址" }))
    await user.click(await screen.findByRole("option", { name: "0.0.0.0（IPv4 全接口）" }))
    expect(listenChange).toHaveBeenLastCalledWith({ listen: "0.0.0.0" })
    await user.click(screen.getByRole("combobox", { name: "监听地址" }))
    await user.click(await screen.findByRole("option", { name: "::（IPv6 全接口）" }))
    expect(listenChange).toHaveBeenLastCalledWith({ listen: "::" })
    await user.click(screen.getByRole("combobox", { name: "监听地址" }))
    await user.click(await screen.findByRole("option", { name: "手动输入" }))
    fireEvent.change(screen.getByLabelText("自定义监听地址"), { target: { value: "127.0.0.1" } })
    expect(listenChange).toHaveBeenLastCalledWith({ listen: "127.0.0.1" })
    await user.click(screen.getByRole("combobox", { name: "监听地址" }))
    await user.click(await screen.findByRole("option", { name: "未设置" }))
    expect(listenChange).toHaveBeenLastCalledWith({})
    cleanup()

    renderFields([{ path: "listen", label: "listenAddress", kind: "listen-address" }], { listen: "10.0.0.1" })
    expect(screen.getByLabelText("自定义监听地址")).toHaveValue("10.0.0.1")
    cleanup()

    const revisionView = renderApp(<InboundFormFields fields={[{ path: "listen", label: "listenAddress", kind: "listen-address" }]} object={{ listen: "0.0.0.0" }} type="mixed" revision={0} onChange={vi.fn()} />)
    expect(screen.queryByLabelText("自定义监听地址")).not.toBeInTheDocument()
    revisionView.rerender(<InboundFormFields fields={[{ path: "listen", label: "listenAddress", kind: "listen-address" }]} object={{ listen: "10.0.0.8" }} type="mixed" revision={1} onChange={vi.fn()} />)
    expect(screen.getByLabelText("自定义监听地址")).toHaveValue("10.0.0.8")
    cleanup()

    const booleanChange = renderFields([{ path: "auto_route", label: "autoRoute", kind: "boolean" }], { auto_route: true })
    await user.click(screen.getByRole("switch", { name: "自动路由" }))
    expect(booleanChange).toHaveBeenLastCalledWith({})
  })

  it("supports explicit UDP fragmentation and user variants", async () => {
    const user = userEvent.setup()
    const selectChange = renderFields([{ path: "udp_fragment", label: "udpFragment", kind: "select", options: ["true", "false"] }], { udp_fragment: false })
    await user.click(screen.getByRole("combobox", { name: "UDP 分片" }))
    await user.click(await screen.findByRole("option", { name: "启用" }))
    expect(selectChange).toHaveBeenLastCalledWith({ udp_fragment: true })
    await user.click(screen.getByRole("combobox", { name: "UDP 分片" }))
    await user.click(await screen.findByRole("option", { name: "未设置" }))
    expect(selectChange).toHaveBeenLastCalledWith({})
    cleanup()

    const usersChange = renderFields([{ path: "users", label: "users", kind: "users" }], { users: [{ name: "old", uuid: "id", custom: "keep" }] }, "vmess")
    expect(screen.getByLabelText("认证用户")).toHaveValue(JSON.stringify([{ name: "old", uuid: "id", custom: "keep" }], null, 2))
    fireEvent.change(screen.getByLabelText("认证用户"), { target: { value: '[{"name":"new","uuid":"new-id","custom":"keep"}]' } })
    expect(usersChange).toHaveBeenLastCalledWith({ users: [{ name: "new", uuid: "new-id", custom: "keep" }] })
    fireEvent.change(screen.getByLabelText("认证用户"), { target: { value: "invalid" } })
    expect(screen.getByText("请输入有效的 JSON 结构。")).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("认证用户"), { target: { value: "" } })
    expect(usersChange).toHaveBeenLastCalledWith({})
  })

  it("validates JSON object fields", () => {
    const onChange = vi.fn()
    const onValidity = vi.fn()
    const view = renderApp(<InboundFormFields fields={[{ path: "transport.headers", label: "transportHeaders", kind: "json-object" }]} object={{}} type="vless" onChange={onChange} onFieldValidityChange={onValidity} />)
    const input = screen.getByLabelText("传输 Headers")
    fireEvent.change(input, { target: { value: "{}" } })
    expect(onChange).toHaveBeenLastCalledWith({ transport: { headers: {} } })
    fireEvent.change(input, { target: { value: "[]" } })
    expect(onValidity).toHaveBeenLastCalledWith("transport.headers", false)
    fireEvent.change(input, { target: { value: "" } })
    expect(onChange).toHaveBeenLastCalledWith({})
    view.unmount()
    expect(onValidity).toHaveBeenLastCalledWith("transport.headers", true)
  })

  it("synchronizes structured JSON fields after an external object update", async () => {
    const user = userEvent.setup()
    renderApp(<JSONFieldHarness />)
    expect(screen.getByLabelText("传输 Headers")).toHaveValue(JSON.stringify({ X: "old" }, null, 2))
    await user.click(screen.getByRole("button", { name: "External update" }))
    expect(screen.getByLabelText("传输 Headers")).toHaveValue(JSON.stringify({ X: "new" }, null, 2))
  })

  it("resets an invalid structured JSON draft when the form revision changes", async () => {
    const user = userEvent.setup()
    renderApp(<JSONFieldRevisionHarness />)
    fireEvent.change(screen.getByLabelText("传输 Headers"), { target: { value: "invalid" } })
    expect(screen.getByText("invalid")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "JSON update" }))
    expect(screen.getByLabelText("传输 Headers")).toHaveValue(JSON.stringify({ X: "old" }, null, 2))
    expect(screen.getByText("valid")).toBeInTheDocument()
  })

  it("resets listen address mode when the form revision changes", async () => {
    const user = userEvent.setup()
    renderApp(<ListenRevisionHarness />)
    expect(screen.getByRole("combobox", { name: "监听地址" })).toHaveTextContent("0.0.0.0（IPv4 全接口）")
    await user.click(screen.getByRole("button", { name: "Listen update" }))
    expect(screen.getByRole("combobox", { name: "监听地址" })).toHaveTextContent("::（IPv6 全接口）")
  })
})


describe("inbound bind interface field", () => {
  it("loads network interfaces for bind interface selection and shows field help", async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn((input: string | URL | Request) => {
      const path = typeof input === "string" ? input : input.toString()
      if (path.includes("/api/network/interfaces")) {
        return Promise.resolve(new Response(JSON.stringify({
          status: "ok",
          data: {
            interfaces: [
              { name: "wlp3s0", ips: ["192.168.1.48"] },
              { name: "eno1", ips: [] },
              { name: "tun0" },
            ],
          },
          error: null,
          meta: null,
        }), { status: 200, headers: { "Content-Type": "application/json" } }))
      }
      return Promise.resolve(new Response(JSON.stringify({ status: "ok", data: {}, error: null, meta: null }), { status: 200 }))
    })
    vi.stubGlobal("fetch", fetchMock)
    const onChange = vi.fn()
    renderApp(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><InboundFormFields fields={[{ path: "bind_interface", label: "bindInterface", kind: "network-interface" }, { path: "routing_mark", label: "routingMark" }]} object={{}} type="mixed" onChange={onChange} /></QueryClientProvider>)
    expect((await screen.findAllByRole("button", { name: "字段说明" })).length).toBeGreaterThan(0)
    await screen.findByRole("combobox", { name: "绑定接口" })
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await user.click(screen.getByRole("combobox", { name: "绑定接口" }))
    await user.click(await screen.findByRole("option", { name: "手动输入" }))
    expect(screen.getByLabelText("自定义网卡名称")).toBeInTheDocument()
    await user.click(screen.getByRole("combobox", { name: "绑定接口" }))
    await user.click(await screen.findByRole("option", { name: "tun0" }))
    expect(onChange).toHaveBeenLastCalledWith({ bind_interface: "tun0" })
    await user.click(screen.getByRole("combobox", { name: "绑定接口" }))
    await user.click(await screen.findByRole("option", { name: "wlp3s0 (192.168.1.48)" }))
    expect(onChange).toHaveBeenLastCalledWith({ bind_interface: "wlp3s0" })
    await user.click(screen.getByRole("combobox", { name: "绑定接口" }))
    await user.click(await screen.findByRole("option", { name: "未设置" }))
    expect(onChange).toHaveBeenLastCalledWith({})
    await user.click(screen.getByRole("combobox", { name: "绑定接口" }))
    await user.click(await screen.findByRole("option", { name: "eno1" }))
    expect(onChange).toHaveBeenLastCalledWith({ bind_interface: "eno1" })
    await user.click(screen.getByRole("combobox", { name: "绑定接口" }))
    await user.click(await screen.findByRole("option", { name: "手动输入" }))
    fireEvent.change(screen.getByLabelText("自定义网卡名称"), { target: { value: "eth0" } })
    expect(onChange).toHaveBeenLastCalledWith({ bind_interface: "eth0" })
  })
})

describe("inbound hierarchical fields", () => {
  it("hides TLS child fields until TLS is enabled and prunes them when disabled", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const view = renderApp(<InboundFormFields fields={tlsFields} object={{ tls: { enabled: true, server_name: "example.com", reality: { enabled: true, private_key: "k" } } }} type="vless" onChange={onChange} />)
    expect(screen.getByLabelText("服务器名称")).toHaveValue("example.com")
    expect(screen.getByLabelText("Reality 私钥")).toHaveValue("k")
    await user.click(screen.getByRole("switch", { name: "启用 TLS" }))
    expect(onChange).toHaveBeenLastCalledWith({})
    view.unmount()

    const off = renderApp(<InboundFormFields fields={tlsFields} object={{}} type="vless" onChange={onChange} />)
    expect(screen.queryByLabelText("服务器名称")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Reality 私钥")).not.toBeInTheDocument()
    off.unmount()
  })

  it("shows ACME details only after domain is set and keep-alive fields respect disable switch", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderApp(<InboundFormFields fields={tlsFields} object={{ tls: { enabled: true, acme: { domain: ["a.com"], email: "a@b.com" } } }} type="trojan" onChange={onChange} />)
    expect(screen.getByLabelText("ACME 邮箱")).toHaveValue("a@b.com")
    fireEvent.change(screen.getByLabelText("ACME 域名"), { target: { value: "" } })
    expect(onChange).toHaveBeenLastCalledWith({ tls: { enabled: true } })
    cleanup()

    const keep = renderApp(<InboundFormFields fields={[{ path: "disable_tcp_keep_alive", label: "disableTCPKeepAlive", kind: "boolean" }, { path: "tcp_keep_alive", label: "tcpKeepAlive", when: { path: "disable_tcp_keep_alive", falsy: true } }, { path: "tcp_keep_alive_interval", label: "tcpKeepAliveInterval", when: { path: "disable_tcp_keep_alive", falsy: true } }]} object={{ tcp_keep_alive: "5m", tcp_keep_alive_interval: "30s" }} type="mixed" onChange={onChange} />)
    expect(screen.getByLabelText("TCP Keep Alive")).toHaveValue("5m")
    await user.click(screen.getByRole("switch", { name: "禁用 TCP Keep Alive" }))
    expect(onChange).toHaveBeenLastCalledWith({ disable_tcp_keep_alive: true })
    keep.unmount()
  })

  it("prunes nested invisible fields through helpers", () => {
    const pruned = pruneInvisibleFields({
      tls: { enabled: false, server_name: "x", reality: { enabled: true, private_key: "k" } },
      multiplex: { enabled: false, padding: true, brutal: { enabled: true, up_mbps: 100 } },
    }, tlsFields.concat([
      { path: "multiplex.enabled", label: "multiplexEnabled", kind: "boolean" },
      { path: "multiplex.padding", label: "multiplexPadding", kind: "boolean", when: { path: "multiplex.enabled", is: true } },
      { path: "multiplex.brutal.enabled", label: "brutalEnabled", kind: "boolean", when: { path: "multiplex.enabled", is: true } },
      { path: "multiplex.brutal.up_mbps", label: "uploadMbps", kind: "number", when: [{ path: "multiplex.enabled", is: true }, { path: "multiplex.brutal.enabled", is: true }] },
    ]))
    expect(pruned).toEqual({ tls: { enabled: false }, multiplex: { enabled: false } })
    expect(isFieldVisible({ tls: { enabled: true } }, tlsFields[1])).toBe(true)
    expect(applyInboundFieldChange({}, { disable_tcp_keep_alive: true, tcp_keep_alive: "5m" }, "mixed")).toEqual({ disable_tcp_keep_alive: true })
  })
})
