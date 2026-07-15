import { useQuery } from "@tanstack/react-query"
import { useId } from "react"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { NodeSection } from "@/features/nodes/node-section"
import { RuntimeGroupsCard } from "@/features/nodes/runtime-groups-card"
import { api } from "@/lib/api/endpoints"
import type { Outbound, TestResult } from "@/lib/api/types"

function groupSubscriptions(nodes: Outbound[]) {
  const groups = new Map<string, Outbound[]>()
  for (const node of nodes) {
    if (node.source !== "subscription") continue
    const name = node.source_name || ""
    groups.set(name, [...(groups.get(name) ?? []), node])
  }
  return groups
}

function SubscriptionSections({ groups, results }: { groups: Map<string, Outbound[]>; results?: Record<string, Record<string, TestResult>> }) {
  const { t } = useTranslation()
  const titleId = useId()
  return <section aria-labelledby={titleId} className="flex flex-col gap-3">
    <div><h2 id={titleId} className="text-lg font-medium">{t("nodes.subscriptionNodes")}</h2><p className="text-sm text-muted-foreground">{t("nodes.subscriptionNodesDescription")}</p></div>
    {groups.size ? <div className="grid gap-4">{Array.from(groups, ([name, nodes]) => <NodeSection key={name || "subscription"} title={name || t("nodes.subscription")} description={t("nodes.nodeCount", { count: nodes.length })} nodes={nodes} results={results} />)}</div>
      : <Empty><EmptyHeader><EmptyTitle>{t("nodes.empty")}</EmptyTitle><EmptyDescription>{t("nodes.emptyDescription")}</EmptyDescription></EmptyHeader></Empty>}
  </section>
}

export function NodesPage() {
  const { t } = useTranslation()
  const nodesQuery = useQuery({ queryKey: ["nodes"], queryFn: api.nodes.list })
  const resultsQuery = useQuery({ queryKey: ["nodes", "results"], queryFn: api.nodes.results })
  const nodes = nodesQuery.data ?? []
  const imported = nodes.filter((node) => node.source === "import")
  const subscriptions = groupSubscriptions(nodes)
  const error = nodesQuery.error ?? resultsQuery.error
  if (nodesQuery.isLoading) return <Skeleton className="h-64 w-full" />
  if (error) return <Alert variant="destructive"><AlertTitle>{t("common.loadFailed")}</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>
  return <div className="flex flex-col gap-4">
    <h1 className="text-2xl font-semibold">{t("nodes.title")}</h1>
    <NodeSection title={t("nodes.allNodes")} description={t("nodes.allNodesDescription")} nodes={nodes} results={resultsQuery.data} />
    <SubscriptionSections groups={subscriptions} results={resultsQuery.data} />
    <NodeSection title={t("nodes.importedNodes")} description={t("nodes.importedNodesDescription")} nodes={imported} results={resultsQuery.data} />
    <RuntimeGroupsCard />
  </div>
}
