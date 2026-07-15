import type { PolicyFieldSpec } from "@/features/policy/policy-form-model"

const domainStrategies = ["prefer_ipv4", "prefer_ipv6", "ipv4_only", "ipv6_only"] as const
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
const legacyFields = [
  { path: "address", label: "address" }, { path: "address_resolver", label: "addressResolver" },
  { path: "address_strategy", label: "addressStrategy", kind: "select", options: domainStrategies },
  { path: "address_fallback_delay", label: "addressFallbackDelay" },
  { path: "strategy", label: "strategy", kind: "select", options: domainStrategies },
  { path: "detour", label: "detour" }, { path: "client_subnet", label: "clientSubnet" },
] as const satisfies readonly PolicyFieldSpec[]

export const dnsServerFields: Record<string, readonly PolicyFieldSpec[]> = {
  legacy: legacyFields,
  local: [...dialerFields, { path: "prefer_go", label: "preferGo", kind: "boolean" }],
  hosts: [{ path: "path", label: "path", kind: "list" }, { path: "predefined", label: "predefined", kind: "json-object" }],
  udp: remoteFields,
  tcp: remoteFields,
  tls: [...remoteFields, ...tlsFields],
  quic: [...remoteFields, ...tlsFields],
  https: [...remoteFields, ...tlsFields, { path: "path", label: "path" }, { path: "method", label: "method" }, { path: "headers", label: "headers", kind: "json-object" }],
  h3: [...remoteFields, ...tlsFields, { path: "path", label: "path" }, { path: "method", label: "method" }, { path: "headers", label: "headers", kind: "json-object" }],
  dhcp: [...dialerFields, { path: "prefer_go", label: "preferGo", kind: "boolean" }, { path: "interface", label: "interface" }],
  fakeip: [{ path: "inet4_range", label: "fakeIPIPv4Range" }, { path: "inet6_range", label: "fakeIPIPv6Range" }],
}
