import { getDb } from '@/lib/db';
import { observationLog } from '@/lib/schema';
import { and, eq, ne } from 'drizzle-orm';

export interface DuplicateMatch {
  id: string;
  wallet: string;
  createdAt: Date | null;
}

export async function findDuplicateByHash(
  fileHash: string,
  excludeWallet: string
): Promise<DuplicateMatch | null> {
  const db = getDb();
  if (!db || !fileHash) return null;

  const rows = await db
    .select({
      id: observationLog.id,
      wallet: observationLog.wallet,
      createdAt: observationLog.createdAt,
      confidence: observationLog.confidence,
    })
    .from(observationLog)
    .where(
      and(
        eq(observationLog.fileHash, fileHash),
        ne(observationLog.wallet, excludeWallet),
        ne(observationLog.confidence, 'rejected')
      )
    )
    .limit(1);

  if (rows.length === 0) return null;
  const r = rows[0];
  return { id: r.id, wallet: r.wallet, createdAt: r.createdAt };
}
