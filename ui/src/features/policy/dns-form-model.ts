import {
  getPolicyPath,
  isJsonObject,
  setPolicyPath,
  type JsonObject,
  type PolicyFieldSpec,
} from "@/features/policy/policy-form-model"

const domainStrategies = ["prefer_ipv4", "prefer_ipv6", "ipv4_only", "ipv6_only"] as const

export const dnsGlobalFields = [
  { path: "final", label: "final" },
  { path: "strategy", label: "strategy", kind: "select", options: domainStrategies },
  { path: "disable_cache", label: "disableCache", kind: "boolean" },
  { path: "disable_expire", label: "disableExpire", kind: "boolean" },
  { path: "independent_cache", label: "independentCache", kind: "boolean" },
  { path: "cache_capacity", label: "cacheCapacity", kind: "number" },
  { path: "client_subnet", label: "clientSubnet" },
  { path: "reverse_mapping", label: "reverseMapping", kind: "boolean" },
] as const satisfies readonly PolicyFieldSpec[]

export const legacyFakeIPFields = [
  { path: "fakeip.enabled", label: "fakeIPEnabled", kind: "boolean" },
  { path: "fakeip.inet4_range", label: "fakeIPIPv4Range" },
  { path: "fakeip.inet6_range", label: "fakeIPIPv6Range" },
] as const satisfies readonly PolicyFieldSpec[]

export const dnsServerTypes = [
  "legacy", "local", "hosts", "udp", "tcp", "tls", "quic", "https", "h3", "dhcp", "fakeip",
] as const

export const dnsRuleMatchFields = [
  { path: "type", label: "type", kind: "select", options: ["default", "logical"] },
  { path: "inbound", label: "inbound", kind: "list" },
  { path: "ip_version", label: "ipVersion", kind: "number" },
  { path: "query_type", label: "queryType", kind: "list" },
  { path: "network", label: "network", kind: "list" },
  { path: "auth_user", label: "authUser", kind: "list" },
  { path: "protocol", label: "protocol", kind: "list" },
  { path: "domain", label: "domain", kind: "list" },
  { path: "domain_suffix", label: "domainSuffix", kind: "list" },
  { path: "domain_keyword", label: "domainKeyword", kind: "list" },
  { path: "domain_regex", label: "domainRegex", kind: "list" },
  { path: "source_ip_cidr", label: "sourceIPCIDR", kind: "list" },
  { path: "source_ip_is_private", label: "sourceIPIsPrivate", kind: "boolean" },
  { path: "ip_cidr", label: "ipCIDR", kind: "list" },
  { path: "ip_is_private", label: "ipIsPrivate", kind: "boolean" },
  { path: "source_port", label: "sourcePort", kind: "number-list" },
  { path: "source_port_range", label: "sourcePortRange", kind: "list" },
  { path: "port", label: "port", kind: "number-list" },
  { path: "port_range", label: "portRange", kind: "list" },
  { path: "process_name", label: "processName", kind: "list" },
  { path: "process_path", label: "processPath", kind: "list" },
  { path: "process_path_regex", label: "processPathRegex", kind: "list" },
  { path: "package_name", label: "packageName", kind: "list" },
  { path: "user", label: "user", kind: "list" },
  { path: "user_id", label: "userID", kind: "number-list" },
  { path: "outbound", label: "outbound", kind: "list" },
  { path: "clash_mode", label: "clashMode" },
  { path: "rule_set", label: "ruleSet", kind: "list" },
  { path: "rule_set_ip_cidr_match_source", label: "ruleSetIPCIDRMatchSource", kind: "boolean" },
  { path: "network_type", label: "networkType", kind: "list" },
  { path: "network_is_expensive", label: "networkIsExpensive", kind: "boolean" },
  { path: "network_is_constrained", label: "networkIsConstrained", kind: "boolean" },
  { path: "wifi_ssid", label: "wifiSSID", kind: "list" },
  { path: "wifi_bssid", label: "wifiBSSID", kind: "list" },
  { path: "invert", label: "invert", kind: "boolean" },
] as const satisfies readonly PolicyFieldSpec[]

