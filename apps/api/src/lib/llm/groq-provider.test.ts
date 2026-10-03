import { afterEach, describe, expect, it, vi } from "vitest";
import { createGroqProvider, GroqProvider, GroqProviderError } from "./groq-provider";

function jsonResponse(payload: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("GroqProvider", () => {
  it("uses server env config and Groq defaults", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: "ok" } }] }));
    vi.stubGlobal("fetch", fetchImpl);
    const provider = createGroqProvider({ GROQ_API_KEY: "secret" });
    expect(await provider.complete([{ role: "user", content: "hello" }])).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret" }),
        body: JSON.stringify({ model: "openai/gpt-oss-20b", messages: [{ role: "user", content: "hello" }] }),
      }),
    );
  });

  it("honors configured model, base URL and completion options", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: "answer" } }] }));
    const provider = new GroqProvider({ apiKey: "secret", baseURL: "https://example.test/v1/", model: "custom-model", fetchImpl });
    await provider.complete([{ role: "system", content: "rule" }, { role: "user", content: "question" }], { temperature: 0.1, maxTokens: 700 });
    expect(fetchImpl.mock.calls[0][0]).toBe("https://example.test/v1/chat/completions");
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body as string)).toMatchObject({ model: "custom-model", temperature: 0.1, max_completion_tokens: 700 });
  });

  it("reports 429 and retry-after without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("quota", { status: 429, headers: { "retry-after": "12" } }));
    const provider = new GroqProvider({ apiKey: "secret", fetchImpl });
    try {
      await provider.complete([{ role: "user", content: "news" }]);
      throw new Error("expected provider rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(GroqProviderError);
      expect(error).toMatchObject({ status: 429, retryAfter: "12" });
    }
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("surfaces network and malformed-response errors", async () => {
    const network = new GroqProvider({ apiKey: "secret", fetchImpl: vi.fn().mockRejectedValue(new Error("offline")) });
    await expect(network.complete([{ role: "user", content: "news" }])).rejects.toThrow("Could not reach Groq API");
    const malformed = new GroqProvider({ apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ choices: [] })) });
    await expect(malformed.complete([{ role: "user", content: "news" }])).rejects.toThrow("did not contain assistant text");
  });

  it("requires an API key and at least one message", async () => {
    expect(() => new GroqProvider({ apiKey: "" })).toThrow("GROQ_API_KEY is required");
    const provider = new GroqProvider({ apiKey: "secret" });
    await expect(provider.complete([])).rejects.toThrow("At least one chat message");
  });
});
