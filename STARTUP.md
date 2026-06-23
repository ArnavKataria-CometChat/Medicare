# Medicare Project Startup Guide

## Services Overview

| Service | Command | Directory | Port/Target |
|---------|---------|-----------|-------------|
| Backend (local) | `npm start` | `backend/` | localhost:5000 |
| Frontend (web) | `npm run dev` | `frontend/` | localhost:3000 |
| Docker (backend + DB) | `docker compose up --build -d` | project root | localhost:5000 |
| iOS Simulator | `npx expo run:ios --device "iPhone 17"` | `mobile/` | iPhone 17 Simulator |
| Android Emulator | `npx expo run:android` | `mobile/` | Pixel 10 Pro XL |

## Startup Steps

### 1. Docker (Backend + PostgreSQL)

```bash
# Start Docker Desktop first
open -a Docker

# Wait for Docker daemon to be ready, then:
cd /Users/admin/Desktop/project/Medicare
docker compose up --build -d
```

- `medicare-db`: Postgres 16 (internal only, no host port)
- `medicare-app`: Node.js backend on port 5000 (production mode)

### 2. Local Backend (Development)

```bash
cd /Users/admin/Desktop/project/Medicare/backend
npm start
```

Runs on port 5000. Note: conflicts with Docker backend if both are running on the same port.

### 3. Web Frontend

```bash
cd /Users/admin/Desktop/project/Medicare/frontend
npm run dev
```

Vite dev server at http://localhost:3000

### 4. iOS Simulator

iPhone 17 simulator is typically already booted.

```bash
cd /Users/admin/Desktop/project/Medicare/mobile
npx expo run:ios --device "iPhone 17"
```

### 5. Android Emulator

The AVD is `Pixel_10_Pro_XL`. The emulator must be started with the correct SDK root.

```bash
# Start emulator manually (required due to SDK path issue)
ANDROID_HOME=$HOME/Library/Android/sdk \
ANDROID_SDK_ROOT=$HOME/Library/Android/sdk \
$HOME/Library/Android/sdk/emulator/emulator @Pixel_10_Pro_XL

# Then in a separate terminal:
cd /Users/admin/Desktop/project/Medicare/mobile
npx expo run:android
```

## Known Issues

- **Android emulator SDK path**: The homebrew-installed emulator at `/opt/homebrew/share/android-commandlinetools/emulator/emulator` resolves the wrong SDK root. Always launch using `$HOME/Library/Android/sdk/emulator/emulator` with explicit `ANDROID_SDK_ROOT`.
- **Port conflict**: Docker backend and local `npm start` both use port 5000. Run only one at a time, or stop Docker with `docker compose down`.
- **Android emulator lock**: If you get "Running multiple emulators with the same AVD", kill existing emulator processes first: `pkill -f "emulator.*Pixel_10_Pro_XL"`

## Stopping Services

```bash
# Stop Docker
docker compose down

# Kill Android emulator
pkill -f "emulator.*Pixel_10_Pro_XL"

# Other processes: Ctrl+C in their respective terminals
```
