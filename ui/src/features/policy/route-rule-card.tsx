import { useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { JsonObject } from "@/features/policy/policy-form-model"
import { summarizeRouteRule } from "@/features/policy/route-form-model"

interface RouteRuleCardProps {
  index: number
  item: JsonObject
  first: boolean
  last: boolean
  onEdit: () => void
  onCopy: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}

function DesktopActions({ index, first, last, onCopy, onMoveUp, onMoveDown, onDelete }: Omit<RouteRuleCardProps, "item" | "onEdit">) {
  const number = index + 1
  return <div className="hidden gap-1 sm:flex">
    <Button variant="outline" size="icon-xs" aria-label={`复制规则 ${number}`} onClick={onCopy}><CopyIcon data-icon="inline-start" /></Button>
    <Button variant="outline" size="icon-xs" aria-label={`上移规则 ${number}`} disabled={first} onClick={onMoveUp}><ArrowUpIcon data-icon="inline-start" /></Button>
    <Button variant="outline" size="icon-xs" aria-label={`下移规则 ${number}`} disabled={last} onClick={onMoveDown}><ArrowDownIcon data-icon="inline-start" /></Button>
    <Button variant="destructive" size="icon-xs" aria-label={`删除规则 ${number}`} onClick={onDelete}><Trash2Icon data-icon="inline-start" /></Button>
  </div>
}

function MobileActions(props: Omit<RouteRuleCardProps, "item" | "onEdit">) {
  const { index, first, last, onCopy, onMoveUp, onMoveDown, onDelete } = props
  return <div className="sm:hidden"><DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="outline" size="icon-xs" aria-label={`更多规则 ${index + 1}`} />}><EllipsisIcon data-icon="inline-start" /></DropdownMenuTrigger>
    <DropdownMenuContent align="end"><DropdownMenuGroup>
      <DropdownMenuItem onClick={onCopy}><CopyIcon />复制</DropdownMenuItem>
      <DropdownMenuItem disabled={first} onClick={onMoveUp}><ArrowUpIcon />上移</DropdownMenuItem>
      <DropdownMenuItem disabled={last} onClick={onMoveDown}><ArrowDownIcon />下移</DropdownMenuItem>
      <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2Icon />删除</DropdownMenuItem>
    </DropdownMenuGroup></DropdownMenuContent>
  </DropdownMenu></div>
}

export function RouteRuleCard(props: RouteRuleCardProps) {
  const { index, item, first, last, onEdit, onCopy, onMoveUp, onMoveDown, onDelete } = props
  const [deleting, setDeleting] = useState(false)
  const number = index + 1
  const summary = summarizeRouteRule(item)
  const type = String(item.type ?? "default")
  const confirmDelete = () => { setDeleting(false); onDelete() }
  return <>
    <Card size="sm">
      <CardHeader><CardTitle>规则 #{number}</CardTitle><CardDescription>{type}</CardDescription>
        <CardAction><Button variant="outline" size="xs" aria-label={`编辑规则 ${number}`} onClick={onEdit}><PencilIcon data-icon="inline-start" />编辑</Button></CardAction>
      </CardHeader>
      <CardContent><div className="flex flex-wrap gap-2">
        {summary.matches.slice(0, 3).map((match, matchIndex) => <Badge key={`${match}:${matchIndex}`} variant="secondary">{match}</Badge>)}
        <Badge>{summary.action}</Badge>
      </div></CardContent>
      <CardFooter className="justify-between gap-2">
        <DesktopActions index={index} first={first} last={last} onCopy={onCopy} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDelete={() => setDeleting(true)} />
        <MobileActions index={index} first={first} last={last} onCopy={onCopy} onMoveUp={onMoveUp} onMoveDown={onMoveDown} onDelete={() => setDeleting(true)} />
      </CardFooter>
    </Card>
    <AlertDialog open={deleting} onOpenChange={setDeleting}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>删除规则 #{number}？</AlertDialogTitle><AlertDialogDescription>此操作无法撤销。</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={confirmDelete}>确认删除</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </>
}