export const dnsActions = ["route", "route-options", "reject", "predefined"] as const

const routeOptionFields = [
  { path: "strategy", label: "strategy", kind: "select", options: domainStrategies },
  { path: "disable_cache", label: "disableCache", kind: "boolean" },
  { path: "rewrite_ttl", label: "rewriteTTL", kind: "number" },
  { path: "client_subnet", label: "clientSubnet" },
] as const satisfies readonly PolicyFieldSpec[]

export const dnsActionFields: Record<string, readonly PolicyFieldSpec[]> = {
  route: [{ path: "server", label: "server" }, ...routeOptionFields],
  "route-options": routeOptionFields,
  reject: [
    { path: "method", label: "rejectMethod", kind: "select", options: ["default", "drop", "reply"] },
    { path: "no_drop", label: "rejectNoDrop", kind: "boolean" },
  ],
  predefined: [
    { path: "rcode", label: "rcode" },
    { path: "answer", label: "answer", kind: "list" },
    { path: "ns", label: "nameServer", kind: "list" },
    { path: "extra", label: "extra", kind: "list" },
  ],
}

const domainResolverFields = [
  { path: "domain_resolver.server", label: "domainResolverServer" },
  { path: "domain_resolver.strategy", label: "domainResolverStrategy", kind: "select", options: domainStrategies },
  { path: "domain_resolver.disable_cache", label: "domainResolverDisableCache", kind: "boolean" },
  { path: "domain_resolver.rewrite_ttl", label: "domainResolverRewriteTTL", kind: "number" },
  { path: "domain_resolver.client_subnet", label: "domainResolverClientSubnet" },
] as const satisfies readonly PolicyFieldSpec[]

const dialerFields = [
  { path: "detour", label: "detour" }, { path: "bind_interface", label: "bindInterface" },
  { path: "inet4_bind_address", label: "inet4BindAddress" }, { path: "inet6_bind_address", label: "inet6BindAddress" },
  { path: "bind_address_no_port", label: "bindAddressNoPort", kind: "boolean" },
  { path: "protect_path", label: "protectPath" }, { path: "routing_mark", label: "routingMark" },
  { path: "reuse_addr", label: "reuseAddress", kind: "boolean" }, { path: "netns", label: "networkNamespace" },
  { path: "connect_timeout", label: "connectTimeout" }, { path: "tcp_fast_open", label: "tcpFastOpen", kind: "boolean" },
  { path: "tcp_multi_path", label: "tcpMultiPath", kind: "boolean" },
  { path: "disable_tcp_keep_alive", label: "disableTCPKeepAlive", kind: "boolean" },
  { path: "tcp_keep_alive", label: "tcpKeepAlive" }, { path: "tcp_keep_alive_interval", label: "tcpKeepAliveInterval" },
  { path: "udp_fragment", label: "udpFragment", kind: "boolean" }, ...domainResolverFields,
  { path: "network_strategy", label: "networkStrategy", kind: "select", options: ["default", "fallback", "hybrid"] },
  { path: "network_type", label: "networkType", kind: "list" },
  { path: "fallback_network_type", label: "fallbackNetworkType", kind: "list" },
  { path: "fallback_delay", label: "fallbackDelay" },
] as const satisfies readonly PolicyFieldSpec[]

const remoteFields = [
  { path: "server", label: "server" }, { path: "server_port", label: "serverPort", kind: "number" }, ...dialerFields,
] as const satisfies readonly PolicyFieldSpec[]
const tlsFields = [
  { path: "tls.enabled", label: "tlsEnabled", kind: "boolean" }, { path: "tls.disable_sni", label: "tlsDisableSNI", kind: "boolean" },
  { path: "tls.server_name", label: "tlsServerName" }, { path: "tls.insecure", label: "tlsInsecure", kind: "boolean" },
  { path: "tls.alpn", label: "tlsALPN", kind: "list" }, { path: "tls.certificate", label: "tlsCertificate", kind: "list" },
  { path: "tls.certificate_path", label: "tlsCertificatePath" },
] as const satisfies readonly PolicyFieldSpec[]
const legacyServerFields = [
  { path: "address", label: "address" }, { path: "address_resolver", label: "addressResolver" },
  { path: "address_strategy", label: "addressStrategy", kind: "select", options: domainStrategies },
  { path: "address_fallback_delay", label: "addressFallbackDelay" }, { path: "strategy", label: "strategy", kind: "select", options: domainStrategies },
  { path: "detour", label: "detour" }, { path: "client_subnet", label: "clientSubnet" },
] as const satisfies readonly PolicyFieldSpec[]

