# Custom LLM (OpenAI-compatible) providers

Easy LLM CLI is a fork of Gemini CLI. It keeps Gemini CLI’s UI/tooling pipeline, but adds a “custom LLM” backend that can talk to any API that is **compatible with OpenAI Chat Completions**.

## Quickstart (CLI)

Set the following environment variables (or put them in a `.env` file in your project):

```bash
export USE_CUSTOM_LLM=true
export CUSTOM_LLM_API_KEY="YOUR_KEY"
export CUSTOM_LLM_ENDPOINT="https://api.your-provider.com/v1"
export CUSTOM_LLM_MODEL_NAME="your-model-name"

# Optional (affects requests / display)
export CUSTOM_LLM_PROVIDER="your-provider-name"
export CUSTOM_LLM_TEMPERATURE=0
export CUSTOM_LLM_TOP_P=1
export CUSTOM_LLM_MAX_TOKENS=8192
```

Then run `elc`.

## What “OpenAI-compatible” means here

The custom backend uses the Node `openai` SDK and calls `chat.completions` with:

- `baseURL = CUSTOM_LLM_ENDPOINT`
- `apiKey = CUSTOM_LLM_API_KEY`
- `model = CUSTOM_LLM_MODEL_NAME`
- `stream = true` (for interactive) and `tools = [...]` (for tool calling)

Implementation entry points:

- `packages/core/src/core/contentGenerator.ts` (adds `AuthType.CUSTOM_LLM_API`)
- `packages/core/src/custom_llm/index.ts` (OpenAI client + request)
- `packages/core/src/custom_llm/converter.ts` (Gemini ↔ OpenAI format conversion)

## Tool calling support (important)

Easy LLM CLI internally uses “Gemini-style function calls”. When `USE_CUSTOM_LLM=true`, it converts tool declarations into OpenAI `tools` and expects the model/provider to support tool calling.

If your model does not support tool calling, the CLI can still chat, but tool execution may fail or never be triggered.

## JSON mode / strict JSON responses

Some internal features require JSON-only responses (e.g. `generateJson()`).

When `responseMimeType` is `application/json`, the custom backend sends OpenAI `response_format: { type: "json_object" }` and then parses the returned text.

The parser also tries to recover JSON from:

- ` ```json ... ``` ` blocks
- outputs wrapped with `<think>...</think>` or `<thinking>...</thinking>`

Code: `packages/core/src/custom_llm/util.ts` and `packages/core/src/core/client.ts`.

## Multimodal (images)

Inline image parts are converted into an OpenAI `image_url` content item using a `data:<mime>;base64,<data>` URL.

Code: `packages/core/src/custom_llm/converter.ts` (see `processImageParts`).

## What changed vs upstream Gemini CLI (high level)

- Added `AuthType.CUSTOM_LLM_API` and `USE_CUSTOM_LLM`/`CUSTOM_LLM_*` env config to switch the backend.
- Added an OpenAI-compatible content generator and Gemini/OpenAI format converter.
- Added robust JSON extraction for non-Gemini models (`extractJsonFromLLMOutput`).
- Added best-effort normalization for malformed tool call names/arguments (e.g. `run_shell_command_command`, XML-ish tool-call wrappers), to reduce “Tool not found in registry” failures.
- Added a heuristic “next speaker” checker for custom LLM mode, avoiding extra JSON-only model calls that are often unstable on third-party endpoints.

Key files:

- `packages/core/src/custom_llm/*`
- `packages/core/src/core/turn.ts`
- `packages/core/src/utils/nextSpeakerChecker.ts`

