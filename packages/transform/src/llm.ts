type Message = { role: string; content: unknown };

function isOpenAIFormat(body: Record<string, unknown>): boolean {
  return Array.isArray(body["messages"]);
}

function isAnthropicFormat(
  body: Record<string, unknown>,
  headers: Record<string, string>
): boolean {
  return (
    "anthropic-version" in headers ||
    (typeof body["model"] === "string" && body["model"].startsWith("claude"))
  );
}

export function injectSystemPrompt(
  body: Record<string, unknown>,
  headers: Record<string, string>,
  systemPrompt: string
): Record<string, unknown> {
  const result = { ...body };

  if (isAnthropicFormat(result, headers)) {
    const existing =
      typeof result["system"] === "string" ? result["system"] : "";
    result["system"] = existing ? `${systemPrompt}\n\n${existing}` : systemPrompt;
    return result;
  }

  if (isOpenAIFormat(result)) {
    const messages = [...(result["messages"] as Message[])];
    const firstIsSystem = messages[0]?.role === "system";
    if (firstIsSystem) {
      messages[0] = {
        ...messages[0],
        content: `${systemPrompt}\n\n${messages[0].content}`,
      };
    } else {
      messages.unshift({ role: "system", content: systemPrompt });
    }
    result["messages"] = messages;
    return result;
  }

  return result;
}

export function injectPromptWrap(
  body: Record<string, unknown>,
  prefix?: string,
  suffix?: string
): Record<string, unknown> {
  if (!prefix && !suffix) return body;
  const result = { ...body };

  if (Array.isArray(result["messages"])) {
    const messages = [...(result["messages"] as Message[])];
    const lastUserIdx = [...messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserIdx !== -1) {
      const idx = messages.length - 1 - lastUserIdx;
      const msg = messages[idx];
      const content =
        typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      messages[idx] = {
        ...msg,
        content: `${prefix ?? ""}${content}${suffix ?? ""}`,
      };
      result["messages"] = messages;
    }
  }

  return result;
}
