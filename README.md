# MediCare: Digital Health Portal

MediCare is a comprehensive digital health portal designed to facilitate end-to-end patient-to-doctor consultations, scheduling, and medical education. This branch (`main`) contains the core clinical portal application (Step 1), serving as a foundation before any real-time communication layer is added.

---

## 🌟 Key Features

### Core Portal (Step 1)
- **Role-Based Dashboards**: Custom portals and navigation flows for three primary user roles: **Patients**, **Doctors**, and **Hospital Staff**.
- **Dynamic Doctor Directory**: Patient-facing doctor discovery interface supporting searches, department filtering, credentials, bios, and real-time slot bookings.
- **Appointment Booking**: Integrated calendar scheduling flow, bookings creation, and appointment confirmation flows.
- **Medical Articles Library**: Health education and preventive care articles library.
- **Dedicated Admin Portal (`/admin`)**: A separate, isolated admin site allowing system operators to manage user directory, doctors, clinics, appointments, database seeding, and medical articles.
- **AI Medical Assistant**: Conversational AI chatbot for symptom checking and healthcare advice powered by Gemini.

---

## 🏗️ Project Architecture

The project is structured as a monorepo consisting of three major components:

1. **`backend/`**: Node.js, Express, Sequelize ORM (PostgreSQL), and Gemini API.
2. **`frontend/`**: Web application built with React, Vite, and custom CSS styling.
3. **`mobile/`**: iOS and Android mobile apps built with React Native (Expo) and React Navigation.

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose
- Xcode (for iOS builds) / Android Studio (for Android builds)

### 1. Backend Configuration
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=medicare
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Frontend Configuration
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Mobile Configuration
Create a `.env` file in the `mobile/` directory:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000
```

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
