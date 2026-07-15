import { useState } from "react"
import { ListPlusIcon, ServerIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { DNSFakeIPCard, DNSGlobalCard } from "@/features/policy/dns-global-card"
import { DNSRuleCard } from "@/features/policy/dns-rule-card"
import { DNSRuleDialog } from "@/features/policy/dns-rule-dialog"
import { DNSServerCard } from "@/features/policy/dns-server-card"
import { DNSServerDialog } from "@/features/policy/dns-server-dialog"
import { dnsRules, dnsServers, setDNSRules, setDNSServers } from "@/features/policy/dns-form-model"
import { cloneJsonObject, moveItem, type JsonObject } from "@/features/policy/policy-form-model"
import type { PolicyVisualEditorProps } from "@/features/policy/policy-page"

interface EditorSelection {
  kind: "server" | "rule"
  index: number | null
  item: JsonObject
}

function replaceOrAppend(items: readonly JsonObject[], index: number | null, item: JsonObject) {
  if (index === null) return [...items, item]
  return items.map((current, currentIndex) => currentIndex === index ? item : current)
}

function insertCopy(items: readonly JsonObject[], index: number) {
  return [...items.slice(0, index + 1), cloneJsonObject(items[index]), ...items.slice(index + 1)]
}

function EmptySection({ title, description, action, onAdd }: {
  title: string; description: string; action: string; onAdd: () => void
}) {
  return <Empty><EmptyHeader><EmptyMedia variant="icon"><ServerIcon /></EmptyMedia>
    <EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>
    <EmptyContent><Button onClick={onAdd}><ListPlusIcon data-icon="inline-start" />{action}</Button></EmptyContent>
  </Empty>
}

function ServerSection({ object, onChange, onEdit }: {
  object: JsonObject; onChange: (object: JsonObject) => void; onEdit: (index: number | null) => void
}) {
  const servers = dnsServers(object)
  const update = (next: readonly JsonObject[]) => onChange(setDNSServers(object, next))
  return <Card><CardHeader><CardTitle>DNS 服务器</CardTitle><CardDescription>管理旧式和现代 DNS server。</CardDescription>
    <CardAction><Button onClick={() => onEdit(null)}><ListPlusIcon data-icon="inline-start" />新增 DNS 服务器</Button></CardAction></CardHeader>
    <CardContent>{servers.length === 0
      ? <EmptySection title="暂无 DNS 服务器" description="新增第一台 DNS 服务器。" action="新增 DNS 服务器" onAdd={() => onEdit(null)} />
      : <div className="flex flex-col gap-3">{servers.map((item, index) => <DNSServerCard key={index} item={item}
        onEdit={() => onEdit(index)} onCopy={() => update(insertCopy(servers, index))}
        onDelete={() => update(servers.filter((_, itemIndex) => itemIndex !== index))} />)}</div>}</CardContent>
    <CardFooter><p className="text-muted-foreground">共 {servers.length} 台服务器</p></CardFooter></Card>
}

function RuleSection({ object, onChange, onEdit }: {
  object: JsonObject; onChange: (object: JsonObject) => void; onEdit: (index: number | null) => void
}) {
  const rules = dnsRules(object)
  const update = (next: readonly JsonObject[]) => onChange(setDNSRules(object, next))
  return <Card><CardHeader><CardTitle>DNS 规则</CardTitle><CardDescription>规则按列表顺序依次匹配。</CardDescription>
    <CardAction><Button onClick={() => onEdit(null)}><ListPlusIcon data-icon="inline-start" />新增 DNS 规则</Button></CardAction></CardHeader>
    <CardContent>{rules.length === 0
      ? <EmptySection title="暂无 DNS 规则" description="新增第一条 DNS 匹配规则。" action="新增 DNS 规则" onAdd={() => onEdit(null)} />
      : <div className="flex flex-col gap-3">{rules.map((item, index) => <DNSRuleCard key={index} index={index} item={item}
        first={index === 0} last={index === rules.length - 1} onEdit={() => onEdit(index)}
        onCopy={() => update(insertCopy(rules, index))} onMoveUp={() => update(moveItem(rules, index, -1))}
        onMoveDown={() => update(moveItem(rules, index, 1))}
        onDelete={() => update(rules.filter((_, itemIndex) => itemIndex !== index))} />)}</div>}</CardContent>
    <CardFooter><p className="text-muted-foreground">共 {rules.length} 条规则</p></CardFooter></Card>
}

function selectionTitle(selection: EditorSelection): string {
  if (selection.index === null) return selection.kind === "server" ? "新增 DNS 服务器" : "新增 DNS 规则"
  return selection.kind === "server" ? "编辑 DNS 服务器" : `编辑 DNS 规则 ${selection.index + 1}`
}

export function DNSVisualEditor(props: PolicyVisualEditorProps): React.ReactNode {
  const { object, onChange } = props
  const [selection, setSelection] = useState<EditorSelection | null>(null)
  const editServer = (index: number | null) => setSelection({ kind: "server", index,
    item: index === null ? {} : dnsServers(object)[index] })
  const editRule = (index: number | null) => setSelection({ kind: "rule", index,
    item: index === null ? { action: "route" } : dnsRules(object)[index] })
  const saveSelection = (item: JsonObject) => {
    if (!selection) return
    const next = selection.kind === "server"
      ? setDNSServers(object, replaceOrAppend(dnsServers(object), selection.index, item))
      : setDNSRules(object, replaceOrAppend(dnsRules(object), selection.index, item))
    onChange(next)
    setSelection(null)
  }
  const serverTags = dnsServers(object).flatMap((server) => typeof server.tag === "string" && server.tag ? [server.tag] : [])
  return <div className="flex min-w-0 flex-col gap-4"><DNSGlobalCard {...props} /><DNSFakeIPCard {...props} />
    <ServerSection object={object} onChange={onChange} onEdit={editServer} />
    <RuleSection object={object} onChange={onChange} onEdit={editRule} />
    {selection?.kind === "server" ? <DNSServerDialog key={`${selection.index}:${JSON.stringify(selection.item)}`} open
      item={selection.item} title={selectionTitle(selection)} onOpenChange={(open) => { if (!open) setSelection(null) }} onSave={saveSelection} /> : null}
    {selection?.kind === "rule" ? <DNSRuleDialog key={`${selection.index}:${JSON.stringify(selection.item)}`} open
      item={selection.item} title={selectionTitle(selection)} serverTags={serverTags}
      onOpenChange={(open) => { if (!open) setSelection(null) }} onSave={saveSelection} /> : null}
  </div>
}
