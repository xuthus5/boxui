import { useCallback, useEffect, useId, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  getPolicyPath,
  isJsonObject,
  setPolicyPath,
  type JsonObject,
  type PolicyFieldSpec,
  type PolicyFieldTransform,
} from "@/features/policy/policy-form-model"
import type { JsonValue } from "@/lib/api/types"

export interface PolicyFormFieldsProps {
  fields: readonly PolicyFieldSpec[]
  object: JsonObject
  namespace: string
  revision?: number
  onChange: (object: JsonObject) => void
  onFieldValidityChange?: (path: string, valid: boolean) => void
  transformField?: PolicyFieldTransform
}

function textValue(value: JsonValue | undefined): string {
  if (Array.isArray(value)) return value.map(String).join("\n")
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : ""
}

function parseList(raw: string): string[] | undefined {
  const values = raw.split(/[\n,]/).map((item) => item.trim()).filter(Boolean)
  return values.length > 0 ? values : undefined
}

function BooleanField({ field, label, checked, onChange }: { field: PolicyFieldSpec; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  const id = useId()
  return <Field orientation="horizontal"><FieldLabel htmlFor={id}>{label}</FieldLabel><Switch id={id} aria-label={label} required={field.required} checked={checked} onCheckedChange={onChange} /></Field>
}

function SelectField({ field, label, namespace, value, onChange }: { field: PolicyFieldSpec; label: string; namespace: string; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const unset = "__unset__"
  const optionsKey = JSON.stringify(field.options?.filter(Boolean) ?? [])
  const options = useMemo(() => JSON.parse(optionsKey) as string[], [optionsKey])
  const values = useMemo(() => value && !options.includes(value) ? [value, ...options] : options, [options, value])
  const items = useMemo(() => [{ value: unset, label: t(`${namespace}.notSet`) }, ...values.map((option) => ({ value: option, label: option }))], [namespace, t, values])
  const update = useCallback((next: string | null) => onChange(next === unset || next === null ? "" : String(next)), [onChange])
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel><Select items={items} value={value || unset} required={field.required} onValueChange={update}><SelectTrigger id={id} aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value={unset}>{t(`${namespace}.notSet`)}</SelectItem>{values.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
}

function TextField({ field, label, value, onChange }: { field: PolicyFieldSpec; label: string; value: string; onChange: (value: string) => void }) {
  const id = useId()
  const area = field.kind === "textarea" || field.kind === "list" || field.kind === "number-list"
  const control = area
    ? <Textarea id={id} aria-label={label} required={field.required} value={value} onChange={(event) => onChange(event.target.value)} />
    : <Input id={id} aria-label={label} required={field.required} type={field.kind === "number" ? "number" : "text"} value={value} onChange={(event) => onChange(event.target.value)} />
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel>{control}</Field>
}

function StructuredField({ field, label, namespace, revision = 0, value, array, onChange, onFieldValidityChange }: { field: PolicyFieldSpec; label: string; namespace: string; revision?: number; value: JsonValue | undefined; array: boolean; onChange: (value: JsonValue | undefined) => void; onFieldValidityChange?: (path: string, valid: boolean) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const serialized = value === undefined ? "" : JSON.stringify(value, null, 2)
  const sourceKey = `${revision}:${serialized}`
  const [raw, setRaw] = useState(serialized)
  const [source, setSource] = useState(sourceKey)
  const [invalid, setInvalid] = useState(false)
  if (source !== sourceKey) { setSource(sourceKey); setRaw(serialized); setInvalid(false) }
  useEffect(() => { onFieldValidityChange?.(field.path, true); return () => onFieldValidityChange?.(field.path, true) }, [field.path, onFieldValidityChange, sourceKey])
  const update = (next: string) => {
    setRaw(next)
    if (!next.trim()) { setSource(`${revision}:`); setInvalid(false); onFieldValidityChange?.(field.path, true); onChange(undefined); return }
    try {
      const parsed: unknown = JSON.parse(next)
      const valid = array ? Array.isArray(parsed) : isJsonObject(parsed as JsonValue)
      setInvalid(!valid)
      onFieldValidityChange?.(field.path, valid)
      if (valid) { setSource(`${revision}:${JSON.stringify(parsed, null, 2)}`); onChange(parsed as JsonValue) }
    } catch (error) {
      void error
      setInvalid(true)
      onFieldValidityChange?.(field.path, false)
    }
  }
  return <Field data-invalid={invalid}><FieldLabel htmlFor={id}>{label}</FieldLabel><Textarea id={id} aria-label={label} aria-invalid={invalid} required={field.required} value={raw} onChange={(event) => update(event.target.value)} /><FieldDescription>{invalid ? t(`${namespace}.invalidStructuredJSON`) : t(`${namespace}.${array ? "jsonArrayHint" : "jsonObjectHint"}`)}</FieldDescription></Field>
}

function defaultUpdate(object: JsonObject, field: PolicyFieldSpec, raw: string): JsonObject | null {
  if (field.kind === "list") return setPolicyPath(object, field.path, parseList(raw))
  if (field.kind === "number-list") {
    const values = parseList(raw)
    if (!values) return setPolicyPath(object, field.path, undefined)
    const numbers = values.map(Number)
    return numbers.every(Number.isFinite) ? setPolicyPath(object, field.path, numbers) : null
  }
  if (field.kind === "number") {
    if (raw === "") return setPolicyPath(object, field.path, undefined)
    const number = Number(raw)
    return Number.isFinite(number) ? setPolicyPath(object, field.path, number) : null
  }
  return setPolicyPath(object, field.path, raw || undefined)
}

function PolicyField({ field, object, namespace, revision, onChange, onFieldValidityChange, transformField }: Omit<PolicyFormFieldsProps, "fields"> & { field: PolicyFieldSpec }) {
  const { t } = useTranslation()
  const value = getPolicyPath(object, field.path)
  const label = t(`${namespace}.${field.label}`)
  const update = (raw: string) => {
    const transformed = transformField?.(object, field, raw)
    const next = transformed === undefined ? defaultUpdate(object, field, raw) : transformed
    if (next) onChange(next)
  }
  if (field.kind === "boolean") return <BooleanField field={field} label={label} checked={value === true} onChange={(checked) => onChange(setPolicyPath(object, field.path, checked || undefined))} />
  if (field.kind === "select") return <SelectField field={field} label={label} namespace={namespace} value={textValue(value)} onChange={update} />
  if (field.kind === "json-object" || field.kind === "json-array") return <StructuredField field={field} label={label} namespace={namespace} revision={revision} value={value} array={field.kind === "json-array"} onChange={(next) => onChange(setPolicyPath(object, field.path, next))} onFieldValidityChange={onFieldValidityChange} />
  return <TextField field={field} label={label} value={textValue(value)} onChange={update} />
}

export function PolicyFormFields({ fields, ...props }: PolicyFormFieldsProps) {
  return <FieldGroup className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <PolicyField key={field.path} field={field} {...props} />)}</FieldGroup>
}
