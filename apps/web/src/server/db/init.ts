import { getDatabase } from "./client";

let initialized = false;

function ensureColumn(
  sqlite: ReturnType<typeof getDatabase>["sqlite"],
  tableName: string,
  columnName: string,
  definition: string
) {
  const columns = sqlite.prepare(`pragma table_info(${tableName})`).all() as Array<{ name?: string }>;
  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  sqlite.exec(`alter table ${tableName} add column ${definition}`);
}

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

    create table if not exists claims (
      id text primary key,
      claim_type text not null,
      title text not null,
      statement text not null,
      status text not null,
      confidence real not null default 0,
      source_fragment_ids_json text not null default '[]',
      source_ids_json text not null default '[]',
      node_id text references wiki_nodes(id) on delete set null,
      project_key text,
      tags_json text not null default '[]',
      created_at text not null,
      updated_at text not null
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

    create table if not exists visa_bundles (
      id text primary key,
      title text not null,
      audience_label text not null,
      passport_id text references passport_snapshots(id) on delete set null,
      description text not null default '',
      purpose text not null default '',
      human_markdown text not null,
      machine_manifest_json text not null,
      include_node_ids_json text not null default '[]',
      include_postcard_ids_json text not null default '[]',
      privacy_floor text not null,
      redaction_json text not null default '{}',
      allow_machine_download integer not null default 1,
      expires_at text,
      status text not null,
      token_hash text not null,
      last_accessed_at text,
      last_machine_accessed_at text,
      access_count integer not null default 0,
      max_access_count integer,
      machine_download_count integer not null default 0,
      max_machine_downloads integer,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists visa_access_logs (
      id text primary key,
      visa_id text not null references visa_bundles(id) on delete cascade,
      access_type text not null,
      result text not null,
      denial_reason text,
      visitor_label text,
      session_hash text,
      user_agent text,
      created_at text not null
    );

    create table if not exists visa_feedback_queue (
      id text primary key,
      visa_id text not null references visa_bundles(id) on delete cascade,
      feedback_type text not null,
      visitor_label text,
      message text not null,
      status text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists agent_pack_snapshots (
      id text primary key,
      title text not null,
      source_passport_id text references passport_snapshots(id) on delete set null,
      source_visa_id text references visa_bundles(id) on delete set null,
      human_markdown text not null,
      machine_manifest_json text not null,
      include_node_ids_json text not null default '[]',
      include_postcard_ids_json text not null default '[]',
      privacy_floor text not null,
      created_at text not null
    );

    create table if not exists avatar_profiles (
      id text primary key,
      title text not null,
      active_pack_id text not null references agent_pack_snapshots(id) on delete restrict,
      intro text not null default '',
      tone_rules_json text not null default '[]',
      forbidden_topics_json text not null default '[]',
      escalation_rules_json text not null default '{}',
      status text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists avatar_simulation_sessions (
      id text primary key,
      avatar_profile_id text not null references avatar_profiles(id) on delete cascade,
      question text not null,
      result_status text not null,
      answer_md text not null,
      citations_json text not null default '[]',
      reason text not null default '',
      created_at text not null
    );

    create table if not exists avatar_live_sessions (
      id text primary key,
      avatar_profile_id text not null references avatar_profiles(id) on delete cascade,
      title text not null,
      status text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists avatar_live_messages (
      id text primary key,
      session_id text not null references avatar_live_sessions(id) on delete cascade,
      role text not null,
      content_md text not null,
      result_status text,
      citations_json text not null default '[]',
      reason text not null default '',
      created_at text not null
    );

    create table if not exists export_packages (
      id text primary key,
      object_type text not null,
      object_id text not null,
      title text not null,
      format_version text not null,
      file_path text not null,
      manifest_json text not null,
      bundle_sha256 text not null,
      status text not null,
      created_at text not null,
      updated_at text not null
    );

    create table if not exists object_policies (
      id text primary key,
      object_type text not null,
      object_id text not null,
      privacy_floor_override text,
      allow_secret_links integer,
      allow_machine_access integer,
      allow_exports integer,
      allow_avatar_binding integer,
      allow_avatar_simulation integer,
      notes text not null default '',
      created_at text not null,
      updated_at text not null
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

    create table if not exists grants (
      id text primary key,
      object_type text not null,
      object_id text not null,
      grantee_type text not null,
      grantee_id text,
      access_level text not null,
      expires_at text,
      status text not null,
      redaction_rules_json text not null default '{}',
      notes text not null default '',
      created_at text not null,
      updated_at text not null
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

  ensureColumn(sqlite, "visa_bundles", "description", "description text not null default ''");
  ensureColumn(sqlite, "visa_bundles", "purpose", "purpose text not null default ''");
  ensureColumn(sqlite, "visa_bundles", "last_machine_accessed_at", "last_machine_accessed_at text");
  ensureColumn(sqlite, "visa_bundles", "access_count", "access_count integer not null default 0");
  ensureColumn(sqlite, "visa_bundles", "max_access_count", "max_access_count integer");
  ensureColumn(sqlite, "visa_bundles", "machine_download_count", "machine_download_count integer not null default 0");
  ensureColumn(sqlite, "visa_bundles", "max_machine_downloads", "max_machine_downloads integer");

}
