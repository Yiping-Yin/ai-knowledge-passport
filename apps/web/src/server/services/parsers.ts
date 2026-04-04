import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import TurndownService from "turndown";
import * as cheerio from "cheerio";
import pdfParse from "pdf-parse";

import type { AppContext } from "@/server/context";
import { runCommand } from "@/server/utils/shell";

const turndown = new TurndownService();

async function renderPdfToImages(filePath: string) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "akp-pdf-"));
  const outputBase = path.join(tempDir, "page");
  await runCommand("pdftoppm", ["-png", "-f", "1", "-l", "3", filePath, outputBase]);
  const files = await fs.readdir(tempDir);
  return files
    .filter((file) => file.endsWith(".png"))
    .map((file) => path.join(tempDir, file));
}

async function ocrImageFile(filePath: string) {
  const { stdout } = await runCommand("tesseract", [filePath, "stdout", "-l", "eng"]);
  return stdout.trim();
}

export async function normalizeSourceContent(
  context: AppContext,
  input: {
    type: "markdown" | "txt" | "pdf" | "url" | "image" | "chat" | "audio";
    filePath?: string | null;
    textContent?: string | null;
    originUrl?: string | null;
  }
) {
  switch (input.type) {
    case "markdown":
    case "txt":
    case "chat":
      return input.textContent?.trim() ?? "";
    case "url": {
      if (!input.originUrl) {
        return "";
      }
      const response = await fetch(input.originUrl);
      const html = await response.text();
      const $ = cheerio.load(html);
      $("script, style, noscript").remove();
      const markdown = turndown.turndown($("body").html() ?? "");
      return markdown.trim();
    }
    case "pdf": {
      if (!input.filePath) {
        return "";
      }
      const buffer = await fs.readFile(input.filePath);
      const parsed = await pdfParse(buffer);
      if (parsed.text.trim().length > 80) {
        return parsed.text.trim();
      }

      const imagePaths = await renderPdfToImages(input.filePath);
      const ocrTexts = await Promise.all(imagePaths.map((imagePath) => ocrImageFile(imagePath)));
      return ocrTexts.join("\n\n").trim();
    }
    case "image": {
      if (!input.filePath) {
        return "";
      }
      return ocrImageFile(input.filePath);
    }
    case "audio": {
      if (!input.filePath) {
        return "";
      }
      const normalizedPath = `${input.filePath}.wav`;
      await runCommand("ffmpeg", ["-y", "-i", input.filePath, "-ac", "1", "-ar", "16000", normalizedPath]);
      return context.provider.transcribeAudio({ filePath: normalizedPath, mimeType: "audio/wav" });
    }
    default:
      return "";
  }
}
