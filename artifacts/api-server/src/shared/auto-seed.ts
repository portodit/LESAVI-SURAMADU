import { ensureDefaultSeed } from "./seed";
import { seedFunnelApr22 } from "../seeds/seed-funnel-apr22.js";

export async function ensureFullSeed(): Promise<void> {
  await ensureDefaultSeed();
  await seedFunnelApr22();
}
