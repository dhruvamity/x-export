# Kensho Reset Portal

Personal one-day reset portal inspired by Dan Koe's protocol, featuring Google OAuth Authentication, real-time Firebase Firestore database persistence, NVIDIA-powered AI reflection, and zero-VPS Vercel serverless deployment.

## Features

- **Google OAuth Authentication**: Gated access requiring user sign-in via Firebase Auth.
- **Real-Time Cloud Persistence**: All answers, stage progress, and AI clarity maps automatically sync in real-time to Firebase Firestore under `users/{uid}` across tabs and devices.
- **Offline / Local Backup**: Automatic fallback to local storage if offline or testing in guest mode.
- **AI Mirror Engine**: Optional NVIDIA Llama model integration providing deep, objective analysis without doing the contemplation for you.
- **One-Click Reset & Export**: Full control to clear cloud/browser state or export structured JSON summaries.
- **Vercel Serverless Ready**: Native deployment on Vercel with `/api/clarity` serverless function.

## Setup Firebase

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication > Sign-in method** and enable **Google**.
3. Navigate to **Firestore Database** and create a database. Set rules to allow authenticated user access:
   ```text
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
4. Register a Web App in your Firebase project and copy the configuration keys into `firebase-config.js` or `.env`.

## Run Locally

1. Copy `.env.example` to `.env`:
```text
NVIDIA_API_KEY=your_nvidia_api_key_here
NVIDIA_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1.5
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
PORT=8000

FIREBASE_API_KEY=your_firebase_api_key_here
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

2. Start the local server:
```bash
npm start
```

3. Open `http://127.0.0.1:8000/index.html` in your browser.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Set Environment Variables in Vercel (`FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, etc., and optional `NVIDIA_API_KEY`).
3. Deploy!
