export default function handler(req, res) {
  const envConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyBYKaYDoPBfOKGZTluJ1IeYQuUiTM-rz40",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "resetprotocol.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "resetprotocol",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "resetprotocol.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "84265434159",
    appId: process.env.FIREBASE_APP_ID || "1:84265434159:web:50d67d7ca2e09b818b1ada"
  };

  res.setHeader("Content-Type", "text/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  return res.status(200).send(`window.FIREBASE_CONFIG = ${JSON.stringify(envConfig, null, 2)};`);
}
