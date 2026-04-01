# DOPEST RUNNERS — Production PWA
## Stockholm Running Community — QR Check-in App

---

## FILE STRUCTURE

```
dopest-runners/
├── .env.example                    ← copy to .env.local and fill in
├── firebase.json                   ← Firebase project config
├── firestore.rules                 ← Firestore security rules
├── firestore.indexes.json          ← Required composite indexes
├── storage.rules                   ← Firebase Storage rules
├── next.config.js
├── package.json
├── tsconfig.json
│
├── public/
│   ├── manifest.json               ← PWA manifest
│   ├── sw.js                       ← Service worker (offline + caching)
│   ├── favicon.svg
│   └── icons/                      ← All PWA icons (SVG, all sizes)
│
├── scripts/
│   ├── seed-admin.ts               ← Run ONCE to create admin account
│   └── generate-icons.js           ← Helper for PNG icon generation
│
└── src/
    ├── middleware.ts               ← Edge route protection
    ├── context/
    │   └── AuthContext.tsx         ← Firebase auth state + Firestore profile
    ├── lib/
    │   ├── firebase.ts             ← Client SDK (safe for browser)
    │   ├── firebase-admin.ts       ← Admin SDK (server-only)
    │   ├── auth.ts                 ← Login, register, update profile
    │   └── qr.ts                   ← JWT token generation + verification
    ├── components/
    │   ├── layout/BottomNav.tsx
    │   └── ui/index.tsx            ← Toast, StatCard, LevelDisplay, Avatar...
    └── app/
        ├── layout.tsx              ← Root layout (PWA meta, AuthProvider)
        ├── globals.css             ← Global design system
        ├── (auth)/
        │   ├── login/page.tsx      ← Login (users + admin shorthand)
        │   └── register/page.tsx   ← 3-step registration
        ├── (app)/                  ← Protected user pages
        │   ├── layout.tsx          ← Auth guard + PWA install banner
        │   ├── home/page.tsx
        │   ├── checkin/page.tsx    ← QR scanner (real camera + demo mode)
        │   ├── stats/page.tsx      ← Monthly chart + streak
        │   └── profile/page.tsx    ← Editable profile + avatar upload
        ├── admin/
        │   └── page.tsx            ← Admin panel (sessions, QR, members)
        └── api/
            ├── auth/verify-admin/route.ts  ← Sets HttpOnly session cookies
            ├── session/route.ts            ← Create session + QR token
            └── checkin/route.ts            ← Validate QR + write check-in
```

---

## SETUP — STEP BY STEP

### 1. Clone and install

```bash
git clone <your-repo>
cd dopest-runners
npm install
cp .env.example .env.local
```

---

### 2. Create a Firebase project

1. Go to https://console.firebase.google.com
2. Create a new project (e.g. `dopest-runners`)
3. Enable these services:
   - **Authentication** → Sign-in method → Email/Password ✓
   - **Firestore Database** → Start in production mode
   - **Storage** → Start in production mode

---

### 3. Fill in environment variables

Open `.env.local` and fill in every value:

#### Firebase Client (from Firebase Console → Project Settings → Your apps → Web app)
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

#### Firebase Admin SDK (from Firebase Console → Project Settings → Service accounts → Generate new private key)
```
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
⚠️  The private key must be wrapped in double quotes with literal `\n` for newlines.

#### QR Secret (generate once, keep secret)
```bash
# Generate a secure secret:
openssl rand -base64 48
```
```
QR_JWT_SECRET=paste_output_here
```

#### Admin seed credentials
```
ADMIN_SEED_EMAIL=7178058@dopestrunners.app
ADMIN_SEED_PASSWORD=7178058
ADMIN_SEED_NAME=Head Admin
```

---

### 4. Deploy Firestore rules and indexes

```bash
# Install Firebase CLI if you haven't
npm install -g firebase-tools
firebase login
firebase use --add   # select your project

