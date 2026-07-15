import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { changeTransportType, getPath, type FieldSpec, type JsonObject, setPath } from "@/features/proxy/inbound-form-model"
import type { JsonValue } from "@/lib/api/types"

interface InboundFormFieldsProps {
  fields: FieldSpec[]
  object: JsonObject
  type: string
  onChange: (object: JsonObject) => void
  onFieldValidityChange?: (path: string, valid: boolean) => void
}

function textValue(value: JsonValue | undefined) {
  if (Array.isArray(value)) return value.map(String).join("\n")
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : ""
}

function parseList(value: string) {
  const values = value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
  return values.length ? values : undefined
}

function BooleanField({ field, checked, onChange }: { field: FieldSpec; checked: boolean; onChange: (value: boolean) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const label = t(`proxy.inbound.${field.label}`)
  return <Field orientation="horizontal"><FieldLabel htmlFor={id}>{label}</FieldLabel><Switch id={id} aria-label={label} checked={checked} onCheckedChange={onChange} /></Field>
}

function SelectField({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const label = t(`proxy.inbound.${field.label}`)
  const options = useMemo(() => field.options?.filter(Boolean) ?? [], [field.options])
  const unset = "__unset__"
  const optionLabel = useCallback((option: string) => option === "true" ? t("proxy.inbound.enabled") : option === "false" ? t("proxy.inbound.disabled") : option, [t])
  const items = useMemo(() => [{ value: unset, label: t("proxy.inbound.notSet") }, ...options.map((option) => ({ value: option, label: optionLabel(option) }))], [optionLabel, options, t])
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><Select items={items} value={value || unset} onValueChange={(next) => onChange(next === unset ? "" : String(next))}><SelectTrigger id={id} aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value={unset}>{t("proxy.inbound.notSet")}</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{optionLabel(option)}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}

function TextField({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const label = t(`proxy.inbound.${field.label}`)
  const area = field.kind === "textarea" || field.kind === "list" || field.kind === "number-list" || field.kind === "users"
  const control = area
    ? <Textarea id={id} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
    : <Input id={id} aria-label={label} type={field.kind === "number" ? "number" : "text"} value={value} onChange={(event) => onChange(event.target.value)} />
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel>{control}</Field>
}

function JSONField({ field, value, array, onChange, onFieldValidityChange }: { field: FieldSpec; value: JsonValue | undefined; array: boolean; onChange: (value: JsonValue | undefined) => void; onFieldValidityChange?: (path: string, valid: boolean) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const label = t(`proxy.inbound.${field.label}`)
  const [raw, setRaw] = useState(() => value === undefined ? "" : JSON.stringify(value, null, 2))
  const [invalid, setInvalid] = useState(false)
  useEffect(() => () => onFieldValidityChange?.(field.path, true), [field.path, onFieldValidityChange])
  const update = (next: string) => {
    setRaw(next)
    if (!next.trim()) { setInvalid(false); onFieldValidityChange?.(field.path, true); onChange(undefined); return }
    try {
      const parsed: unknown = JSON.parse(next)
      const valid = array ? Array.isArray(parsed) && parsed.every((item) => item && typeof item === "object" && !Array.isArray(item)) : Boolean(parsed && typeof parsed === "object" && !Array.isArray(parsed))
      setInvalid(!valid)
      onFieldValidityChange?.(field.path, valid)
      if (valid) onChange(parsed as JsonValue)
    } catch { setInvalid(true); onFieldValidityChange?.(field.path, false) }
  }
  return <Field data-invalid={invalid}><FieldLabel htmlFor={id}>{label}</FieldLabel><Textarea id={id} aria-label={label} aria-invalid={invalid} value={raw} onChange={(event) => update(event.target.value)} /><FieldDescription>{invalid ? t("proxy.inbound.invalidStructuredJSON") : t(array ? "proxy.inbound.usersJSONHint" : "proxy.inbound.jsonObjectHint")}</FieldDescription></Field>
}

function fieldUpdate(object: JsonObject, field: FieldSpec, raw: string): JsonObject | null {
  if (field.kind === "list") return setPath(object, field.path, parseList(raw))
  if (field.kind === "number-list") {
    const values = parseList(raw)
    if (!values) return setPath(object, field.path, undefined)
    const numbers = values.map(Number)
    return numbers.every(Number.isFinite) ? setPath(object, field.path, numbers) : null
  }
  if (field.kind === "number") return setPath(object, field.path, raw === "" ? undefined : Number(raw))
  if (field.path === "udp_fragment") return setPath(object, field.path, raw === "" ? undefined : raw === "true")
  return setPath(object, field.path, raw || undefined)
}

function InboundField({ field, object, onChange, onFieldValidityChange }: Omit<InboundFormFieldsProps, "fields"> & { field: FieldSpec }) {
  const value = getPath(object, field.path)
  if (field.kind === "boolean") return <BooleanField field={field} checked={value === true} onChange={(checked) => onChange(setPath(object, field.path, checked || undefined))} />
  if (field.kind === "select") return <SelectField field={field} value={textValue(value)} onChange={(next) => { const updated = field.path === "transport.type" ? changeTransportType(object, next) : fieldUpdate(object, field, next); if (updated) onChange(updated) }} />
  if (field.kind === "users" || field.kind === "json-object") return <JSONField field={field} value={value} array={field.kind === "users"} onChange={(next) => onChange(setPath(object, field.path, next))} onFieldValidityChange={onFieldValidityChange} />
  return <TextField field={field} value={textValue(value)} onChange={(raw) => { const updated = fieldUpdate(object, field, raw); if (updated) onChange(updated) }} />
}

export function InboundFormFields({ fields, object, type, onChange, onFieldValidityChange }: InboundFormFieldsProps) {
  return <FieldGroup className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <InboundField key={field.path} field={field} object={object} type={type} onChange={onChange} onFieldValidityChange={onFieldValidityChange} />)}</FieldGroup>
}
