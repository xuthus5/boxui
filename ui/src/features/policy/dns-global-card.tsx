import { useId } from "react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { PolicyFormFields } from "@/features/policy/policy-form-fields"
import { dnsGlobalFields, legacyFakeIPFields } from "@/features/policy/dns-form-model"
import { getPolicyPath, setPolicyPath } from "@/features/policy/policy-form-model"
import type { PolicyVisualEditorProps } from "@/features/policy/policy-page"

export function DNSGlobalCard(props: PolicyVisualEditorProps) {
  return <Card><CardHeader><CardTitle>DNS 全局设置</CardTitle>
    <CardDescription>管理缓存、解析策略与最终 DNS 服务器。</CardDescription></CardHeader>
    <CardContent><PolicyFormFields fields={dnsGlobalFields} object={props.object} namespace="policy.dns"
      revision={props.revision} onChange={props.onChange} onFieldValidityChange={props.onFieldValidityChange} /></CardContent>
    <CardFooter><p className="text-muted-foreground">未知全局字段会原样保留。</p></CardFooter>
  </Card>
}

export function DNSFakeIPCard(props: PolicyVisualEditorProps) {
  const id = useId()
  const enabled = getPolicyPath(props.object, "fakeip.enabled") === true
  const updateEnabled = (checked: boolean) => props.onChange(setPolicyPath(
    props.object,
    "fakeip.enabled",
    checked ? true : undefined,
  ))
  return <Card><CardHeader><CardTitle>旧式 FakeIP</CardTitle>
    <CardDescription>兼容顶层 fakeip 配置，不迁移到现代 DNS server。</CardDescription></CardHeader>
    <CardContent><FieldGroup className="gap-4"><Field orientation="horizontal">
      <FieldLabel htmlFor={id}>启用旧式 FakeIP</FieldLabel>
      <Switch id={id} aria-label="启用旧式 FakeIP" checked={enabled} onCheckedChange={updateEnabled} />
    </Field><PolicyFormFields fields={legacyFakeIPFields.slice(1)} object={props.object} namespace="policy.dns"
      revision={props.revision} onChange={props.onChange} onFieldValidityChange={props.onFieldValidityChange} />
    </FieldGroup></CardContent>
    <CardFooter><p className="text-muted-foreground">仅编辑已知字段，其他 fakeip 键保持不变。</p></CardFooter>
  </Card>
}
