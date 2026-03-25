import bcrypt from "bcryptjs";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function ensureDefaultAdmin(): Promise<void> {
  const existing = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, "bliaditdev@gmail.com"));
  if (existing.length === 0) {
    const hash = await hashPassword("admin123");
    await db.insert(adminUsersTable).values({
      email: "bliaditdev@gmail.com",
      passwordHash: hash,
      role: "admin",
    });
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = (req as any).session;
  if (!session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
