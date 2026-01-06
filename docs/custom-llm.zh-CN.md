# 自定义 LLM（OpenAI-compatible）接入说明

Easy LLM CLI 是 Gemini CLI 的 Fork：整体保留了 Gemini CLI 的交互 UI、工具系统（tools）、工具调度与执行链路，但新增了一套 **自定义 LLM 后端**，用于对接任何 **兼容 OpenAI Chat Completions** 的 API。

## 快速配置（CLI）

在环境变量或项目根目录的 `.env` 中配置：

```bash
export USE_CUSTOM_LLM=true
export CUSTOM_LLM_API_KEY="YOUR_KEY"
export CUSTOM_LLM_ENDPOINT="https://api.your-provider.com/v1"
export CUSTOM_LLM_MODEL_NAME="your-model-name"

# 可选（影响请求参数 / 界面展示）
export CUSTOM_LLM_PROVIDER="your-provider-name"
export CUSTOM_LLM_TEMPERATURE=0
export CUSTOM_LLM_TOP_P=1
export CUSTOM_LLM_MAX_TOKENS=8192
```

然后直接运行 `elc`。

## “OpenAI-compatible” 在这里具体指什么

自定义后端使用 Node 的 `openai` SDK，请求 `chat.completions`：

- `baseURL = CUSTOM_LLM_ENDPOINT`
- `apiKey = CUSTOM_LLM_API_KEY`
- `model = CUSTOM_LLM_MODEL_NAME`
- 交互模式：`stream=true`
- 工具调用：`tools=[...]`

代码入口：

- `packages/core/src/core/contentGenerator.ts`（新增 `AuthType.CUSTOM_LLM_API`）
- `packages/core/src/custom_llm/index.ts`（OpenAI 客户端与请求）
- `packages/core/src/custom_llm/converter.ts`（Gemini ↔ OpenAI 格式转换）

## 工具调用（很关键）

Easy LLM CLI 内部的工具调用沿用 “Gemini 风格 function call”。当 `USE_CUSTOM_LLM=true` 时，会把工具声明转换成 OpenAI `tools` 并发送给模型，因此你的模型/服务端必须支持 tool calling（function calling）。

如果模型不支持 tool calling，CLI 仍然可以聊天，但可能无法触发工具执行，或工具调用经常失败。

## JSON 模式 / 严格 JSON 输出

CLI 内部某些流程需要模型 **只输出 JSON**（例如 `generateJson()`）。

当 `responseMimeType=application/json` 时，自定义后端会带上 OpenAI `response_format: { type: "json_object" }`，并对返回文本做 JSON 解析。

为了兼容第三方模型常见的“非纯 JSON”输出，解析器还会尝试从以下内容中提取 JSON：

- ` ```json ... ``` ` 代码块
- `<think>...</think>` / `<thinking>...</thinking>` 包裹的输出

相关代码：`packages/core/src/custom_llm/util.ts`、`packages/core/src/core/client.ts`。

## 多模态（图片）

当输入里包含 inline image part 时，会转换成 OpenAI `image_url`（`data:<mime>;base64,<data>`）。

相关代码：`packages/core/src/custom_llm/converter.ts`（`processImageParts`）。

## 对比上游 Gemini CLI：ELC 为适配其他 API 改了什么（概览）

- 增加 `AuthType.CUSTOM_LLM_API` 与 `USE_CUSTOM_LLM`/`CUSTOM_LLM_*` 环境变量，用于切换到自定义 LLM 后端。
- 新增 OpenAI-compatible 的内容生成器 + Gemini/OpenAI 双向格式转换层，保证上层工具调度逻辑不改也能跑。
- 新增“尽力而为”的 JSON 提取（`extractJsonFromLLMOutput`），提升第三方模型在 JSON 场景的兼容性。
- 新增“尽力而为”的工具调用纠错：对异常的 tool name / args 做归一化与补全，减少 `Tool ... not found in registry` 这类报错（例如 `run_shell_command_command`、以及带 XML-ish 包裹的工具名）。
- 自定义 LLM 模式下，`next_speaker` 判定改为启发式规则，避免额外再发一轮“必须严格 JSON”的模型请求（第三方 endpoint 上往往不稳定/容易空响应）。

关键文件：

- `packages/core/src/custom_llm/*`
- `packages/core/src/core/turn.ts`
- `packages/core/src/utils/nextSpeakerChecker.ts`

