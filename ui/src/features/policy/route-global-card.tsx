import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { PolicyFormFields } from "@/features/policy/policy-form-fields"
import type { PolicyVisualEditorProps } from "@/features/policy/policy-page"
import { routeGlobalFields } from "@/features/policy/route-form-model"

export function RouteGlobalCard({ object, revision, onChange, onFieldValidityChange }: PolicyVisualEditorProps) {
  return <Card>
    <CardHeader><CardTitle>全局路由设置</CardTitle><CardDescription>配置默认出站、解析器和网络回退行为。</CardDescription></CardHeader>
    <CardContent><PolicyFormFields fields={routeGlobalFields} object={object} namespace="policy.route"
      revision={revision} onChange={onChange} onFieldValidityChange={onFieldValidityChange} /></CardContent>
    <CardFooter><p className="text-muted-foreground">未展示的字段会保留在高级 JSON 中。</p></CardFooter>
  </Card>
}
