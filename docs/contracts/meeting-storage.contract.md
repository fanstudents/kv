---
schema_version: behavior-contract/v1
id: kv.meeting.storage.compatibility
title: Meeting Start, Finish, and Recording Storage Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Meeting storage lifecycle parsing and orchestration from transport routes.
  non_goals:
    - Change meetings or meeting storage row formats.
    - Change Meeting UI, WebRTC, audio, or recording behavior.
    - Add migrations, retries, deduplication, or provider cutover.
---

# Meeting Start, Finish, and Recording Storage Compatibility

## Behavior Boundary

The rules modules coerce JSON, multipart, and query inputs. Application modules
own storage sequencing and response decisions through ports. Legacy adapters keep
the existing `meeting-store` helper calls. Routes only parse transport payloads
and map the existing HTTP responses.

## Invariants

1. start keeps a string title and passes `undefined` otherwise; a falsy legacy
   meeting ID maps to the existing 500 error `無法建立會議`.
2. finish rejects malformed multipart parsing with `需要 multipart/form-data`
   and an empty meeting ID with `缺少 meetingId` (400).
3. finish keeps transcript truthiness, numeric duration coercion, and audio
   extension selection (`mp4`, `ogg`, otherwise `webm`) unchanged.
4. Audio read/upload failure is non-blocking: finish still calls the legacy
   meeting update with `recordingPath: null` and returns `{ ok: true,
   recordingSaved: false }`.
5. finish passes finite duration values and the existing transcript/path fields
   to `finishMeeting`; a finish failure remains unhandled at this boundary.
6. recording rejects an empty query id with `缺少 id` (400), maps a missing
   signed URL to `找不到錄音檔` (404), and returns the signed URL unchanged.
7. No module changes meetings, meeting_turns, storage, or recording row/path
   formats, and no UI/browser contract changes.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/meeting-storage-rules.test.ts
    - tests/unit/meeting-storage-legacy-adapters.test.ts
    - tests/unit/meeting-storage-application.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the storage rules, ports, adapters, and applications only to
  their respective start, finish, and recording routes; helper callers remain
  visible in the legacy store.
- Full verification at `1dbfebb`: 46 Vitest files / 299 tests, 93-page
  production build, 130 Playwright smoke cases, and identical Chrome catalog
  DOM before/after.

## Intentional Changes

- Meeting storage lifecycle parsing and sequencing become Meeting-owned,
  unit-tested functions.
- `meeting-store` remains the compatibility implementation behind ports; no
  schema, storage bucket, or provider behavior is changed.
