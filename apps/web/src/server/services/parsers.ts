import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import TurndownService from "turndown";
import * as cheerio from "cheerio";
import { PDFParse } from "pdf-parse";

import type { AppContext } from "@/server/context";
import { runCommand } from "@/server/utils/shell";

const turndown = new TurndownService();

type NormalizedSourceResult = {
  text: string;
  metadata: Record<string, string | number | boolean | null>;
};

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
): Promise<NormalizedSourceResult> {
  switch (input.type) {
    case "markdown":
    case "txt":
    case "chat":
      return {
        text: input.textContent?.trim() ?? "",
        metadata: {
          parser: "inline_text",
          charCount: input.textContent?.trim().length ?? 0,
          wordCount: input.textContent?.trim().split(/\s+/).filter(Boolean).length ?? 0
        }
      };
    case "url": {
      if (!input.originUrl) {
        return {
          text: "",
          metadata: {
            parser: "url_fetch",
            fetched: false
          }
        };
      }
      const response = await fetch(input.originUrl);
      const html = await response.text();
      const $ = cheerio.load(html);
      const pageTitle = $("title").first().text().trim();
      const description = $('meta[name="description"]').attr("content")?.trim() ?? null;
      const author = $('meta[name="author"]').attr("content")?.trim() ?? null;
      const htmlLang = $("html").attr("lang")?.trim() ?? null;
      $("script, style, noscript").remove();
      const markdown = turndown.turndown($("body").html() ?? "");
      const text = markdown.trim();
      return {
        text,
        metadata: {
          parser: "url_fetch",
          fetched: true,
          pageTitle,
          description,
          author,
          htmlLang,
          charCount: text.length
        }
      };
    }
    case "pdf": {
      if (!input.filePath) {
        return {
          text: "",
          metadata: {
            parser: "pdf",
            extracted: false
          }
        };
      }
      const buffer = await fs.readFile(input.filePath);
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      if (parsed.text.trim().length > 80) {
        const text = parsed.text.trim();
        return {
          text,
          metadata: {
            parser: "pdf_text",
            pageCount: parsed.total,
            charCount: text.length
          }
        };
      }

      const imagePaths = await renderPdfToImages(input.filePath);
      const ocrTexts = await Promise.all(imagePaths.map((imagePath) => ocrImageFile(imagePath)));
      const text = ocrTexts.join("\n\n").trim();
      return {
        text,
        metadata: {
          parser: "pdf_ocr",
          pageCount: parsed.total,
          ocrImageCount: imagePaths.length,
          charCount: text.length
        }
      };
    }
    case "image": {
      if (!input.filePath) {
        return {
          text: "",
          metadata: {
            parser: "image_ocr",
            extracted: false
          }
        };
      }
      const text = await ocrImageFile(input.filePath);
      return {
        text,
        metadata: {
          parser: "image_ocr",
          charCount: text.length,
          wordCount: text.split(/\s+/).filter(Boolean).length
        }
      };
    }
    case "audio": {
      if (!input.filePath) {
        return {
          text: "",
          metadata: {
            parser: "audio_transcription",
            extracted: false
          }
        };
      }
      const normalizedPath = `${input.filePath}.wav`;
      await runCommand("ffmpeg", ["-y", "-i", input.filePath, "-ac", "1", "-ar", "16000", normalizedPath]);
      const text = await context.provider.transcribeAudio({ filePath: normalizedPath, mimeType: "audio/wav" });
      return {
        text,
        metadata: {
          parser: "audio_transcription",
          normalizedAudioPath: normalizedPath,
          charCount: text.length,
          wordCount: text.split(/\s+/).filter(Boolean).length
        }
      };
    }
    default:
      return {
        text: "",
        metadata: {
          parser: "unknown"
        }
      };
  }
}
