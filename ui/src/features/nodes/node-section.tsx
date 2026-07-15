import { useId } from "react"
import { useTranslation } from "react-i18next"

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { NodeCard } from "@/features/nodes/node-card"
import type { Outbound, TestResult } from "@/lib/api/types"

interface Props {
  title: string
  description: string
  nodes: Outbound[]
  results?: Record<string, Record<string, TestResult>>
}

export function NodeSection({ title, description, nodes, results }: Props) {
  const { t } = useTranslation()
  const titleId = useId()
  return <section aria-labelledby={titleId} className="flex flex-col gap-3">
    <div><h2 id={titleId} className="text-lg font-medium">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div>
    {nodes.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {nodes.map((node) => <NodeCard key={node.tag} node={node} results={results?.[node.tag]} />)}
    </div> : <Empty><EmptyHeader><EmptyTitle>{t("nodes.empty")}</EmptyTitle><EmptyDescription>{t("nodes.emptyDescription")}</EmptyDescription></EmptyHeader></Empty>}
  </section>
}
