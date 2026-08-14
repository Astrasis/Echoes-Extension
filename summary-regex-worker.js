// src/extension/summary/preprocess-core.ts
function expression(rule, forceGlobal = false) {
  let flags = [...new Set(rule.flags)].join("");
  if (forceGlobal && !flags.includes("g")) flags += "g";
  return new RegExp(rule.pattern, flags);
}
function extract(text, rule) {
  const matches = [...text.matchAll(expression(rule, true))];
  const parts = matches.flatMap((match) => {
    if (match.length <= 1) return match[0] ? [match[0].trim()] : [];
    return match.slice(1).filter(Boolean).map((value) => value.trim());
  });
  return parts.filter(Boolean).join("\n");
}
function applySummaryPreprocess(messages, rules) {
  const ordered = [...rules].filter((rule) => rule.enabled).sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  return messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [message];
    let content = message.content;
    for (const rule of ordered) {
      if (!rule.roles.includes(message.role)) continue;
      if (rule.type === "extract") content = extract(content, rule);
      else if (rule.type === "remove") content = content.replace(expression(rule), "");
      else content = content.replace(expression(rule), rule.replacement);
    }
    content = content.trim();
    return content ? [{ ...message, content }] : [];
  });
}

// src/extension/summary/regex-worker.ts
self.addEventListener("message", (event) => {
  try {
    self.postMessage({ ok: true, messages: applySummaryPreprocess(event.data.messages, event.data.rules) });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
//# sourceMappingURL=summary-regex-worker.js.map
