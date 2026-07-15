import { useMemo } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JsonEditor } from "@/features/config/json-editor"
import { useDNSDialogState, optionsWithCurrent } from "@/features/policy/dns-dialog-state"
import { PolicyFormFields } from "@/features/policy/policy-form-fields"
import { changeDNSServerType, dnsServerFields, dnsServerTypes, inferDNSServerType } from "@/features/policy/dns-form-model"
import type { JsonObject, PolicyFieldSpec } from "@/features/policy/policy-form-model"

export interface DNSServerDialogProps {
  open: boolean
  item: JsonObject
  title: string
  onOpenChange: (open: boolean) => void
  onSave: (item: JsonObject) => void
}

const tagField = [{ path: "tag", label: "tag", required: true }] as const satisfies readonly PolicyFieldSpec[]
const basicPaths = new Set(["address", "server", "server_port"])
const tlsPaths = new Set(["tls.enabled", "tls.disable_sni", "tls.server_name", "tls.insecure", "tls.alpn", "tls.certificate", "tls.certificate_path"])
const httpPaths = new Set(["path", "method", "headers"])
const specialPaths: Record<string, Set<string>> = {
  local: new Set(["prefer_go"]), hosts: new Set(["path", "predefined"]),
  dhcp: new Set(["prefer_go", "interface"]), fakeip: new Set(["inet4_range", "inet6_range"]),
}
const remoteTypes = new Set(["udp", "tcp", "tls", "quic", "https", "h3"])

function serverFields(type: string, section: "basic" | "dialer" | "tls" | "special") {
  const fields = dnsServerFields[type] ?? []
  if (section === "basic") return fields.filter((field) => basicPaths.has(field.path))
  if (section === "tls") return fields.filter((field) => tlsPaths.has(field.path)
    || (["https", "h3"].includes(type) && httpPaths.has(field.path)))
  if (section === "special") return fields.filter((field) => specialPaths[type]?.has(field.path))
  return fields.filter((field) => !basicPaths.has(field.path) && !tlsPaths.has(field.path)
    && !httpPaths.has(field.path) && !specialPaths[type]?.has(field.path))
}

function requiredServerValues(object: JsonObject): boolean {
  const type = inferDNSServerType(object)
  if (typeof object.tag !== "string" || !object.tag.trim()) return false
  if (type === "legacy") return typeof object.address === "string" && Boolean(object.address.trim())
  if (remoteTypes.has(type)) return typeof object.server === "string" && Boolean(object.server.trim())
  if (type === "dhcp") return typeof object.interface === "string" && Boolean(object.interface.trim())
  if (type === "fakeip") return [object.inet4_range, object.inet6_range].some((value) => typeof value === "string" && value.trim())
  return true
}

function ServerTypeField({ object, onChange }: { object: JsonObject; onChange: (item: JsonObject) => void }) {
  const current = inferDNSServerType(object)
  const options = useMemo(() => optionsWithCurrent(dnsServerTypes, current), [current])
  const items = useMemo(() => options.map((value) => ({ value, label: value })), [options])
  return <Field><FieldLabel htmlFor="dns-server-type">服务器类型</FieldLabel>
    <Select items={items} value={current} onValueChange={(value) => onChange(changeDNSServerType(object, String(value)))}>
      <SelectTrigger id="dns-server-type" aria-label="服务器类型" className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{options.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  </Field>
}

interface ServerFieldsProps {
  object: JsonObject
  type: string
  section: "basic" | "dialer" | "tls" | "special"
  revision: number
  onChange: (item: JsonObject) => void
  onValidity: (path: string, valid: boolean) => void
  transform: ReturnType<typeof useDNSDialogState>["transform"]
}

function ServerFields(props: ServerFieldsProps) {
  const fields = serverFields(props.type, props.section)
  return <PolicyFormFields fields={fields} object={props.object} namespace="policy.dns" revision={props.revision}
    onChange={props.onChange} onFieldValidityChange={props.onValidity} transformField={props.transform} />
}

function AdvancedJSON({ value, title, onChange }: { value: string; title: string; onChange: (value: string) => void }) {
  return <FieldGroup><Field><FieldLabel className="sr-only">高级 JSON</FieldLabel>
    <JsonEditor value={value} onChange={onChange} ariaLabel={`${title} JSON`} />
  </Field></FieldGroup>
}

function ServerTabs({ state, title }: { state: ReturnType<typeof useDNSDialogState>; title: string }) {
  const object = state.object!
  const type = inferDNSServerType(object)
  const fieldProps = { object, type, revision: state.revision, onChange: state.update,
    onValidity: state.updateValidity, transform: state.transform }
  return <Tabs defaultValue="basic" className="min-h-0"><TabsList className="h-auto w-full justify-start overflow-x-auto" variant="line">
    <TabsTrigger value="basic">基础</TabsTrigger><TabsTrigger value="dialer">拨号与解析</TabsTrigger>
    <TabsTrigger value="tls">TLS 与 HTTP</TabsTrigger><TabsTrigger value="special">类型专属</TabsTrigger>
    <TabsTrigger value="advanced">高级 JSON</TabsTrigger></TabsList>
    <TabsContent value="basic" className="pt-4" keepMounted><FieldGroup className="gap-4">
      <ServerTypeField object={object} onChange={state.update} />
      <PolicyFormFields fields={tagField} object={object} namespace="policy.dns" revision={state.revision}
        onChange={state.update} onFieldValidityChange={state.updateValidity} transformField={state.transform} />
      <ServerFields {...fieldProps} section="basic" />
    </FieldGroup></TabsContent>
    <TabsContent value="dialer" className="pt-4" keepMounted><ServerFields {...fieldProps} section="dialer" /></TabsContent>
    <TabsContent value="tls" className="pt-4" keepMounted><ServerFields {...fieldProps} section="tls" /></TabsContent>
    <TabsContent value="special" className="pt-4" keepMounted><ServerFields {...fieldProps} section="special" /></TabsContent>
    <TabsContent value="advanced" className="pt-4" keepMounted><AdvancedJSON value={state.value} title={title} onChange={state.updateJSON} /></TabsContent>
  </Tabs>
}

export function DNSServerDialog({ open, item, title, onOpenChange, onSave }: DNSServerDialogProps) {
  const state = useDNSDialogState(item)
  const requiredValid = Boolean(state.object && requiredServerValues(state.object))
  const canSave = Boolean(requiredValid && state.invalidFields.size === 0)
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-5xl">
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>常用服务器字段可视化编辑，未知字段保留在高级 JSON 中。</DialogDescription></DialogHeader>
    <div className="min-h-0 overflow-y-auto pr-1"><div className="flex flex-col gap-4">
      {state.object && !requiredValid ? <Alert variant="destructive"><AlertTitle>缺少必填字段</AlertTitle>
        <AlertDescription>请填写当前服务器类型所需的 Tag 和地址信息。</AlertDescription></Alert> : null}
      {state.object ? <ServerTabs state={state} title={title} />
        : <AdvancedJSON value={state.value} title={title} onChange={state.updateJSON} />}
    </div></div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
      <Button disabled={!canSave} onClick={() => { if (state.object) onSave(state.object) }}>保存</Button></DialogFooter>
  </DialogContent></Dialog>
}
