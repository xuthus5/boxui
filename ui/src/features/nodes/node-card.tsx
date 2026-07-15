import { GaugeIcon } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useId } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { api, type TestInput } from "@/lib/api/endpoints"
import type { Outbound, TestResult } from "@/lib/api/types"

const testTypes = ["tcp", "http", "icmp"] as const
type TestType = typeof testTypes[number]
type TestChoice = TestType | "all"

function testInput(node: Outbound, type: TestType): TestInput | null {
  if (!node.server || !node.port) return null
  return { tag: node.tag, test_type: type, server: node.server, port: node.port }
}

function ResultBadge({ result }: { result?: TestResult }) {
  const { t } = useTranslation()
  if (!result) return <Badge variant="outline">—</Badge>
  if (!result.success) return <Badge variant="destructive">{result.error || t("nodes.testFailed")}</Badge>
  return <Badge variant="secondary">{result.latency_ms === undefined ? t("common.normal") : `${result.latency_ms.toFixed(0)} ms`}</Badge>
}

function TestResults({ results }: { results?: Record<string, TestResult> }) {
  return <dl className="grid gap-2">{testTypes.map((type) => (
    <div key={type} className="flex items-center justify-between gap-3">
      <dt className="text-sm text-muted-foreground">{type.toUpperCase()}</dt>
      <dd><ResultBadge result={results?.[type]} /></dd>
    </div>
  ))}</dl>
}

function TestControls({ node }: { node: Outbound }) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const available = Boolean(node.server && node.port)
  const mutation = useMutation({
    mutationFn: async (choice: TestChoice) => {
      if (choice === "all") return api.nodes.testBatch(testTypes.map((type) => testInput(node, type)!), 3)
      return api.nodes.test(testInput(node, choice)!)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["nodes", "results"] }),
    onError: (error: Error) => toast.error(error.message),
  })
  return <Collapsible><CollapsibleTrigger render={<Button variant="outline" className="w-full" disabled={!available || mutation.isPending} />}>
    <GaugeIcon data-icon="inline-start" />{t("nodes.test")}
  </CollapsibleTrigger><CollapsibleContent className="grid grid-cols-2 gap-2 pt-2">
    <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate("all")}>{t("nodes.testAll")}</Button>
    {testTypes.map((type) => <Button key={type} variant="outline" size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate(type)}>{type.toUpperCase()}</Button>)}
  </CollapsibleContent></Collapsible>
}

export function NodeCard({ node, results }: { node: Outbound; results?: Record<string, TestResult> }) {
  const { t } = useTranslation()
  const titleId = useId()
  const subscription = node.source === "subscription"
  const source = subscription ? node.source_name || t("nodes.subscription") : t("nodes.imported")
  return <article aria-labelledby={titleId}><Card size="sm" className="h-full">
    <CardHeader><CardTitle><h3 id={titleId}>{node.tag}</h3></CardTitle><CardDescription>{node.server ?? "—"}:{node.port ?? "—"}</CardDescription><CardAction><Badge variant="outline">{node.type}</Badge></CardAction></CardHeader>
    <CardContent className="flex flex-col gap-3"><Badge variant="secondary">{source}</Badge><TestResults results={results} /></CardContent>
    <CardFooter className="block"><TestControls node={node} /></CardFooter>
  </Card></article>
}
