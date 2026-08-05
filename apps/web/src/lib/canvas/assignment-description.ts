function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, "").replace(/[\t\f\v ]+/g, " ").replace(/\n\s+/g, "\n").trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function stripHtml(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|ul|ol|h1|h2|h3|h4|h5|h6|tr)>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " "),
  );
}

function toAbsoluteUrl(value: string, fallbackUrl: string | null) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return fallbackUrl ? new URL(trimmed, fallbackUrl).toString() : new URL(trimmed).toString();
  } catch {
    return null;
  }
}

function extractLinkedText(html: string, fallbackUrl: string | null) {
  return html.replace(/<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi, (_match, doubleQuotedHref, singleQuotedHref, bareHref, innerHtml) => {
    const href = typeof doubleQuotedHref === "string" && doubleQuotedHref ? doubleQuotedHref : typeof singleQuotedHref === "string" && singleQuotedHref ? singleQuotedHref : typeof bareHref === "string" ? bareHref : "";
    const absoluteUrl = toAbsoluteUrl(href, fallbackUrl);
    const innerText = normalizeWhitespace(stripHtml(innerHtml));

    if (innerText && absoluteUrl) {
      return `${innerText} ${absoluteUrl}`;
    }

    if (absoluteUrl) {
      return absoluteUrl;
    }

    return innerText;
  });
}

function extractUrls(value: string, fallbackUrl: string | null) {
  const urls = new Set<string>();
  const attributePattern = /(?:href|src)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;

  for (const match of value.matchAll(attributePattern)) {
    const rawUrl = match[1] ?? match[2] ?? match[3] ?? "";
    const absoluteUrl = toAbsoluteUrl(rawUrl, fallbackUrl);

    if (absoluteUrl) {
      urls.add(absoluteUrl);
    }
  }

  const textUrlPattern = /https?:\/\/[^\s<]+[^\s<.,!?;:]/gi;

  for (const match of value.matchAll(textUrlPattern)) {
    urls.add(match[0]);
  }

  return Array.from(urls);
}

export function formatCanvasAssignmentDescription(
  rawDescription: string | null | undefined,
  options?: { baseUrl?: string | null; pageUrl?: string | null },
) {
  const description = typeof rawDescription === "string" ? rawDescription.trim() : "";

  if (!description) {
    return "";
  }

  const fallbackUrl = options?.pageUrl ?? options?.baseUrl ?? null;
  const linkedText = extractLinkedText(description, fallbackUrl);
  const plainText = normalizeWhitespace(stripHtml(linkedText));
  const urls = extractUrls(description, fallbackUrl);
  const sections = [plainText].filter((value) => value.length > 0);

  if (urls.length > 0) {
    sections.push(`Relevant links:\n${urls.map((url) => `- ${url}`).join("\n")}`);
  }

  if (options?.pageUrl) {
    const absolutePageUrl = toAbsoluteUrl(options.pageUrl, options.baseUrl ?? null);

    if (absolutePageUrl && !urls.includes(absolutePageUrl)) {
      sections.push(`Assignment page: ${absolutePageUrl}`);
    }
  }

  return sections.join("\n\n").trim();
}