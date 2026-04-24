# LESAVI-SURAMADU Workspace

This project is a modern full-stack application managed as a PNPM Monorepo. 

## 📂 Project Structure

This monorepo is divided into main applications (`artifacts/`) and shared modules (`lib/`).

### 🛠️ 1. Applications (`artifacts/`)
These are the deployable, standalone applications in the project.

- **`artifacts/lesavi-dashboard/`**: The primary frontend interface. Built with React, Vite, TailwindCSS, and Shadcn UI components.
  - `src/pages/`: Contains the route-level page components.
  - `src/components/`: Reusable, generic UI components (e.g., buttons, modals).
  - `src/features/`: Feature-specific logic, combining state and components.
- **`artifacts/api-server/`**: The backend REST API built with Express.js. It handles business logic, database operations (Drizzle ORM), and authentication.
  - `src/routes/`: API endpoint definitions.
  - `src/features/`: Modular backend features (e.g., user management).
  - `src/middlewares/`: Express middlewares (cors, auth verification).
  - `src/lib/`: Internal backend utilities and services.
- **`artifacts/mockup-sandbox/`**: A sandbox workspace, likely used for testing UI layouts or isolated experiments without affecting the main app.

### 🧩 2. Shared Packages (`lib/`)
These are internal packages that are shared across various apps (frontend and backend). They enforce consistency and prevent code duplication.

- **`lib/db/`**: Handles the Database connection, Drizzle ORM configuration, schema definitions, and migrations.
- **`lib/api-zod/`**: Contains shared `zod` schemas. This ensures your frontend forms and backend API payload validation use the exact same type-safe logic.
- **`lib/api-spec/`**: API specifications and contracts ensuring safe communication between client and server.
- **`lib/api-client-react/`**: React Query hooks and custom fetch utilities used by `lesavi-dashboard` to query your `api-server`.

---

## 🔌 Where should I put certain APIs? (e.g., Google Drive)

Adding a third-party integration like the **Google Drive API** mainly concerns communicating with an external service securely. This should be executed on the backend to keep API secrets safe.

You have two recommended approaches based on how reusable you want the code to be:

### Approach A: Directly in the API Server (Recommended for quick, app-specific use)
Use this if the Google Drive SDK will *only* be used by the `api-server` (e.g., uploading a user's file via an Express endpoint).

- **Location:** the `api-server` directory.
- **File Path:** Create a service file like `artifacts/api-server/src/lib/gdrive.ts` or create a new feature folder like `artifacts/api-server/src/features/gdrive/`.
- **Note:** Ensure your Google SDK dependencies (e.g., `googleapis`) are installed in `artifacts/api-server/package.json` (not the root).

### Approach B: As a Shared Integration Package (Recommended for scalability)
If you think the Google Drive logic might be used by multiple backend services, scripts, or worker nodes in the future, take advantage of the monorepo architecture. 

- **Location:** In a new directory under `lib/integrations/`.
- **File Path:** Create a folder `lib/integrations/gdrive/` with its own `package.json` (name it something like `"@workspace/gdrive"`) and export the core functionality. This `lib/integrations/*` path is explicitly supported in the `pnpm-workspace.yaml`.
- **Usage:** You would then import it into `api-server` by adding `"@workspace/gdrive": "workspace:*"` to its `package.json` dependencies.

---

## 🗄️ Database Changes
If you need to update a database table or add a new one:
1. Navigate to your database package at **`lib/db/`**.
2. Make your Drizzle schema changes.
3. Utilize `drizzle-kit` within that package to generate and run your migrations.

## 🚀 How to Run the App
Scripts are located at the root or within specific packages. The development environment uses `pnpm`.
- From the project root, you can filter commands using `pnpm --filter`.
- Examples:
  - Starting the frontend: `pnpm --filter @workspace/lesavi-dashboard run dev`
  - Starting the backend: `pnpm --filter @workspace/api-server run dev`

*Note: Environment variables for specific applications should go in their respective directories (e.g., `artifacts/api-server/.env`).*
