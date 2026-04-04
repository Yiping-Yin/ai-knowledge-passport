import fs from "node:fs";
import path from "node:path";

function hasWorkspaceMarker(candidate: string) {
  const packageJsonPath = path.join(candidate, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
      workspaces?: unknown;
    };
    return Array.isArray(parsed.workspaces);
  } catch {
    return false;
  }
}

export function resolveWorkspaceRoot(start = process.cwd()) {
  let current = path.resolve(start);

  while (current !== path.dirname(current)) {
    if (hasWorkspaceMarker(current)) {
      return current;
    }
    current = path.dirname(current);
  }

  throw new Error(`Unable to locate workspace root from ${start}`);
}
