import { desc, eq, inArray } from "drizzle-orm";

import type { ImportPayload } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { jobs, sourceAssets, sourceFragments, sources } from "@/server/db/schema";
import { chunkText, estimateTokens, stripMarkdown } from "@/server/utils/text";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonObject } from "./common";
import { syncSourceFragmentFts } from "./fts";
import { enqueueJob, maybeRunInlineJobs } from "./jobs";
import { normalizeSourceContent } from "./parsers";
import { storeBufferAsset, storeTextAsset } from "./storage";

type ImportSourceOptions = {
  payload: ImportPayload;
  file?: File | null;
};

export async function createSourceImport(context: AppContext, options: ImportSourceOptions) {
  const sourceId = createId("src");
  const importedAt = nowIso();
  let filePath: string | undefined;
  let fileHash = "";
  let byteSize = 0;
  let assetInput:
    | {
        mimeType: string | null;
        metadata: Record<string, unknown>;
      }
    | undefined;

  if (options.file) {
    const buffer = Buffer.from(await options.file.arrayBuffer());
    const stored = await storeBufferAsset(context, {
      title: options.payload.title,
      buffer,
      filename: options.file.name,
      mimeType: options.file.type
    });
    filePath = stored.filePath;
    fileHash = stored.sha256;
    byteSize = stored.byteSize;
    assetInput = {
      mimeType: options.file.type || null,
      metadata: { originalName: options.file.name }
    };
  } else if (options.payload.textContent) {
    const stored = await storeTextAsset(context, {
      title: options.payload.title,
      text: options.payload.textContent,
      extension: options.payload.type === "markdown" ? "md" : "txt"
    });
    filePath = stored.filePath;
    fileHash = stored.sha256;
    byteSize = stored.byteSize;
    assetInput = {
      mimeType: "text/plain",
      metadata: { inline: true }
    };
  } else if (options.payload.originUrl) {
    const stored = await storeTextAsset(context, {
      title: options.payload.title,
      text: options.payload.originUrl,
      extension: "url"
    });
    filePath = stored.filePath;
    fileHash = stored.sha256;
    byteSize = stored.byteSize;
    assetInput = {
      mimeType: "text/uri-list",
      metadata: { originUrl: options.payload.originUrl }
    };
  }

  await context.db.insert(sources).values({
    id: sourceId,
    type: options.payload.type,
    title: options.payload.title,
    originUrl: options.payload.originUrl ?? null,
    createdAt: options.payload.createdAt ?? null,
    importedAt,
    filePath: filePath ?? null,
    privacyLevel: options.payload.privacyLevel,
    projectKey: options.payload.projectKey ?? null,
    hash: fileHash || `${sourceId}-pending`,
    status: "pending_ingest",
    tagsJson: JSON.stringify(options.payload.tags),
    metadataJson: JSON.stringify({
      ...options.payload.metadata,
      inlineText: Boolean(options.payload.textContent),
      textContent: options.payload.textContent ?? null
    })
  });

  if (filePath && fileHash) {
    await context.db.insert(sourceAssets).values({
      id: createId("asset"),
      sourceId,
      assetKind: "original",
      filePath,
      mimeType: assetInput?.mimeType ?? null,
      byteSize,
      sha256: fileHash,
      metadataJson: JSON.stringify(assetInput?.metadata ?? {}),
      createdAt: importedAt
    });
  }

  const jobId = await enqueueJob(context, {
    jobType: "normalize_source",
    sourceId
  });
  const auditId = await writeAuditLog(context, {
    actionType: "import",
    objectType: "source",
    objectId: sourceId,
    result: "queued",
    notes: `job:${jobId}`
  });

  await maybeRunInlineJobs(context);

  return {
    sourceId,
    jobId,
    auditId
  };
}

