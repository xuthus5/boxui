import { useState } from "react"
import { CopyIcon, EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation()
  const [deleting, setDeleting] = useState(false)
  const tag = typeof item.tag === "string" && item.tag ? item.tag : t("policy.route.unnamed")
  const summary = summarizeRuleSet(item)
  const confirmDelete = () => { setDeleting(false); onDelete() }
  return <>
    <Card size="sm">
      <CardHeader className="min-w-0"><CardTitle>{tag}</CardTitle><CardDescription className="min-w-0 break-words">{summary.detail || t("policy.route.ruleSetLocationMissing")}</CardDescription>
        <CardAction><Button variant="outline" size="xs" aria-label={t("policy.route.editRuleSet", { tag })} onClick={onEdit}><PencilIcon data-icon="inline-start" />{t("policy.route.edit")}</Button></CardAction>
      </CardHeader>
      <CardContent><Badge variant="secondary">{summary.type}</Badge></CardContent>
      <CardFooter className="justify-between gap-2">
        <div className="hidden gap-1 sm:flex">
          <Button variant="outline" size="icon-xs" aria-label={t("policy.route.copyRuleSet", { tag })} onClick={onCopy}><CopyIcon data-icon="inline-start" /></Button>
          <Button variant="destructive" size="icon-xs" aria-label={t("policy.route.deleteRuleSet", { tag })} onClick={() => setDeleting(true)}><Trash2Icon data-icon="inline-start" /></Button>
        </div>
        <div className="sm:hidden"><DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="icon-xs" aria-label={t("policy.route.moreRuleSetActions", { tag })} />}><EllipsisIcon data-icon="inline-start" /></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuGroup>
            <DropdownMenuItem onClick={onCopy}><CopyIcon />{t("policy.route.copy")}</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}><Trash2Icon />{t("policy.route.delete")}</DropdownMenuItem>
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu></div>
      </CardFooter>
    </Card>
    <AlertDialog open={deleting} onOpenChange={setDeleting}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{t("policy.route.deleteRuleSetTitle", { tag })}</AlertDialogTitle><AlertDialogDescription>{t("policy.route.deleteDescription")}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>{t("policy.route.cancel")}</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={confirmDelete}>{t("policy.route.confirmDelete")}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </>
}
