# MediCare Mobile Application (Expo)

This folder contains the React Native Expo mobile application for the MediCare portal, optimized for Android (emulator) and iOS (physical iPhone).

## Features Replicated
- **Patient Dashboard**: Navigation cards, metrics, and security reminders.
- **Doctor Dashboard**: Scheduled visits overview and profile options.
- **Find Doctors**: Specialty tags filtering and list views.
- **AI Health Advisor**: Real-time AI consultation chat bubble interface with pre-suggested chips.
- **Document Manager**: Attachment uploads (reports, lab sheets) using the document picker and deleting records.
- **Date Inputs**: Month and Day manual inputs with current-year appending, preventing calendar popups.
- **Inline Error Handlers**: Exclamation circles with validation status alerts under inputs (Email validation `s@s.a`, Phone sizes, Password lengths).

---

## Getting Started

### 1. Install Dependencies
Navigate to this folder in your terminal and run:
```bash
npm install
```

### 2. Run the Backend & Database
Ensure your PostgreSQL server is active, and launch the server scripts at the root directory of the repository:
```bash
# In the project root:
.\run_medicare.bat
```

### 3. Launch Expo Metro Bundler
In this directory (`mobile/`), run:
```bash
npx expo start
```

### 4. Connect Emulator & Physical Devices
- **Android Emulator**: Run your emulator and press `a` in the Expo terminal. It connects to the host machine through `http://10.0.2.2:5000`.
- **Physical iPhone**: Install **Expo Go** from the App Store. Connect both the computer and iPhone to the same Wi-Fi network, then scan the QR code in your terminal. The app will automatically connect to your computer's local IP address.
