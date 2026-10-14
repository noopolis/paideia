import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { lstat, open } from 'node:fs/promises';

/** Receipt bytes belong to a trial; the supervisor's pathname belongs to its next generation. */
export async function captureTrainingSessionReceipt(sourcePath: string): Promise<{ sourcePath: string; sha256: string; content: string }> {
  const file = await open(sourcePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const before = await file.stat();
    if (!before.isFile() || before.size > 2_000_000) throw new Error('Session preflight must be a bounded regular file');
    const bytes = await file.readFile();
    const after = await file.stat(), current = await lstat(sourcePath);
    if (bytes.length > 2_000_000 || current.isSymbolicLink() || current.ino !== after.ino || current.dev !== after.dev ||
        before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) {
      throw new Error('Session preflight changed while being captured');
    }
    return { sourcePath, sha256: `sha256:${createHash('sha256').update(bytes).digest('hex')}`, content: bytes.toString('base64') };
  } finally { await file.close(); }
}
