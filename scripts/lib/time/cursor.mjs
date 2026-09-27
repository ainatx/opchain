import { createReadStream } from "node:fs";

export function startOffset(previous, stat) {
  if (!previous || previous.inode !== stat.ino || stat.size < previous.size ||
      (stat.size === previous.size && stat.mtimeMs !== previous.mtime)) return 0;
  return previous.offset;
}

// A final unterminated line may still be in flight: never advance past it.
export async function readLines(path, stat, previous, onLine) {
  const start = startOffset(previous, stat);
  let offset = start;
  let pending = Buffer.alloc(0);
  if (start < stat.size) {
    for await (const chunk of createReadStream(path, { start, end: stat.size - 1 })) {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk;
      let from = 0;
      for (let end = pending.indexOf(10); end !== -1; end = pending.indexOf(10, from)) {
        onLine(pending.subarray(from, end).toString("utf8"), offset);
        offset += end - from + 1;
        from = end + 1;
      }
      pending = pending.subarray(from);
    }
  }
  return { inode: stat.ino, size: stat.size, offset, mtime: stat.mtimeMs };
}
