# Node Card Page Implementation Plan

> **For agentic workers:** Execute inline with `executing-plans`; each behavior follows TDD, but create one final commit because this repository deploys after every commit.

**Goal:** Rewrite node and subscription management as responsive shadcn card layouts with per-node TCP/HTTP/ICMP testing and hidden automatic configuration synchronization.

**Architecture:** Fetch nodes and persisted test results once on the node page, derive the complete list, subscription groups, and imported-node list, then render the same reusable `NodeCard` in each requested region. Move import/edit/delete management to the subscriptions page and chain the existing sync API after mutations without exposing a sync control.

**Tech Stack:** React 19, TypeScript, TanStack Query, react-i18next, shadcn Base UI, Tailwind CSS v4, Vitest, Testing Library, Playwright.

## Global Constraints

- Do not modify backend code or API contracts.
- Use existing shadcn components and semantic tokens; do not add global styles or dependencies.
- Mobile is one column, tablet two columns, and wide screens three columns where space permits.
- Keep functions at most 50 lines, files at most 300 lines, nesting at most 3, parameters at most 3, and complexity at most 10.
- Maintain all four frontend coverage metrics at or above 90%.
- Create one final Git commit, then build and deploy to `/usr/local/bin/boxd` and restart `boxd.service`.

---

### Task 1: Specify node grouping and card testing

**Files:**
- Modify: `ui/src/features/nodes/nodes-page.test.tsx`
- Modify: `ui/src/features/nodes/nodes-workflows.test.tsx`

**Interfaces:**
- Consumes: `GET /api/nodes/`, `GET /api/nodes/test-results`, `POST /api/nodes/test`, `POST /api/nodes/test-batch`.
- Produces: regression coverage for duplicated regions, inline results, and four per-node test actions.

- [ ] Add a failing test that supplies one imported node and nodes from two `source_name` values, then asserts the imported node appears in “所有节点” and “手动导入节点”, while subscription nodes appear in “所有节点” and their named subscription group.
- [ ] Add a failing test that opens one node card's test controls and verifies “全部、TCP、HTTP、ICMP” are available without page-level test controls.
- [ ] Add a failing test that clicks “全部” and expects `/api/nodes/test-batch` to receive three entries for the same tag:

```ts
expect(JSON.parse(String(init?.body))).toEqual({
  items: [
    { tag: "hk-01", test_type: "tcp", server: "example.com", port: 443 },
    { tag: "hk-01", test_type: "http", server: "example.com", port: 443 },
    { tag: "hk-01", test_type: "icmp", server: "example.com", port: 443 },
  ],
  concurrency: 3,
})
```

- [ ] Run `npm run test -- src/features/nodes/nodes-page.test.tsx src/features/nodes/nodes-workflows.test.tsx --run` and confirm the new assertions fail because the card UI is absent.

### Task 2: Build reusable node cards and rewrite the node page

**Files:**
- Create: `ui/src/features/nodes/node-card.tsx`
- Create: `ui/src/features/nodes/node-section.tsx`
- Modify: `ui/src/features/nodes/nodes-page.tsx`
- Modify: `ui/src/features/nodes/runtime-groups-card.tsx`
- Modify: `ui/src/i18n/locales/en.ts`
- Modify: `ui/src/i18n/locales/zh.ts`

**Interfaces:**
- Produces: `NodeCard({ node, results }: { node: Outbound; results?: Record<string, TestResult> })`.
- Produces: `NodeSection({ title, description, nodes, results }: NodeSectionProps)`.
- Consumes: one shared results query keyed by `["nodes", "results"]` so duplicated cards refresh together.

- [ ] Implement `NodeCard` with shadcn `Card`, `Badge`, `Collapsible`, and `Button`. Its test request builder must return `null` when server or port is missing:

```ts
function testInput(node: Outbound, type: TestType) {
  if (!node.server || !node.port) return null
  return { tag: node.tag, test_type: type, server: node.server, port: node.port }
}
```

- [ ] Use a collapsed “测速” button followed by a two-column action grid containing “全部、TCP、HTTP、ICMP”. “全部” calls `api.nodes.testBatch(inputs, 3)`; a single type calls `api.nodes.test(input)`.
- [ ] Render three inline result rows in every card. Show latency for success, the returned error for failure, and `—` when no persisted result exists.
- [ ] Derive subscription groups with `Map<string, Outbound[]>`, render all nodes once, each subscription group once, and all imported nodes once. Do not render import, sync, edit, or delete controls on this page.
- [ ] Replace runtime-group tables with responsive cards while retaining selector and URLTest controls.
- [ ] Run the Task 1 tests and confirm they pass.

### Task 3: Move imported-node management to subscriptions

**Files:**
- Create: `ui/src/features/nodes/node-import-dialog.tsx`
- Create: `ui/src/features/subscriptions/imported-nodes-card.tsx`
- Modify: `ui/src/features/subscriptions/subscriptions-page.tsx`
- Modify: `ui/src/features/nodes/node-editor-dialog.tsx`
- Modify: `ui/src/features/nodes/node-subscription-interactions.test.tsx`
- Modify: `ui/src/features/nodes/nodes-workflows.test.tsx`

**Interfaces:**
- Produces: subscription-page controls for importing, editing, and deleting `source === "import"` nodes.
- Consumes: hidden `api.nodes.sync()` after management mutations; no sync button is rendered.

- [ ] Add failing tests proving the node page has no import or sync button, the subscriptions page has “导入节点”, and imported-node delete calls both `DELETE /api/nodes/{tag}` and `POST /api/nodes/sync-config`.
- [ ] Move the existing parse/save import dialog into `node-import-dialog.tsx`; after save, call `api.nodes.sync()` before closing so synchronization errors reach the user.
- [ ] Add `ImportedNodesCard` to the subscriptions page with responsive imported-node cards and edit/delete actions.
- [ ] Chain `api.nodes.sync()` after subscription create, update, delete, refresh, and refresh-all operations. Keep the endpoint internal to the workflow and remove every visible sync action.
- [ ] Chain `api.nodes.sync()` after node update in `NodeEditorDialog`.
- [ ] Run the affected subscription and node workflow tests and confirm they pass.

### Task 4: Verify mobile behavior

**Files:**
- Modify: `ui/e2e/app.spec.ts`

**Interfaces:**
- Produces: a 390×844 browser regression test for node and subscription layouts.

- [ ] Add node, result, group, and subscription fixtures to the existing Playwright API mock.
- [ ] Add a mobile test using `page.setViewportSize({ width: 390, height: 844 })` that visits both pages and asserts:

```ts
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
expect(overflow).toBe(0)
```

- [ ] Verify a node test panel opens, inline TCP/HTTP/ICMP results are visible, and imported-node management is present only on the subscriptions page.

### Task 5: Complete quality gates, commit, and deploy

**Files:**
- Review all files changed by Tasks 1–4.

- [ ] Run the targeted Vitest files.
- [ ] Run `cd ui && npm run check` and confirm all coverage metrics remain at least 90%.
- [ ] Run `cd ui && npm run e2e`.
- [ ] Run the repository hard-limit ESLint command for file length, function length, depth, parameters, and complexity.
- [ ] Run `git diff --check`, confirm no backend or global-style files changed, and remove generated `coverage`, `dist`, Playwright reports, and embedded UI copies.
- [ ] Commit only task files with `feat(nodes): redesign node cards`.
- [ ] Run `make build`, install the binary as `root:boxd` mode `0750`, restart `boxd.service`, and verify active state, process hash, version, HTTP 200, and current invocation logs.
