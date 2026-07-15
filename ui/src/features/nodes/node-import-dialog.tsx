import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api/endpoints"
import type { ImportResult } from "@/lib/api/types"

interface Props { onClose: () => void; onSaved: () => void }

export function NodeImportDialog({ onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [link, setLink] = useState("")
  const [preview, setPreview] = useState<ImportResult | null>(null)
  const parse = useMutation({ mutationFn: () => api.import.link(link), onSuccess: setPreview, onError: (error: Error) => toast.error(error.message) })
  const save = useMutation({
    mutationFn: () => api.import.save({ tag: preview!.tag, type: preview!.type, server: preview!.server, port: preview!.port, config: preview!.config }).then(() => api.nodes.sync()),
    onSuccess: () => { toast.success(t("nodes.saved")); onSaved() },
    onError: (error: Error) => toast.error(error.message),
  })
  return <Dialog open onOpenChange={(open) => { if (!open) onClose() }}><DialogContent><DialogHeader><DialogTitle>{t("nodes.import")}</DialogTitle><DialogDescription>{t("nodes.importDescription")}</DialogDescription></DialogHeader>
    <FieldGroup><Field><FieldLabel htmlFor="node-link">{t("nodes.link")}</FieldLabel><Input id="node-link" value={link} onChange={(event) => setLink(event.target.value)} /></Field>
      {preview ? <Field><FieldLabel>{t("nodes.parseResult")}</FieldLabel><Card size="sm"><CardHeader><CardTitle>{preview.tag}</CardTitle><CardDescription>{preview.type}</CardDescription></CardHeader><CardContent>{preview.server}:{preview.port}</CardContent></Card></Field> : null}
    </FieldGroup><DialogFooter><Button variant="outline" disabled={!link || parse.isPending} onClick={() => parse.mutate()}>{t("nodes.parse")}</Button><Button disabled={!preview || save.isPending} onClick={() => save.mutate()}>{t("nodes.saveNode")}</Button></DialogFooter>
  </DialogContent></Dialog>
}
