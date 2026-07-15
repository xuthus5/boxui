import { type ChangeEvent, useEffect, useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { defaultPolicyFieldUpdate } from "@/features/policy/policy-field-update"
import { getPolicyPath, type JsonObject, type PolicyFieldSpec, type PolicyFieldTransform } from "@/features/policy/policy-form-model"
import type { JsonValue } from "@/lib/api/types"

interface TransformedPolicyFieldProps {
  field: PolicyFieldSpec
  label: string
  namespace: string
  object: JsonObject
  revision?: number
  value: JsonValue | undefined
  onChange: (object: JsonObject) => void
  onFieldValidityChange?: (path: string, valid: boolean) => void
  transformField: PolicyFieldTransform
}

function textValue(value: JsonValue | undefined): string {
  if (Array.isArray(value)) return value.map(String).join("\n")
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value)
  return ""
}

export function TransformedPolicyField(props: TransformedPolicyFieldProps) {
  const { field, label, namespace, object, revision = 0, value, onChange, onFieldValidityChange, transformField } = props
  const { t } = useTranslation()
  const id = useId()
  const serialized = textValue(value)
  const sourceKey = `${revision}:${serialized}`
  const [draft, setDraft] = useState({ raw: serialized, source: sourceKey, invalid: false })
  const callbackRef = useRef(onFieldValidityChange)
  useEffect(() => { callbackRef.current = onFieldValidityChange }, [onFieldValidityChange])
  useEffect(() => () => callbackRef.current?.(field.path, true), [field.path])
  const current = draft.source === sourceKey ? draft : { raw: serialized, source: sourceKey, invalid: false }
  const update = (raw: string) => {
    const transformed = transformField(object, field, raw)
    const next = transformed === undefined ? defaultPolicyFieldUpdate(object, field, raw) : transformed
    const invalid = next === null
    setDraft({ raw, source: invalid ? sourceKey : `${revision}:${textValue(getPolicyPath(next!, field.path))}`, invalid })
    callbackRef.current?.(field.path, !invalid)
    if (next) onChange(next)
  }
  const area = field.kind === "textarea" || field.kind === "list" || field.kind === "number-list"
  const controlProps = { id, "aria-label": label, "aria-invalid": current.invalid, required: field.required,
    value: current.raw, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(event.target.value) }
  return <Field data-invalid={current.invalid}><FieldLabel htmlFor={id}>{label}</FieldLabel>
    {area ? <Textarea {...controlProps} /> : <Input {...controlProps} type={field.kind === "number" ? "number" : "text"} />}
    {current.invalid ? <FieldDescription>{t(`${namespace}.invalidValue`)}</FieldDescription> : null}
  </Field>
}
