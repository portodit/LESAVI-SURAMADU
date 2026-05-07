import { defineConfig } from "drizzle-kit";
import path from "path";
<<<<<<< HEAD
=======
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
>>>>>>> origin/master

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
<<<<<<< HEAD
  schema: "./src/schema/index.ts",
=======
  schema: path.resolve(__dirname, "src/schema/index.ts"),
>>>>>>> origin/master
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
<<<<<<< HEAD
});
=======
});
>>>>>>> origin/master
