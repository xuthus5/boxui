import { setPolicyPath, type JsonObject, type PolicyFieldSpec } from "@/features/policy/policy-form-model"

function parseList(raw: string): string[] | undefined {
  const values = raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return values.length > 0 ? values : undefined
}

export function defaultPolicyFieldUpdate(
  object: JsonObject,
  field: PolicyFieldSpec,
  raw: string,
): JsonObject | null {
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