const serverTypeFields: Record<string, readonly PolicyFieldSpec[]> = {
  legacy: legacyServerFields,
  local: [...dialerFields, { path: "prefer_go", label: "preferGo", kind: "boolean" }],
  hosts: [{ path: "path", label: "path", kind: "list" }, { path: "predefined", label: "predefined", kind: "json-object" }],
  udp: remoteFields, tcp: remoteFields,
  tls: [...remoteFields, ...tlsFields], quic: [...remoteFields, ...tlsFields],
  https: [...remoteFields, ...tlsFields, { path: "path", label: "path" }, { path: "method", label: "method" }, { path: "headers", label: "headers", kind: "json-object" }],
  h3: [...remoteFields, ...tlsFields, { path: "path", label: "path" }, { path: "method", label: "method" }, { path: "headers", label: "headers", kind: "json-object" }],
  dhcp: [...dialerFields, { path: "prefer_go", label: "preferGo", kind: "boolean" }, { path: "interface", label: "interface" }],
  fakeip: [{ path: "inet4_range", label: "fakeIPIPv4Range" }, { path: "inet6_range", label: "fakeIPIPv6Range" }],
}
const logicalRuleFields: readonly PolicyFieldSpec[] = [
  { path: "mode", label: "logicalMode", kind: "select", options: ["and", "or"] },
  { path: "rules", label: "logicalRules", kind: "json-array" },
  dnsRuleMatchFields.at(-1)!,
]
const ruleTypeFields: Record<string, readonly PolicyFieldSpec[]> = {
  default: dnsRuleMatchFields.filter((field) => field.path !== "type"), logical: logicalRuleFields,
}

function uniqueFields(groups: readonly (readonly PolicyFieldSpec[])[]): PolicyFieldSpec[] {
  const fields = new Map<string, PolicyFieldSpec>()
  for (const group of groups) for (const field of group) if (!fields.has(field.path)) fields.set(field.path, field)
  return [...fields.values()]
}

function matchesField(value: unknown, field: PolicyFieldSpec): boolean {
  if (value === undefined) return true
  if (field.path === "rcode" || field.path === "routing_mark") {
    return typeof value === "string" || typeof value === "number" && Number.isFinite(value)
  }
  if (field.path === "query_type") {
    const valid = (item: unknown) => typeof item === "string" || typeof item === "number" && Number.isFinite(item)
    return valid(value) || Array.isArray(value) && value.every(valid)
  }
  if (field.kind === "boolean") return typeof value === "boolean"
  if (field.kind === "number") return typeof value === "number" && Number.isFinite(value)
  if (field.kind === "list") return typeof value === "string" || Array.isArray(value) && value.every((item) => typeof item === "string")
  if (field.kind === "number-list") return typeof value === "number" && Number.isFinite(value)
    || Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isFinite(item))
  if (field.kind === "json-object") return value !== null && typeof value === "object" && !Array.isArray(value)
  if (field.kind === "json-array") return Array.isArray(value)
  return typeof value === "string"
}

function transitionFields(object: JsonObject, known: readonly PolicyFieldSpec[], compatible: readonly PolicyFieldSpec[]): JsonObject {
  const targets = new Map(compatible.map((field) => [field.path, field]))
  return known.reduce((next, field) => {
    const target = targets.get(field.path)
    return target && matchesField(getPolicyPath(next, field.path), target) ? next : setPolicyPath(next, field.path, undefined)
  }, object)
}

