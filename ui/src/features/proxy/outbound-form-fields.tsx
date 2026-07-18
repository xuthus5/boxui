import { useCallback } from "react"

import { applyOutboundFieldChange, changeOutboundTransportType } from "@/features/proxy/outbound-form-model"
import type { FieldSpec, FormFieldContext, JsonObject } from "@/features/proxy/proxy-form-model"
import { ProxyFormFields } from "@/features/proxy/proxy-form-fields"

interface OutboundFormFieldsProps {
  fields: FieldSpec[]
  object: JsonObject
  type: string
  revision?: number
  context?: FormFieldContext
  onChange: (object: JsonObject) => void
  onFieldValidityChange?: (path: string, valid: boolean) => void
}

export function OutboundFormFields({ fields, object, type, revision, context, onChange, onFieldValidityChange }: OutboundFormFieldsProps) {
  const transformField = useCallback((current: JsonObject, field: FieldSpec, raw: string) => {
    if (field.path === "transport.type") return applyOutboundFieldChange(current, changeOutboundTransportType(current, raw), type)
    return undefined
  }, [type])
  return <ProxyFormFields
    fields={fields}
    object={object}
    namespace="proxy.outbound"
    revision={revision}
    context={context}
    onChange={(next) => onChange(applyOutboundFieldChange(object, next, type))}
    onFieldValidityChange={onFieldValidityChange}
    transformField={transformField}
  />
}
