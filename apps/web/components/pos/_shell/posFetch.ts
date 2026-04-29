import { recordFetchFailure, recordFetchSuccess } from "./status";

/**
 * fetch() wrapper that records latency + success/failure into the POS status
 * store. Use this everywhere the POS UI calls an API so the status chip stays
 * accurate without each caller having to instrument itself.
 *
 * - HTTP success (res.ok) → recordFetchSuccess(latency)
 * - HTTP error or network throw → recordFetchFailure()
 *
 * Returns the same Response the underlying fetch returns. Throws the same
 * errors. Identical contract — just instrumented.
 */
export async function posFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const start = performance.now();
  try {
    const res = await fetch(input, init);
    const ms = performance.now() - start;
    if (res.ok) {
      recordFetchSuccess(ms);
    } else {
      recordFetchFailure();
    }
    return res;
  } catch (err) {
    recordFetchFailure();
    throw err;
  }
}
