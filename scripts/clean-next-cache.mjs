import { rm } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = process.cwd();
const cacheTargets = [".next", ".turbo"];

async function removeCacheDirectory(dirName) {
  const absolutePath = path.join(workspaceRoot, dirName);
  await rm(absolutePath, { recursive: true, force: true });
  console.log(`[clean:next] removed ${dirName}`);
}

await Promise.all(cacheTargets.map((target) => removeCacheDirectory(target)));
