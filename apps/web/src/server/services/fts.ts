import type { AppContext } from "@/server/context";

export function syncSourceFragmentFts(context: AppContext, fragment: { id: string; sourceId: string; text: string }) {
  context.sqlite
    .prepare("delete from source_fragments_fts where fragment_id = ?")
    .run(fragment.id);
  context.sqlite
    .prepare("insert into source_fragments_fts(fragment_id, source_id, content) values(?, ?, ?)")
    .run(fragment.id, fragment.sourceId, fragment.text);
}

export function syncWikiNodeFts(context: AppContext, node: { id: string; title: string; summary: string; bodyMd: string }) {
  context.sqlite
    .prepare("delete from wiki_nodes_fts where node_id = ?")
    .run(node.id);
  context.sqlite
    .prepare("insert into wiki_nodes_fts(node_id, title, summary, body) values(?, ?, ?, ?)")
    .run(node.id, node.title, node.summary, node.bodyMd);
}