export async function normalizeSource(context: AppContext, sourceId: string) {
  const source = await context.db.query.sources.findFirst({
    where: eq(sources.id, sourceId)
  });

  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }

  const metadata = parseJsonObject<Record<string, unknown>>(source.metadataJson, {});
  const textContent = typeof metadata.textContent === "string" ? metadata.textContent : undefined;

  const normalization = await normalizeSourceContent(context, {
    type: source.type as ImportPayload["type"],
    filePath: source.filePath,
    originUrl: source.originUrl,
    textContent
  });

  const normalizedText = stripMarkdown(normalization.text);
  const fragments = chunkText(normalizedText);
  const embeddings = context.provider.isConfigured && fragments.length > 0
    ? await context.provider.embedText(fragments)
    : [];

  await context.db.delete(sourceFragments).where(eq(sourceFragments.sourceId, sourceId));
  context.sqlite.prepare("delete from source_fragments_fts where source_id = ?").run(sourceId);

  for (const [index, fragmentText] of fragments.entries()) {
    const fragmentId = createId("frag");
    const embedding = embeddings[index];
    await context.db.insert(sourceFragments).values({
      id: fragmentId,
      sourceId,
      fragmentIndex: index,
      text: fragmentText,
      tokenCount: estimateTokens(fragmentText),
      embeddingJson: embedding ? JSON.stringify(embedding) : null,
      createdAt: nowIso()
    });

    syncSourceFragmentFts(context, {
      id: fragmentId,
      sourceId,
      text: fragmentText
    });
  }

  await context.db
    .update(sources)
    .set({
      extractedText: normalizedText,
      status: "ready_for_compile",
      errorMessage: null,
      metadataJson: JSON.stringify({
        ...metadata,
        normalization: normalization.metadata
      })
    })
    .where(eq(sources.id, sourceId));

  await writeAuditLog(context, {
    actionType: "normalize_source",
    objectType: "source",
    objectId: sourceId,
    result: "succeeded",
    notes: `${fragments.length} fragments`
  });
}

export async function listSources(context: AppContext) {
  const allSources = await context.db.query.sources.findMany({
    orderBy: [desc(sources.importedAt)]
  });
  const sourceIds = allSources.map((source) => source.id);
  const allJobs = sourceIds.length
    ? await context.db.query.jobs.findMany({
        where: inArray(jobs.sourceId, sourceIds),
        orderBy: [desc(jobs.queuedAt)]
      })
    : [];

  return allSources.map((source) => ({
    ...source,
    latestJob: allJobs.find((job) => job.sourceId === source.id) ?? null
  }));
}

export async function getSourceDetails(context: AppContext, sourceId: string) {
  const source = await context.db.query.sources.findFirst({
    where: eq(sources.id, sourceId)
  });
  const fragments = await context.db.query.sourceFragments.findMany({
    where: eq(sourceFragments.sourceId, sourceId)
  });
  const sourceJobs = await context.db.query.jobs.findMany({
    where: eq(jobs.sourceId, sourceId),
    orderBy: [desc(jobs.queuedAt)]
  });

  return {
    source,
    fragments,
    jobs: sourceJobs
  };
}

export async function listSourcesByIds(context: AppContext, sourceIds: string[]) {
  if (!sourceIds.length) {
    return [];
  }
  return context.db.query.sources.findMany({
    where: inArray(sources.id, sourceIds)
  });
}

export async function retrySourceProcessing(context: AppContext, sourceId: string) {
  const source = await context.db.query.sources.findFirst({
    where: eq(sources.id, sourceId)
  });

  if (!source) {
    throw new Error(`Source ${sourceId} not found`);
  }

  const latestJob = await context.db.query.jobs.findFirst({
    where: eq(jobs.sourceId, sourceId),
    orderBy: [desc(jobs.queuedAt)]
  });

  const jobType = latestJob?.jobType === "compile_source" || Boolean(source.extractedText)
    ? "compile_source"
    : "normalize_source";

  await context.db
    .update(sources)
    .set({
      status: jobType === "compile_source" ? "ready_for_compile" : "pending_ingest",
      errorMessage: null
    })
    .where(eq(sources.id, sourceId));

  const jobId = await enqueueJob(context, {
    jobType,
    sourceId
  });

  const auditId = await writeAuditLog(context, {
    actionType: "retry_source",
    objectType: "source",
    objectId: sourceId,
    result: "queued",
    notes: `job:${jobId}`
  });

  await maybeRunInlineJobs(context);

  return {
    sourceId,
    jobId,
    auditId
  };
}
