export function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/[#>*_\-\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function chunkText(text: string, chunkSize = 900, overlap = 150) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(normalized.length, cursor + chunkSize);
    chunks.push(normalized.slice(cursor, end).trim());
    if (end === normalized.length) {
      break;
    }
    cursor = Math.max(end - overlap, cursor + 1);
  }

  return chunks.filter(Boolean);
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let index = 0; index < a.length; index += 1) {
    const currentA = a[index] ?? 0;
    const currentB = b[index] ?? 0;
    dot += currentA * currentB;
    magA += currentA * currentA;
    magB += currentB * currentB;
  }

  if (!magA || !magB) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