function compatibleFields(fields: Record<string, readonly PolicyFieldSpec[]>, current: string, target: string): PolicyFieldSpec[] {
  if (!Object.hasOwn(fields, current)) return [...(fields[target] ?? [])]
  const targetFields = fields[target] ?? []
  return targetFields.filter((field) => fields[current].some((source) => source.path === field.path && source.kind === field.kind))
}

const knownServerFields = uniqueFields(Object.values(serverTypeFields))
const knownRuleFields = uniqueFields(Object.values(ruleTypeFields))
const knownActionFields = uniqueFields(Object.values(dnsActionFields))

export function dnsServers(object: JsonObject): JsonObject[] {
  return Array.isArray(object.servers) ? object.servers.filter(isJsonObject) : []
}

export function dnsRules(object: JsonObject): JsonObject[] {
  return Array.isArray(object.rules) ? object.rules.filter(isJsonObject) : []
}

export function setDNSServers(object: JsonObject, servers: readonly JsonObject[]): JsonObject {
  return { ...object, servers: [...servers] }
}

export function setDNSRules(object: JsonObject, rules: readonly JsonObject[]): JsonObject {
  return { ...object, rules: [...rules] }
}

export function inferDNSServerType(server: JsonObject): string {
  return typeof server.type === "string" && server.type ? server.type : "legacy"
}

export function changeDNSServerType(server: JsonObject, type: string): JsonObject {
  const current = inferDNSServerType(server)
  if (current === type) return server
  const bothKnown = Object.hasOwn(serverTypeFields, current) && Object.hasOwn(serverTypeFields, type)
  const separated = bothKnown && (current === "legacy") !== (type === "legacy")
  const compatible = separated ? [] : compatibleFields(serverTypeFields, current, type)
  const next = transitionFields(server, knownServerFields, compatible)
  return setPolicyPath(next, "type", type === "legacy" ? undefined : type)
}

export function changeDNSRuleType(rule: JsonObject, type: string): JsonObject {
  const current = String(rule.type ?? "default")
  if (current === type) return rule
  const next = transitionFields(rule, knownRuleFields, compatibleFields(ruleTypeFields, current, type))
  return setPolicyPath(next, "type", type === "default" ? undefined : type)
}

export function changeDNSAction(rule: JsonObject, action: string): JsonObject {
  const explicit = String(rule.action ?? "")
  if (explicit === action && explicit) return rule
  const current = explicit || "route"
  const next = transitionFields(rule, knownActionFields, compatibleFields(dnsActionFields, current, action))
  return setPolicyPath(next, "action", action || undefined)
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export function summarizeDNSServer(server: JsonObject): { type: string; detail: string } {
  const type = inferDNSServerType(server)
  if (type === "legacy") return { type, detail: stringValue(server.address) || stringValue(server.tag) }
  const host = stringValue(server.server)
  const port = typeof server.server_port === "number" && Number.isFinite(server.server_port) ? `:${server.server_port}` : ""
  const detail = host ? `${host}${port}` : stringValue(server.interface) || stringValue(server.tag)
  return { type, detail }
}

const summaryPaths = [
  "domain", "domain_suffix", "domain_keyword", "domain_regex", "source_ip_cidr", "source_ip_is_private",
  "ip_cidr", "ip_is_private", "source_port", "source_port_range", "port", "port_range", "process_name",
  "process_path", "process_path_regex", "package_name", "user", "user_id", "rule_set",
  "rule_set_ip_cidr_match_source", "inbound", "ip_version", "query_type", "network", "auth_user", "protocol",
  "outbound", "clash_mode", "network_type", "network_is_expensive", "network_is_constrained", "wifi_ssid",
  "wifi_bssid", "invert",
]

function summarizeValue(path: string, value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => typeof item === "string" || typeof item === "number" ? [String(item)] : [])
  if (typeof value === "string" || typeof value === "number") return [String(value)]
  return value === true ? [path] : []
}

export function summarizeDNSRule(rule: JsonObject): { matches: string[]; action: string } {
  const matches = summaryPaths.flatMap((path) => summarizeValue(path, rule[path]))
  const action = String(rule.action ?? "route")
  return { matches, action: action === "route" && typeof rule.server === "string" ? rule.server : action }
}
