# Deploying RMC Seva Portal on GCP + Firebase

## Architecture

```
Firebase Hosting (dist/)  ──►  static pages (landing, citizen, login, dashboard)
        │
        └── /api/**  ──►  Cloud Run (Express API)
                              │
                              ├── Firestore (suggestions, geocodes)
                              ├── Firebase Auth (officer tokens verified server-side)
                              └── Gemini + Google Maps APIs
```

Reference data (`data/areaWardMapping.json`, `data/wardBoundaries.geojson`) ships with the API container.

## 1. Firebase project setup

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication → Email/Password** and create officer accounts
3. Enable **Firestore** (production mode, then deploy rules)
4. Register a **Web app** and copy config into `.env` (`VITE_FIREBASE_*`)
5. Generate a **service account key** (Project Settings → Service accounts) for local dev, or use ADC on Cloud Run

```bash
firebase login
firebase use your-project-id
firebase deploy --only firestore:rules
```

## 2. Local development

```bash
cp .env.example .env
# Fill in all keys

npm install
npm run migrate        # optional: import suggestions.json → Firestore
npm start              # API :3000 + Vite :5173
```

## 3. Deploy API to Cloud Run

```bash
gcloud builds submit --config cloudbuild.yaml
```

Or manually:

```bash
docker build -t gcr.io/PROJECT_ID/rmc-seva-api .
docker push gcr.io/PROJECT_ID/rmc-seva-api
gcloud run deploy rmc-seva-api \
  --image gcr.io/PROJECT_ID/rmc-seva-api \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=PROJECT_ID,NODE_ENV=production \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest
```

Grant the Cloud Run service account **Firebase Admin** / **Cloud Datastore User** roles.

## 4. Deploy frontend to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Update `firebase.json` → `hosting.rewrites` → `run.serviceId` to match your Cloud Run service name.

## 5. Secret Manager (recommended)

```bash
echo -n "your-key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your-key" | gcloud secrets create GOOGLE_MAPS_API_KEY --data-file=-
```

## Project structure

```
src/
  server/           Express API (routes, services, middleware)
  shared/           Ward data shared constants
data/               Static RMC reference data (GIS, area registry)
firebase/           Firestore rules & indexes
scripts/            Migration & GIS pipeline tools
dist/               Vite build output (Firebase Hosting)
```