# Deploy rules
firebase deploy --only firestore:rules,firestore:indexes,storage
```

---

### 5. Create the admin account (run ONCE)

```bash
npx tsx scripts/seed-admin.ts
```

This will:
- Create a Firebase Auth user with email `7178058@dopestrunners.app`
- Hash and store the password `7178058` via Firebase (bcrypt, server-side)
- Write a Firestore user doc with `isAdmin: true`
- Set a custom claim `isAdmin: true` on the Firebase Auth token

The script is idempotent — safe to run again if needed.

---

### 6. Start development

```bash
npm run dev
# → http://localhost:3000
```

**Admin login:**
- Go to `/login`
- Enter `7178058` as the identifier (app auto-appends `@dopestrunners.app`)
- Password: `7178058`

**Regular user:**
- Go to `/login` → CREATE ACCOUNT
- Fill in the registration form

---

### 7. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

In the Vercel dashboard, add all environment variables from `.env.local` under
**Project Settings → Environment Variables**.

Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://dopestrunners.app`).

---

## SECURITY MODEL

| Layer | Mechanism |
|---|---|
| Password storage | Firebase Auth (bcrypt + salt, server-side) — never stored by this app |
| Session auth | HttpOnly `__session` cookie (Firebase session cookie, revocable) |
| Admin verification | Firebase custom claim `isAdmin: true` verified on every API call |
| Route protection | Next.js Edge middleware reads cookies before rendering |
| QR token | Signed JWT (HS256), 2h expiry, verified server-side |
| Duplicate check-in | Firestore compound query before write |
| Atomic writes | Firestore batch (check-in + session counter + user stats) |
| Data access | Firestore security rules — clients never write sessions/check-ins directly |

---

## HOW ADMIN LOGIN WORKS

```
User types "7178058" in the login form
        ↓
loginUser() in src/lib/auth.ts:
  - detects no "@" → appends "@dopestrunners.app"
  - calls Firebase signInWithEmailAndPassword()
  - Firebase verifies the bcrypt hash server-side
        ↓
On success, client calls POST /api/auth/verify-admin:
  - Server verifies the Firebase ID token
  - Reads isAdmin custom claim from the token
  - Creates a Firebase session cookie (httpOnly, 14 days)
  - Sets __isAdmin cookie (readable by Edge middleware)
        ↓
Middleware reads __session + __isAdmin on every /admin request
Admin sees the full admin panel at /admin
```

---

## QR CHECK-IN FLOW

```
Admin creates session → POST /api/session
  → Generates JWT: { sessionId } signed with QR_JWT_SECRET, expires 2h
  → Stores token in Firestore sessions/{id}
  → Returns QR image URL

Admin displays QR on phone/screen at the run start

User opens /checkin → taps SCAN QR CODE
  → html5-qrcode activates device camera
  → Camera reads QR → extracts JWT string

User's browser → POST /api/checkin { token }
  Server:
    1. Verifies user session cookie
    2. jwt.verify(token, QR_JWT_SECRET) → extracts sessionId
    3. Checks sessions/{sessionId} exists
    4. Queries checkins where userId==uid AND sessionId==sessionId → must be empty
    5. Batch write: new checkin + increment session.participantCount + update user stats
  → Returns { success, location, date }

User sees ✓ CHECK-IN CONFIRMED screen
```

---

## PWA INSTALL

The app is fully installable on mobile:

- `manifest.json` with all required icon sizes
- Service worker at `/sw.js` with offline caching
- Theme color `#000000`, standalone display mode
- iOS meta tags for "Add to Home Screen"
- An in-app install banner appears automatically when the browser fires `beforeinstallprompt`

For **iOS**: tap the Share button → "Add to Home Screen"
For **Android**: Chrome will show an install prompt automatically

---

## FUTURE ROADMAP

- Push notifications (Firebase Cloud Messaging) — notify users before sessions
- Leaderboard — top attendees per month
- Pace groups — admin assigns runners to groups
- Strava/Garmin sync — auto-import run data
- Session photos — runners upload post-run photos
- Multi-city support — location-based session discovery
- Challenge system — "10 sessions in 30 days" badges
