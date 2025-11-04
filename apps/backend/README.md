🌿 **GrowGram Backend**

Willkommen beim **Backend von GrowGram** – einer modernen Social Media Plattform für die Cannabis-Community.  
Dieses Backend ist vollständig mit **TypeScript**, **Express**, **Firebase Firestore**, **SendGrid** und **JWT** aufgebaut – robust, sicher und skalierbar wie bei TikTok, Instagram oder Facebook.

---

## ✅ Features

- ✅ Benutzerregistrierung mit Altersverifikation (18+)
- ✅ E-Mail-Verifizierung via SendGrid
- ✅ JWT-Token-Authentifizierung
- ✅ Firestore als Datenbank
- ✅ Modularer Code mit `controllers`, `middleware`, `services`, `utils`
- ✅ Professionelle Projektstruktur für Skalierbarkeit

---

## 🗂️ Projektstruktur

\`\`\`bash
GrowGramBackend/
├── src/
│   ├── config/               # Firebase-Konfiguration
│   │   └── firebase.ts
│   ├── controllers/          # Auth- & Verifizierungs-Controller
│   ├── middleware/           # Middleware, Validation
│   ├── models/               # Firestore-Datenmodelle
│   ├── routes/               # API-Routen
│   ├── services/             # SendGrid & andere Services
│   ├── utils/                # JWT, Validatoren
│   └── index.ts              # Entry Point der App
├── .env                      # Umgebungsvariablen
├── package.json
├── tsconfig.json
└── README.md
\`\`\`
