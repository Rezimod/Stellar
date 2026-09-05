/**
 * Whether a failed mint attempt may be tried again.
 *
 * A timeout is not a failure: the transaction can still land after the
 * deadline, and a second attempt on top of it is a second NFT for the same
 * observation. Only an error that says the first transaction never executed
 * is safe to retry — a blockhash that expired, a simulation that refused, an
 * RPC that was unreachable.
 */
export function shouldRetryMint(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return !/timeout|timed out|not confirmed|unknown if it succeeded/i.test(message);
}
