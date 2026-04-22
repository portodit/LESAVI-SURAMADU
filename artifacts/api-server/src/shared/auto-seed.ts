import { ensureDefaultSeed } from "./seed";

export async function ensureFullSeed(): Promise<void> {
  await ensureDefaultSeed();
  // NOTE: seedFunnelApr22 disabled — Excel 53MB (77K rows) causes OOM on production
  // (~1914MB heap vs 1024MB limit). Use the import UI to upload new funnel data.
}
