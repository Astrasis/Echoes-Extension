// src/extension/summary/preprocess-core.ts
function expression(rule, forceGlobal = false) {
  let flags = [...new Set(rule.flags)].join("");
  if (forceGlobal && !flags.includes("g")) flags += "g";
  return new RegExp(rule.pattern, flags);
}
function extract(text, rule) {
  const matches = [...text.matchAll(expression(rule, true))];
  const parts = matches.flatMap((match) => {
    if (rule.extraction?.mode === "match") return [match[0]];
    if (rule.extraction?.mode === "group") return [match[rule.extraction.group] ?? ""];
    if (match.length <= 1) return match[0] ? [match[0].trim()] : [];
    return match.slice(1).filter(Boolean).map((value) => value.trim());
  });
  return {
    content: parts.filter(Boolean).join(rule.extraction?.separator ?? "\n"),
    matched: matches.length > 0,
    missingGroup: rule.extraction?.mode === "group" && matches.some((match) => match[rule.extraction.group] === void 0)
  };
}
function inspectSummaryPreprocess(messages, rules, includeNotes = true) {
  const notes = [];
  const ordered = [...rules].filter((rule) => rule.enabled).sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  const result = messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [message];
    let content = message.content;
    for (const rule of ordered) {
      if (!rule.roles.includes(message.role)) continue;
      if (rule.type === "extract") {
        const extracted = extract(content, rule);
        if (includeNotes && (!extracted.matched || extracted.missingGroup)) notes.push({
          messageId: message.id,
          rule: rule.name,
          reason: !extracted.matched ? "\u672A\u5339\u914D\uFF0C\u4FDD\u7559\u7ED3\u679C\u4E3A\u7A7A" : "\u90E8\u5206\u5339\u914D\u4E2D\u4E0D\u5B58\u5728\u6307\u5B9A\u6355\u83B7\u7EC4\u6216\u8BE5\u7EC4\u672A\u53C2\u4E0E\u5339\u914D\uFF0C\u5BF9\u5E94\u7247\u6BB5\u4E3A\u7A7A"
        });
        content = extracted.content;
      } else {
        if (includeNotes && !expression(rule).test(content)) notes.push({ messageId: message.id, rule: rule.name, reason: "\u672A\u5339\u914D\uFF0C\u5185\u5BB9\u672A\u6539\u53D8" });
        content = content.replace(expression(rule), rule.type === "remove" ? "" : rule.replacement);
      }
    }
    content = content.trim();
    return content ? [{ ...message, content }] : [];
  });
  return { messages: result, notes };
}

// src/extension/summary/regex-worker.ts
self.addEventListener("message", (event) => {
  try {
    self.postMessage({ ok: true, ...inspectSummaryPreprocess(event.data.messages, event.data.rules, event.data.includeNotes ?? false) });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
//# sourceMappingURL=summary-regex-worker.js.map
