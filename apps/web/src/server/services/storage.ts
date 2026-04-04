import fs from "node:fs/promises";
import path from "node:path";

import type { AppContext } from "@/server/context";
import { ensureDir, guessExtension, sanitizeTitle, sha256, writeFileAtomic } from "@/server/utils/fs";

export async function storeBufferAsset(
  context: AppContext,
  input: {
    title: string;
    buffer: Buffer;
    filename?: string;
    mimeType?: string;
    subdir?: string;
  }
) {
  const digest = sha256(input.buffer);
  const extension = guessExtension(input.filename, input.mimeType, "bin");
  const folder = path.join(context.paths.objectsDir, input.subdir ?? digest.slice(0, 2));
  await ensureDir(folder);
  const basename = `${sanitizeTitle(input.title)}-${digest.slice(0, 10)}.${extension}`;
  const filePath = path.join(folder, basename);

  try {
    await fs.access(filePath);
  } catch {
    await writeFileAtomic(filePath, input.buffer);
  }

  return {
    filePath,
    sha256: digest,
    byteSize: input.buffer.length
  };
}

export async function storeTextAsset(
  context: AppContext,
  input: {
    title: string;
    text: string;
    extension?: string;
    subdir?: string;
  }
) {
  return storeBufferAsset(context, {
    title: input.title,
    buffer: Buffer.from(input.text, "utf8"),
    filename: `${sanitizeTitle(input.title)}.${input.extension ?? "txt"}`,
    mimeType: "text/plain",
    subdir: input.subdir
  });
}
