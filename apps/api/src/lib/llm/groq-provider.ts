export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CompletionOptions = {
  temperature?: number;
  maxTokens?: number;
};

export interface LLMProvider {
  complete(
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<string>;
}

export type GroqProviderConfig = {
  apiKey: string;
  baseURL?: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

export class GroqProviderError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryAfter?: string,
  ) {
    super(message);
    this.name = "GroqProviderError";
  }
}

/** OpenAI-compatible Groq chat-completions adapter. Keep instances server-side. */
export class GroqProvider implements LLMProvider {
  private readonly baseURL: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: GroqProviderConfig) {
    if (!config.apiKey) {
      throw new GroqProviderError("GROQ_API_KEY is required to use the Groq provider.");
    }
    this.baseURL = (config.baseURL ?? "https://api.groq.com/openai/v1").replace(/\/+$/, "");
    this.model = config.model ?? "openai/gpt-oss-20b";
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    if (!messages.length) throw new GroqProviderError("At least one chat message is required.");

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
          ...(options.maxTokens !== undefined ? { max_completion_tokens: options.maxTokens } : {}),
        }),
      });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : "Network request failed";
      throw new GroqProviderError(`Could not reach Groq API: ${reason}`);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const suffix = response.status === 429
        ? "Groq rate limit reached; retry after the indicated interval."
        : `Groq API returned HTTP ${response.status}.`;
      throw new GroqProviderError(
        detail ? `${suffix} ${detail.slice(0, 500)}` : suffix,
        response.status,
        response.headers.get("retry-after") ?? undefined,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new GroqProviderError("Groq API returned invalid JSON.", response.status);
    }

    const content = (payload as {
      choices?: Array<{ message?: { content?: unknown } }>;
    })?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new GroqProviderError("Groq API response did not contain assistant text.", response.status);
    }
    return content;
  }
}

/** Build using server environment only; do not pass this configuration to browser code. */
export function createGroqProvider(
  env: Record<string, string | undefined> = process.env,
): GroqProvider {
  return new GroqProvider({
    apiKey: env.GROQ_API_KEY ?? "",
    baseURL: env.GROQ_BASE_URL,
    model: env.GROQ_MODEL,
  });
}
