import { getDatabase } from "./client";

let initialized = false;

export function initializeDatabase() {
  if (initialized) {
    return;
  }

  const { sqlite } = getDatabase();
  initializeDatabaseForSqlite(sqlite);
  initialized = true;
}

export function initializeDatabaseForSqlite(sqlite: ReturnType<typeof getDatabase>["sqlite"]) {
  sqlite.exec(`
    create table if not exists sources (
      id text primary key,
      type text not null,
      title text not null,
      origin_url text,
      created_at text,
      imported_at text not null,
      file_path text,
      privacy_level text not null,
      project_key text,
      hash text not null,
      status text not null,
      tags_json text not null default '[]',
      metadata_json text not null default '{}',
      extracted_text text,
      error_message text
    );

    create table if not exists source_assets (
      id text primary key,
      source_id text not null references sources(id) on delete cascade,
      asset_kind text not null,
      file_path text not null,
      mime_type text,
      byte_size integer not null default 0,
      sha256 text not null,
      metadata_json text not null default '{}',
      created_at text not null
    );

    create table if not exists source_fragments (
      id text primary key,
      source_id text not null references sources(id) on delete cascade,
      fragment_index integer not null,
      text text not null,
      token_count integer not null default 0,
      embedding_json text,
      created_at text not null
    );

    create table if not exists jobs (
      id text primary key,
      job_type text not null,
      status text not null,
      source_id text references sources(id) on delete cascade,
      payload_json text not null default '{}',
      attempts integer not null default 0,
      error_message text,
      queued_at text not null,
      started_at text,
      finished_at text
    );

    create table if not exists compilation_runs (
      id text primary key,
      source_id text references sources(id) on delete set null,
      provider_name text not null,
      status text not null,
      input_summary_json text not null default '{}',
      output_node_ids_json text not null default '[]',
      attached_node_ids_json text not null default '[]',
      diff_summary_json text not null default '{}',
      error_message text,
      started_at text not null,
      finished_at text
    );

    create table if not exists wiki_nodes (
      id text primary key,
      node_type text not null,
      title text not null,
      summary text not null,
      body_md text not null,
      status text not null,
      source_ids_json text not null default '[]',
      tags_json text not null default '[]',
      project_key text,
      privacy_level text not null,
      embedding_json text,
      updated_at text not null,
      created_at text not null
    );

    create table if not exists wiki_edges (
      id text primary key,
      from_node_id text not null references wiki_nodes(id) on delete cascade,
      to_node_id text not null references wiki_nodes(id) on delete cascade,
      relation_type text not null,
      weight real not null default 0,
      created_at text not null
    );

    create table if not exists node_reviews (
      id text primary key,
      node_id text not null references wiki_nodes(id) on delete cascade,
      action text not null,
      actor_type text not null,
      note text,
      merged_into_node_id text,
      created_at text not null
    );

    create table if not exists postcards (
      id text primary key,
      card_type text not null,
      title text not null,
      claim text not null,
      evidence_summary text not null,
      user_view text not null,
      related_node_ids_json text not null default '[]',
      related_source_ids_json text not null default '[]',
      privacy_level text not null,
      version integer not null default 1,
      updated_at text not null,
      created_at text not null
    );

    create table if not exists passport_snapshots (
      id text primary key,
      title text not null,
      human_markdown text not null,
      machine_manifest_json text not null,
      include_node_ids_json text not null default '[]',
      include_postcard_ids_json text not null default '[]',
      privacy_floor text not null,
      created_at text not null
    );

    create table if not exists research_sessions (
      id text primary key,
      question text not null,
      answer_md text not null,
      citations_json text not null default '[]',
      project_key text,
      tags_json text not null default '[]',
      created_at text not null
    );

    create table if not exists outputs (
      id text primary key,
      title text not null,
      output_type text not null,
      prompt_context text not null default '',
      content_md text not null,
      related_source_ids_json text not null default '[]',
      related_node_ids_json text not null default '[]',
      status text not null,
      created_at text not null
    );

    create table if not exists citations (
      id text primary key,
      parent_type text not null,
      parent_id text not null,
      citation_kind text not null,
      ref_id text not null,
      excerpt text not null,
      score real not null default 0,
      created_at text not null
    );

    create table if not exists audit_logs (
      id text primary key,
      actor_type text not null,
      action_type text not null,
      object_type text not null,
      object_id text not null,
      timestamp text not null,
      result text not null,
      notes text not null default ''
    );

    create table if not exists backup_runs (
      id text primary key,
      file_path text not null,
      manifest_json text not null,
      note text not null,
      status text not null,
      created_at text not null
    );

    create virtual table if not exists source_fragments_fts using fts5(
      fragment_id unindexed,
      source_id unindexed,
      content
    );

    create virtual table if not exists wiki_nodes_fts using fts5(
      node_id unindexed,
      title,
      summary,
      body
    );
  `);

  const sourceFragmentCount = sqlite
    .prepare("select count(*) as count from source_fragments_fts")
    .get() as { count?: number } | undefined;
  if ((sourceFragmentCount?.count ?? 0) === 0) {
    sqlite.exec(`
      insert into source_fragments_fts(fragment_id, source_id, content)
      select id, source_id, text from source_fragments;
    `);
  }

  const wikiCount = sqlite
    .prepare("select count(*) as count from wiki_nodes_fts")
    .get() as { count?: number } | undefined;
  if ((wikiCount?.count ?? 0) === 0) {
    sqlite.exec(`
      insert into wiki_nodes_fts(node_id, title, summary, body)
      select id, title, summary, body_md from wiki_nodes;
    `);
  }

}
