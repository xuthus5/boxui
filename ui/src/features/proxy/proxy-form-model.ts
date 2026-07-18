import type { JsonValue } from "@/lib/api/types"

export type JsonObject = Record<string, JsonValue>
export type FieldKind = "text" | "textarea" | "number" | "boolean" | "list" | "number-list" | "select" | "json-object" | "users" | "listen-address" | "network-interface"

export interface FieldWhen {
  path: string
  /** Match exact value or any value in the list. */
  is?: JsonValue | readonly JsonValue[]
  /** Match when the path value is undefined / null / false / "". */
  falsy?: boolean
}

export interface FieldSpec {
  path: string
  label: string
  kind?: FieldKind
  options?: string[]
  when?: FieldWhen | FieldWhen[]
}

export type FieldTransform = (object: JsonObject, field: FieldSpec, raw: string) => JsonObject | null | undefined

export function getPath(object: JsonObject, path: string): JsonValue | undefined {
  return path.split(".").reduce<JsonValue | undefined>((value, key) => (
    value && typeof value === "object" && !Array.isArray(value) ? value[key] : undefined
  ), object)
}

export function setPath(object: JsonObject, path: string, value: JsonValue | undefined): JsonObject {
  const keys = path.split(".")
  const update = (source: JsonObject, index: number): JsonObject => {
    const next = { ...source }
    const key = keys[index]
    if (index === keys.length - 1) {
      if (value === undefined) delete next[key]
      else next[key] = value
    } else {
      const child = next[key]
      const updated = update(child && typeof child === "object" && !Array.isArray(child) ? child as JsonObject : {}, index + 1)
      if (Object.keys(updated).length) next[key] = updated
      else delete next[key]
    }
    return next
  }
  return update(object, 0)
}

function isFalsy(value: JsonValue | undefined) {
  return value === undefined || value === null || value === false || value === "" || (Array.isArray(value) && value.length === 0)
}

function matchesWhen(object: JsonObject, rule: FieldWhen) {
  const value = getPath(object, rule.path)
  if (rule.falsy) return isFalsy(value)
  if (rule.is !== undefined) {
    const allowed = Array.isArray(rule.is) ? rule.is : [rule.is]
    return allowed.some((item) => Object.is(item, value))
  }
  return !isFalsy(value)
}

export function isFieldVisible(object: JsonObject, field: FieldSpec) {
  if (!field.when) return true
  const rules = Array.isArray(field.when) ? field.when : [field.when]
  return rules.every((rule) => matchesWhen(object, rule))
}

export function visibleFields(fields: FieldSpec[], object: JsonObject) {
  return fields.filter((field) => isFieldVisible(object, field))
}

/** Remove values for fields that are currently hidden by `when` rules. */
export function pruneInvisibleFields(object: JsonObject, fields: FieldSpec[]) {
  let next = object
  let changed = true
  while (changed) {
    changed = false
    for (const field of fields) {
      if (isFieldVisible(next, field)) continue
      if (getPath(next, field.path) === undefined) continue
      next = setPath(next, field.path, undefined)
      changed = true
    }
  }
  return next
}
