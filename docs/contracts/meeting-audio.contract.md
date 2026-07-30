---
schema_version: behavior-contract/v1
id: kv.meeting.audio.compatibility
title: Meeting Speak and Transcribe Compatibility
status: active
owner_surface: api
change_context:
  type: refactor
  reason: Separate Meeting audio request coercion and provider orchestration from transport routes.
  non_goals:
    - Change Meeting UI, WebRTC, recording, or audio playback behavior.
    - Change the existing OpenAI helper payloads or provider response formats.
    - Add provider cutover, streaming, retries, migrations, or real provider calls.
---

# Meeting Speak and Transcribe Compatibility

## Behavior Boundary

The rules modules own the existing JSON and multipart coercion. Application
modules own validation and provider failure mapping through provider-neutral
ports. Legacy adapters keep the existing `synthesizeSpeech` and
`transcribeAudio` helper calls. Routes only parse transport payloads and map
the existing HTTP responses.

## Invariants

1. speak treats malformed JSON as an empty object, trims string text, keeps a
   string voice, and preserves the existing `alloy`, instructions, and `1.2`
   defaults.
2. speak rejects empty text with `缺少文字內容` (400), returns the provider's
   `ArrayBuffer` unchanged with `audio/mpeg` and `no-store`, and maps provider
   failures to the existing message and 502 response.
3. transcribe keeps the existing multipart parse failure response
   `需要 multipart/form-data` (400), accepts only an audio value exposing
   `arrayBuffer`, and maps a truthy `promptHint` with the existing string
   coercion.
4. transcribe rejects a missing or invalid audio value with `缺少音訊檔案`
   (400), returns `{ text }` unchanged, and maps provider failures to the
   existing message and 502 response.
5. No module changes the Meeting UI, WebRTC, recording, OpenAI helper payloads,
   provider response formats, or database/schema formats.

## Test Mapping

```yaml
test_mapping:
  unit:
    - tests/unit/meeting-audio-rules.test.ts
    - tests/unit/meeting-audio-legacy-adapters.test.ts
    - tests/unit/meeting-audio-application.test.ts
    - tests/unit/platform-import-boundaries.test.ts
  browser:
    - tests/e2e/api-access.spec.ts
    - tests/e2e/protected-surfaces.spec.ts
    - tests/e2e/public-surfaces.spec.ts
  manual:
    - Chrome before/after check of the Agent catalog count and tier labels.
```

## Evidence

- CodeGraph maps the audio rules, ports, adapters, applications, and routes as
  a single Meeting boundary; the legacy OpenAI helpers remain behind adapters.
- Full verification at `508d0b9` plus this checkpoint: 49 Vitest files / 311
  tests, 93-page production build, and 130 Playwright smoke cases passed.
- Chrome retained the Agent catalog count and tier labels before and after the
  application cutover; only transient Next.js development-tool nodes differed
  on reload.

## Intentional Changes

- Meeting audio request coercion and provider failure mapping become
  Meeting-owned, unit-tested functions.
- `src/lib/openai.ts` remains the compatibility implementation behind ports;
  no helper arguments, provider format, UI behavior, or schema is changed.
