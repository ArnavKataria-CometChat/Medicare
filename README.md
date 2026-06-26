# MediCare: Digital Health Portal & Real-Time Consultations

MediCare is a comprehensive digital health portal designed to facilitate end-to-end patient-to-doctor consultations, scheduling, medical education, and real-time communication. This branch (`cometchat-integration`) contains the complete application, integrating the core clinical portal with a real-time messaging and calling layer powered by CometChat.

---

## 🌟 Key Features

### Core Portal (Step 1)
- **Role-Based Dashboards**: Customized workflows and interfaces for **Patients**, **Doctors**, **Hospital Staff**, and **Administrators**.
- **Dynamic Doctor Directory**: Patient-facing search, filter, and scheduling tool for verified medical professionals.
- **Appointment Booking**: Dynamic slot scheduling, booking flows, and confirmation pages.
- **Health Articles Library**: Fully manageable medical content system.
- **Dedicated Admin Portal (`/admin`)**: Separate admin site for complete control over users, appointments, databases, and articles.
- **AI Medical Assistant**: Conversational AI chatbot for symptom checking and healthcare advice powered by Gemini.

### Real-Time Communications (Step 2 Integration)
- **CometChat Messaging**: Secure, instant one-on-one text/media messaging and group chats for patients and doctors.
- **Voice & Video Calling**: High-quality, HIPAA-compatible voice and video calls initiated directly by doctors.
- **Transparent User Sync**: Seamless, automatic provisioning of users and specialization tags in CometChat upon login/registration.
- **FCM Push Notifications**: Native mobile push notifications for calls and chats, bypassing Expo Go services.
- **Webhook Logger**: Dedicated admin panel for tracking and debugging real-time communication events.
- **Mobile UI Enhancements**: Optimized screens with clean headers, theme overrides, and filtered lists that hide system bot accounts.

---

## 🏗️ Project Architecture

The project is structured as a monorepo consisting of three major components:

1. **`backend/`**: Node.js, Express, Sequelize ORM (PostgreSQL), and Firebase Admin SDK.
2. **`frontend/`**: Web application built with React, Vite, and CometChat Web UIKit.
3. **`mobile/`**: iOS and Android mobile apps built with React Native (Expo) and CometChat Native SDK/UIKit.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- Xcode (for iOS builds) / Android Studio (for Android builds)
- Firebase Project (for FCM push notifications)
- CometChat App & credentials

### 1. Backend Configuration
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=medicare
JWT_SECRET=your_jwt_secret
COMETCHAT_APP_ID=your_cometchat_app_id
COMETCHAT_REGION=your_cometchat_region
COMETCHAT_AUTH_KEY=your_cometchat_auth_key
COMETCHAT_REST_API_KEY=your_cometchat_rest_key
FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", ...}'
```

### 2. Frontend Configuration
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000
VITE_COMETCHAT_APP_ID=your_cometchat_app_id
VITE_COMETCHAT_REGION=your_cometchat_region
VITE_COMETCHAT_AUTH_KEY=your_cometchat_auth_key
```

### 3. Mobile Configuration
Create a `.env` file in the `mobile/` directory:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000
EXPO_PUBLIC_COMETCHAT_APP_ID=your_cometchat_app_id
EXPO_PUBLIC_COMETCHAT_REGION=your_cometchat_region
EXPO_PUBLIC_COMETCHAT_AUTH_KEY=your_cometchat_auth_key
```

Place your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) files in the `mobile/` root directory.

---

## 🏃 Run the Application

### Docker Compose (Full Stack Dev environment)
You can spin up the complete stack, including the PostgreSQL database, using Docker:
```bash
docker-compose up --build
```

### Local Development Setup

#### Start Backend
```bash
cd backend
npm install
npm run seed  # Seed the database with sample users and articles
npm run dev
```

#### Start Web Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Start Mobile App (iOS / Android)
```bash
cd mobile
npm install

# Run iOS build on simulator or device
npx expo run:ios --configuration Release

# Run Android build (APK)
cd android && ./gradlew assembleRelease
```
