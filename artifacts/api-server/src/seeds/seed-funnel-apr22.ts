import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { db, dataImportsTable, salesFunnelTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { importFunnel } from "../features/gdrive/importer.js";
import { logger } from "../shared/logger.js";

const APR22_FILE_NAME = "MyTENS_Sales_Funnel_Form_140426_1776820028654.xlsx";
const APR22_SNAPSHOT  = "2026-04-22";
const APR22_PERIOD    = "2026-04";

// __dir is the COMPILED bundle directory at runtime (artifacts/api-server/dist/)
// or the source file directory in tsx dev (artifacts/api-server/src/seeds/)
const __dir = dirname(fileURLToPath(import.meta.url));

function findApr22File(): string | null {
  const candidates = [
    // Production compiled bundle: dist/ → api-server/ → artifacts/ → workspace root
    resolve(__dir, "../../../attached_assets", APR22_FILE_NAME),
    // TSX dev source: src/seeds/ → src/ → api-server/ → artifacts/ → workspace root
    resolve(__dir, "../../../../attached_assets", APR22_FILE_NAME),
    // CWD-based: if server starts from artifacts/api-server/
    resolve(process.cwd(), "../../attached_assets", APR22_FILE_NAME),
    // CWD-based: if server starts from workspace root
    resolve(process.cwd(), "attached_assets", APR22_FILE_NAME),
    // Absolute path for Replit dev environment
    "/home/runner/workspace/attached_assets/" + APR22_FILE_NAME,
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      logger.info({ path: p }, "[seed-funnel-apr22] Found Excel file");
      return p;
    }
  }
  logger.warn({ candidates }, "[seed-funnel-apr22] File not found in any candidate path");
  return null;
}

export async function seedFunnelApr22(): Promise<void> {
  // Skip if we already have a snapshot from Apr 22 or later
  const existing = await db
    .select({ id: dataImportsTable.id, snapshotDate: dataImportsTable.snapshotDate })
    .from(dataImportsTable)
    .where(and(
      eq(dataImportsTable.type, "funnel"),
      sql`snapshot_date >= '2026-04-22'`,
    ))
    .limit(1);

  if (existing.length > 0) {
    logger.info({ id: existing[0].id, snapshotDate: existing[0].snapshotDate }, "[seed-funnel-apr22] Already have Apr22+ snapshot — skip");
    return;
  }

  const filePath = findApr22File();
  if (!filePath) {
    logger.warn("[seed-funnel-apr22] April 22 Excel file not found — skipping auto-import");
    return;
  }

  logger.info({ filePath }, "[seed-funnel-apr22] Starting auto-import of April 22 funnel data…");

  // Delete old April 2026 funnel import (if any) to avoid period conflict
  const [oldImport] = await db
    .select({ id: dataImportsTable.id })
    .from(dataImportsTable)
    .where(and(eq(dataImportsTable.type, "funnel"), eq(dataImportsTable.period, APR22_PERIOD)))
    .limit(1);

  if (oldImport) {
    await db.delete(salesFunnelTable).where(eq(salesFunnelTable.importId, oldImport.id));
    await db.delete(dataImportsTable).where(eq(dataImportsTable.id, oldImport.id));
    logger.info({ id: oldImport.id }, "[seed-funnel-apr22] Deleted old funnel import for 2026-04");
  }

  // Read Excel file
  const XLSX = require("xlsx");
  const buf = readFileSync(filePath);
  const wb = XLSX.read(buf, { cellFormula: false, cellHTML: false });
  const rawRows: any[] = XLSX.utils.sheet_to_json(wb.Sheets["Data"], { defval: null, raw: true });
  const rows = rawRows.map((r: any) => {
    const o: any = {};
    for (const k of Object.keys(r)) o[k.trim()] = r[k];
    return o;
  });

  logger.info({ rowCount: rows.length }, "[seed-funnel-apr22] Rows read from Excel");

  const result = await importFunnel(rows as any, "local:" + filePath, APR22_PERIOD, APR22_SNAPSHOT, filePath);
  logger.info({ result }, "[seed-funnel-apr22] Import done ✓");
}
