# Medicare Project Startup & Build Guide

## Services Overview

| Service | Command | Directory | Port/Target |
|---------|---------|-----------|-------------|
| Backend (local) | `npm start` | `backend/` | localhost:5000 |
| Frontend (web) | `npm run dev` | `frontend/` | localhost:3000 |
| Docker (backend + DB) | `docker compose up --build -d` | project root | localhost:5000 |
| iOS Simulator | `npx expo run:ios --device "iPhone 17"` | `mobile/` | iPhone 17 Simulator |
| Android Emulator | `npx expo run:android` | `mobile/` | Pixel 10 Pro XL |

---

## 1. Docker Build & Deployment (Backend + Database + Frontend Assets)

The application uses a multi-stage Docker build. 
* **Stage 1 (Frontend Build)**: Compiles the React/Vite frontend static files and minifies assets into a production bundle (`frontend/dist`).
* **Stage 2 (Production)**: Builds the Node.js production backend, copies the compiled frontend assets into the backend's static directory (`public`), exposes port 5000, runs database migrations, and boots the backend.

### Commands:
```bash
# Start Docker Desktop first
open -a Docker

# Navigate to the workspace root directory
cd /Users/admin/Desktop/project/Medicare-Integration

# Build and run the containers in detached mode
docker compose up --build -d

# Verify containers are running and healthy
docker compose ps

# (Optional) Seed the database with default users, doctors, and appointments
docker compose exec app npm run seed
```

* **`medicare-db`**: Postgres database (runs internally, isolated inside the Docker network).
* **`medicare-app`**: Production server running on port 5000.

---

## 2. Mobile App Build & Bundling

The mobile application is built using Expo Prebuild and React Native. It uses native modules (such as CometChat SDK wrappers, WebRTC, and Jitsi dependencies) and therefore requires native compilation on simulators/emulators rather than sandboxed Expo Go.

### iOS Build & Launch:
```bash
cd /Users/admin/Desktop/project/Medicare-Integration/mobile

# Build and run the app on the specified simulator
npx expo run:ios --device "iPhone 17"
```

### Android Build & Launch:
```bash
# Start emulator manually with correct SDK root environment variables
ANDROID_HOME=$HOME/Library/Android/sdk \
ANDROID_SDK_ROOT=$HOME/Library/Android/sdk \
$HOME/Library/Android/sdk/emulator/emulator @Pixel_10_Pro_XL

# Then in a separate terminal:
cd /Users/admin/Desktop/project/Medicare-Integration/mobile
npx expo run:android
```

### Tips & Tricks:
* **Metro Bundle Reloading**: If you make JavaScript/React changes while the simulator is running, focus the terminal running Metro and press `r` to reload the bundle on the active device without a full native rebuild.
* **Force Bundle Refresh**: If changes are not displaying or have caching issues, stop Metro and launch it with:
  ```bash
  npx expo start --clear
  ```

---

## 3. Local Development (No Docker)

If developing the backend or frontend locally without Docker:

### Local Backend:
```bash
cd /Users/admin/Desktop/project/Medicare-Integration/backend
npm install
npm start
```
*Note: Ensure Docker is stopped (`docker compose down`) first to avoid port 5000 conflicts.*

### Local Web Frontend:
```bash
cd /Users/admin/Desktop/project/Medicare-Integration/frontend
npm install
npm run dev
```
Vite development server will launch at http://localhost:3000.

---

## Stopping Services

```bash
# Stop Docker containers
docker compose down

# Kill Android emulator processes
pkill -f "emulator.*Pixel_10_Pro_XL"
```
