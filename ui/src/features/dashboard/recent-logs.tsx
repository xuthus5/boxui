import { Badge } from "@/components/ui/badge"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LogEvent } from "@/lib/api/types"

function formatLogTime(timestamp?: string) {
  if (!timestamp) return "—"
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString()
}

export function RecentLogs({ items }: { items: LogEvent[] }) {
  const { t } = useTranslation()
  return (
    <Card className="lg:col-span-3">
      <CardHeader><CardTitle>{t("dashboard.recentLogs")}</CardTitle><CardDescription>{t("dashboard.recentLogsDescription")}</CardDescription></CardHeader>
      <CardContent>
        {items.length === 0 ? <Empty><EmptyHeader><EmptyTitle>{t("dashboard.noLogs")}</EmptyTitle><EmptyDescription>{t("dashboard.logsWaiting")}</EmptyDescription></EmptyHeader></Empty> : <Table className="table-fixed">
          <TableHeader className="hidden sm:table-header-group"><TableRow><TableHead className="w-28">{t("observability.time")}</TableHead><TableHead className="w-20">{t("dashboard.level")}</TableHead><TableHead>{t("dashboard.message")}</TableHead></TableRow></TableHeader>
          <TableBody>{items.map((item, index) => <TableRow className="grid grid-cols-[auto_1fr] items-center sm:table-row" key={`${item.timestamp}-${item.level}-${index}`}>
            <TableCell className="flex min-h-9 items-center px-2 py-1 text-xs whitespace-nowrap text-muted-foreground sm:table-cell sm:p-2 sm:text-sm"><time dateTime={item.timestamp || undefined}>{formatLogTime(item.timestamp)}</time></TableCell>
            <TableCell className="flex min-h-9 items-center justify-self-start px-2 py-1 sm:table-cell sm:p-2"><Badge variant={item.level === "error" ? "destructive" : "secondary"}>{item.level}</Badge></TableCell>
            <TableCell className="col-span-2 block p-2 pt-1 whitespace-normal break-words sm:table-cell sm:p-2">{item.message}</TableCell>
          </TableRow>)}</TableBody>
        </Table>}
      </CardContent>
    </Card>
  )
}
