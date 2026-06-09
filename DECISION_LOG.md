# Decision Log — MediCare

This log outlines alternative design options, evaluations, and reasoning behind key architectural decisions made for the MediCare production-ready web application (Step 1).

---

## 1. Authentication & Session Strategy: JWT vs. Stateful Express-Sessions

* **Alternates Evaluated**:
  * **Option A**: Express-Session utilizing `connect-pg-simple` storage.
  * **Option B**: JSON Web Tokens (JWT) stored in Client-side LocalStorage.
* **Decision**: **Option B (JSON Web Tokens)**.
* **Reasoning**:
  * Since the admin portal requires complete isolation at `/admin` (separate router routes, layout systems, and page structures), JWT authorization payloads simplify sending authenticated role scopes (`ADMIN` vs. `PATIENT` / `DOCTOR` / `STAFF`) to both UI routes and backend API endpoints.
  * JWT matches stateless RESTful design guidelines, removing server memory constraints or state syncs.
  * Security is enforced by signing tokens with a secure HS256 secret (`JWT_SECRET`) and checking roles within centralized Express middlewares.

---

## 2. Frontend Routing Strategy: React-Router-Dom vs. Stateful Zero-Dependency Routing

* **Alternates Evaluated**:
  * **Option A**: Full configuration of `@remix-run` / `react-router-dom`.
  * **Option B**: Custom stateful React history router inside `App.jsx`.
* **Decision**: **Option B (Custom Stateful History Router)**.
* **Reasoning**:
  * Custom stateful routing prevents library mismatch version breaks during early local dependencies configurations.
  * Gives 100% control over page guards, layout injections, and cross-navigation parameters.
  * Zero-dependency solution that responds instantly to browser `popstate` events, maintaining history states.

---

## 3. UI Styling: Vanilla CSS (Custom Properties) vs. Tailwind CSS

* **Alternates Evaluated**:
  * **Option A**: Tailwind CSS.
  * **Option B**: Custom Vanilla CSS with Design System Tokens.
* **Decision**: **Option B (Vanilla CSS)**.
* **Reasoning**:
  * Keeps markup layout structures clean from cluttered utility strings.
  * Standard instructions recommend Vanilla CSS for maximum flexibility.
  * Custom variables (`--bg-glass`, `--primary-glow`, `--text-secondary`) facilitate writing a coherent, premium glassmorphism theme that is fully responsive.

---

## 4. AI Assistant Processor: Third-Party LLM vs. Hybrid NLP Keyword Classifier

* **Alternates Evaluated**:
  * **Option A**: Strict external LLM wrapper (errors if no API key is specified).
  * **Option B**: Hybrid parser matching keywords to specializations, redirect rules, and medical disclaimers, with toggle to call live API if keys are defined.
* **Decision**: **Option B (Hybrid NLP Classifier)**.
* **Reasoning**:
  * Prevents application failure in local dev environments lacking Anthropic/Gemini active API keys.
  * Provides accurate routing redirects (e.g. mapping "chest pain" -> Cardiology -> booking form) because the localized classifier queries the live PostgreSQL database for available doctors in that specialty group.

---

## 5. Health Records Storage: Local disk uploads vs. Cloud S3 Storage

* **Alternates Evaluated**:
  * **Option A**: Direct file streaming to AWS S3.
  * **Option B**: Local storage using Multer inside `/uploads` folder, saving metadata references inside database.
* **Decision**: **Option B (Local Uploads)**.
* **Reasoning**:
  * Out-of-scope conditions explicitly exclude external integrations for Step 1.
  * Disk storage is easy to deploy locally, is secured behind user auth checks, and provides high-speed mock transfers.
