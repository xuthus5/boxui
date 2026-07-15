import { useState } from "react"
import { CopyIcon, EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { JsonObject } from "@/features/policy/policy-form-model"
import { summarizeRuleSet } from "@/features/policy/route-form-model"

interface RouteRuleSetCardProps {
  item: JsonObject
  onEdit: () => void
  onCopy: () => void
  onDelete: () => void
}

export function RouteRuleSetCard({ item, onEdit, onCopy, onDelete }: RouteRuleSetCardProps) {
  const [deleting, setDeleting] = useState(false)
  const tag = typeof item.tag === "string" && item.tag ? item.tag : "未命名"
  const summary = summarizeRuleSet(item)
  const confirmDelete = () => { setDeleting(false); onDelete() }
  return <>
    <Card size="sm">
      <CardHeader><CardTitle>{tag}</CardTitle><CardDescription>{summary.detail || "未设置路径或 URL"}</CardDescription>
        <CardAction><Button variant="outline" size="xs" aria-label={`编辑规则集 ${tag}`} onClick={onEdit}><PencilIcon data-icon="inline-start" />编辑</Button></CardAction>
      </CardHeader>
      <CardContent><Badge variant="secondary">{summary.type}</Badge></CardContent>
      <CardFooter className="justify-between gap-2">
        <div className="hidden gap-1 sm:flex">
          <Button variant="outline" size="icon-xs" aria-label={`复制规则集 ${tag}`} onClick={onCopy}><CopyIcon data-icon="inline-start" /></Button>
          <Button variant="destructive" size="icon-xs" aria-label={`删除规则集 ${tag}`} onClick={() => setDeleting(true)}><Trash2Icon data-icon="inline-start" /></Button>
        </div>
        <div className="sm:hidden"><DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="icon-xs" aria-label={`更多规则集 ${tag}`} />}><EllipsisIcon data-icon="inline-start" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuGroup>
            <DropdownMenuItem onClick={onCopy}><CopyIcon />复制</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}><Trash2Icon />删除</DropdownMenuItem>
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu></div>
      </CardFooter>
    </Card>
    <AlertDialog open={deleting} onOpenChange={setDeleting}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>删除规则集 {tag}？</AlertDialogTitle><AlertDialogDescription>此操作无法撤销。</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={confirmDelete}>确认删除</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </>
}
