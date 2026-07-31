---
schema_version: behavior-contract/v1
id: kv.visit.ai-boundaries.compatibility
title: Visit AI Boundaries Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Visit draft-email and business-card AI request mapping, provider calls, and activity side effects from their routes.
  non_goals:
    - Change Visit provider payloads, AI prompts, activity vocabulary, response envelopes, or Visit UI.
    - Change line_agent_activity row shape or introduce provider/schema migration.
    - Change the existing Visit workflow graph or respond/research routes.
---

# Visit AI Boundaries Compatibility

## Behavior Boundary

The rules module owns the existing draft-email and card-image input mapping.
The application module owns provider invocation and success/failure activity
ordering. The legacy adapter keeps the existing `legacyVisitProviders` port
and `line_agent_activity` writes behind a provider-neutral interface. Routes
retain JSON parsing and HTTP response mapping.

## Invariants

1. Draft-email trims `contactName`, defaults missing string fields to empty
   values, defaults `meetingType` to `喝咖啡`, requires a name and both slots,
   and returns the existing 400 messages `缺少收件人姓名`／`缺少建議時段`.
2. Card parsing accepts only a string beginning with `data:image/`; otherwise
   it returns HTTP 400 with `缺少有效的名片圖片`.
3. Draft-email still calls `legacyVisitProviders.draftInviteEmail` with the
   normalized fields and returns `{ draft }` unchanged on success.
4. Card parsing still calls `legacyVisitProviders.parseBusinessCard` with the
   original data URL and returns `{ contact }` unchanged on success.
5. Draft success records `已用 AI 產生邀約信草稿給 {contactName}`; failures
   record `AI 產生邀約信失敗：{message}` and return HTTP 502.
6. Card success records `已辨識名片：{name-or-fallback}{ / company}`; failures
   record `名片辨識失敗：{message}` and return HTTP 502. Non-Error failures
   retain `邀約信生成失敗`／`名片辨識失敗` fallbacks.
7. Existing Visit provider data, activity rows, API access behavior, schema
   assumptions, and UI behavior remain unchanged.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/visit-ai-rules.test.ts
    - tests/unit/visit-ai-application.test.ts
    - tests/unit/visit-ai-legacy-adapter.test.ts
    - tests/unit/platform-import-boundaries.test.ts
    - tests/unit/visit-legacy-provider-adapter.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps `parseDraftInviteEmailRequest`／`runDraftInviteEmail` to the
  draft route and `parseBusinessCardRequest`／`runParseBusinessCard` to the
  card route; `createLegacyVisitAiAdapter` is the only provider/activity owner.
- Full verification at `381f0b7`: 164 Vitest files / 508 tests, 93-page
  production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  Visit AI boundaries; the normalized DOM snapshot was unchanged.

## Intentional Changes

- Visit AI request mapping, provider orchestration, activity mapping, and
  provider access are now independently testable and replaceable.
- Existing prompts/provider bindings, response data, activity wording/status,
  persistence assumptions, and UI behavior remain unchanged.
