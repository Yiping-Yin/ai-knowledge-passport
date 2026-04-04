import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function writeFileAtomic(targetPath: string, content: Buffer | string) {
  const tempPath = `${targetPath}.tmp`;
  await fs.writeFile(tempPath, content);
  await fs.rename(tempPath, targetPath);
}

export async function copyFileAtomic(sourcePath: string, targetPath: string) {
  const tempPath = `${targetPath}.tmp`;
  await fs.copyFile(sourcePath, tempPath);
  await fs.rename(tempPath, targetPath);
}

export function guessExtension(filename: string | undefined, mimeType: string | undefined, fallback = "bin") {
  const fromName = filename ? path.extname(filename).replace(/^\./, "") : "";
  if (fromName) {
    return fromName;
  }

  if (!mimeType) {
    return fallback;
  }

  if (mimeType.includes("markdown")) return "md";
  if (mimeType.includes("text/plain")) return "txt";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("jpeg")) return "jpg";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return fallback;
}

export function sanitizeTitle(input: string) {
  return input.replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().slice(0, 120) || "untitled";
}
