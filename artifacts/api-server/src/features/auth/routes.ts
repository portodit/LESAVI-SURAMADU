import { Router, type IRouter } from "express";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { comparePassword, requireAuth } from "../../shared/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email dan password wajib diisi" });
    return;
  }

  const [user] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Email atau password salah" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email atau password salah" });
    return;
  }

  (req as any).session.userId = user.id;
  (req as any).session.userEmail = user.email;
  (req as any).session.userRole = user.role;

  res.json({ id: user.id, email: user.email, role: user.role });
});

router.post("/auth/logout", (req, res): void => {
  (req as any).session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const session = (req as any).session;
  res.json({ id: session.userId, email: session.userEmail, role: session.userRole });
});

export default router;
