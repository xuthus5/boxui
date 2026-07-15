import { useState } from "react"
import { ListPlusIcon, RouteIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { RouteGlobalCard } from "@/features/policy/route-global-card"
import { cloneJsonObject, moveItem, type JsonObject } from "@/features/policy/policy-form-model"
import type { PolicyVisualEditorProps } from "@/features/policy/policy-page"
import { RouteRuleCard } from "@/features/policy/route-rule-card"
import { RouteRuleDialog } from "@/features/policy/route-rule-dialog"
import { RouteRuleSetCard } from "@/features/policy/route-rule-set-card"
import { RouteRuleSetDialog } from "@/features/policy/route-rule-set-dialog"
import { routeRuleSets, routeRules, setRouteRuleSets, setRouteRules } from "@/features/policy/route-form-model"

interface EditorSelection {
  kind: "rule" | "rule-set"
  index: number | null
  item: JsonObject
}

function EmptySection({ title, description, action, onAdd }: {
  title: string; description: string; action: string; onAdd: () => void
}) {
  return <Empty><EmptyHeader><EmptyMedia variant="icon"><RouteIcon /></EmptyMedia>
    <EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>
    <EmptyContent><Button onClick={onAdd}><ListPlusIcon data-icon="inline-start" />{action}</Button></EmptyContent>
  </Empty>
}

function replaceOrAppend(items: readonly JsonObject[], index: number | null, item: JsonObject) {
  if (index === null) return [...items, item]
  return items.map((current, currentIndex) => currentIndex === index ? item : current)
}

function insertCopy(items: readonly JsonObject[], index: number) {
  return [...items.slice(0, index + 1), cloneJsonObject(items[index]), ...items.slice(index + 1)]
}

function RuleSection({ object, onChange, onEdit }: {
  object: JsonObject; onChange: (object: JsonObject) => void; onEdit: (index: number | null) => void
}) {
  const rules = routeRules(object)
  const update = (next: readonly JsonObject[]) => onChange(setRouteRules(object, next))
  return <Card><CardHeader><CardTitle>路由规则</CardTitle><CardDescription>规则按列表顺序依次匹配。</CardDescription>
    <CardAction><Button onClick={() => onEdit(null)}><ListPlusIcon data-icon="inline-start" />新增规则</Button></CardAction></CardHeader>
    <CardContent>{rules.length === 0
      ? <EmptySection title="暂无路由规则" description="新增第一条匹配规则。" action="新增规则" onAdd={() => onEdit(null)} />
      : <div className="flex flex-col gap-3">{rules.map((item, index) => <RouteRuleCard key={index} index={index} item={item}
        first={index === 0} last={index === rules.length - 1} onEdit={() => onEdit(index)}
        onCopy={() => update(insertCopy(rules, index))} onMoveUp={() => update(moveItem(rules, index, -1))}
        onMoveDown={() => update(moveItem(rules, index, 1))} onDelete={() => update(rules.filter((_, itemIndex) => itemIndex !== index))} />)}</div>}
    </CardContent><CardFooter><p className="text-muted-foreground">共 {rules.length} 条规则</p></CardFooter></Card>
}

function RuleSetSection({ object, onChange, onEdit }: {
  object: JsonObject; onChange: (object: JsonObject) => void; onEdit: (index: number | null) => void
}) {
  const ruleSets = routeRuleSets(object)
  const update = (next: readonly JsonObject[]) => onChange(setRouteRuleSets(object, next))
  return <Card><CardHeader><CardTitle>路由规则集</CardTitle><CardDescription>管理 inline、local、remote 与未知类型规则集。</CardDescription>
    <CardAction><Button onClick={() => onEdit(null)}><ListPlusIcon data-icon="inline-start" />新增规则集</Button></CardAction></CardHeader>
    <CardContent>{ruleSets.length === 0
      ? <EmptySection title="暂无路由规则集" description="新增第一项规则集。" action="新增规则集" onAdd={() => onEdit(null)} />
      : <div className="flex flex-col gap-3">{ruleSets.map((item, index) => <RouteRuleSetCard key={index} item={item}
        onEdit={() => onEdit(index)} onCopy={() => update(insertCopy(ruleSets, index))}
        onDelete={() => update(ruleSets.filter((_, itemIndex) => itemIndex !== index))} />)}</div>}
    </CardContent><CardFooter><p className="text-muted-foreground">共 {ruleSets.length} 个规则集</p></CardFooter></Card>
}

function selectionTitle(selection: EditorSelection) {
  if (selection.index === null) return selection.kind === "rule" ? "新增规则" : "新增规则集"
  return selection.kind === "rule" ? `编辑规则 ${selection.index + 1}` : "编辑规则集"
}

export function RouteVisualEditor(props: PolicyVisualEditorProps): React.ReactNode {
  const { object, onChange } = props
  const [selection, setSelection] = useState<EditorSelection | null>(null)
  const editRule = (index: number | null) => setSelection({ kind: "rule", index, item: index === null ? { action: "route" } : routeRules(object)[index] })
  const editRuleSet = (index: number | null) => setSelection({ kind: "rule-set", index, item: index === null ? { type: "inline" } : routeRuleSets(object)[index] })
  const saveSelection = (item: JsonObject) => {
    if (!selection) return
    const next = selection.kind === "rule"
      ? setRouteRules(object, replaceOrAppend(routeRules(object), selection.index, item))
      : setRouteRuleSets(object, replaceOrAppend(routeRuleSets(object), selection.index, item))
    onChange(next)
    setSelection(null)
  }
  return <div className="flex min-w-0 flex-col gap-4">
    <RouteGlobalCard {...props} />
    <RuleSection object={object} onChange={onChange} onEdit={editRule} />
    <RuleSetSection object={object} onChange={onChange} onEdit={editRuleSet} />
    {selection?.kind === "rule" ? <RouteRuleDialog key={`${selection.index}:${JSON.stringify(selection.item)}`} open item={selection.item}
      title={selectionTitle(selection)} onOpenChange={(open) => { if (!open) setSelection(null) }} onSave={saveSelection} /> : null}
    {selection?.kind === "rule-set" ? <RouteRuleSetDialog key={`${selection.index}:${JSON.stringify(selection.item)}`} open item={selection.item}
      title={selectionTitle(selection)} onOpenChange={(open) => { if (!open) setSelection(null) }} onSave={saveSelection} /> : null}
  </div>
}
