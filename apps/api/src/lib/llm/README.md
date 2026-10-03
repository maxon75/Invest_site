# Groq LLM provider

`GroqProvider` implements the app's `LLMProvider.complete(messages, options)` contract using Groq's OpenAI-compatible Chat Completions API. It uses native `fetch`, so it does not add a provider-specific SDK dependency. It returns assistant text and throws `GroqProviderError` for network, API, malformed-response, or quota errors. For HTTP 429, `status` and `retryAfter` are available to the calling service; the provider does not silently retry an analysis.

Configure these variables in the **server-side** `apps/api/.env.local` (never in Vite `VITE_*` variables):

```dotenv
GROQ_API_KEY=replace-with-server-secret
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_MODEL=openai/gpt-oss-20b
```

`GROQ_BASE_URL` and `GROQ_MODEL` are optional at runtime and have the values above as defaults. Obtain the API key from Groq Console and keep it out of source control and browser bundles. The model ID is currently listed in Groq's supported models and free-plan rate-limit documentation; free quotas are subject to account/model limits and can change.

Usage:

```ts
const llm = createGroqProvider();
const text = await llm.complete([
  { role: "system", content: "Follow the thesis impact analysis instructions." },
  { role: "user", content: renderedPrompt },
], { temperature: 0.1, maxTokens: 1200 });
```

The feature pipeline remains responsible for loading `prompts/thesis-impact.md`, rendering placeholders, parsing and validating the model output, and deciding whether to retry or surface quota errors.
