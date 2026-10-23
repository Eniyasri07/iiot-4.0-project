# Azure IoT Telemetry Dashboard

**Student Name:** ENIYASRI P  
**Roll Number:** 24EIR027  

Implementation of the **Azure IoT Hub Integration & Debugging Assignment**:
- Student name and roll number
- Azure consumer connection status
- Received ASCII values
- ASCII-to-string conversion
- Last event timestamp
- React frontend + Node/Express backend
- Backend reads Azure Event Hubs-compatible telemetry and exposes a REST API

> Important: The provided endpoint file contains a shared access key. Do not commit that key. This project intentionally reads it from a backend environment variable. If that key has already been shared or committed publicly, ask the instructor to rotate it.

## Architecture

React/Vite frontend (Vercel) → Express backend (Render, Azure App Service, or another Node host) → Azure Event Hubs-compatible endpoint.

The provided connection string includes an `EntityPath`, which is consistent with an Event Hubs-compatible consumer connection string. Confirm with your instructor that this is the expected endpoint and that the key has listen/receive permissions.

## 1. Requirements

- Node.js 20 or later
- npm
- Azure endpoint and permission to consume events
- GitHub and Vercel accounts for submission

## 2. Run locally

Open two terminals.

### Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set `AZURE_EVENTHUB_CONNECTION_STRING` to the connection string supplied by your instructor. Do not include the key in frontend variables or commit `.env`.

```bash
npm install
npm run dev
```

Backend health: http://localhost:4000/api/health
Latest telemetry: http://localhost:4000/api/telemetry

If the Azure variable is absent, the API starts in disconnected mode; it does not fabricate a live connection. If configured, the backend starts an Event Hubs consumer using the `$Default` consumer group by default.

### Frontend

In another terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

Edit `frontend/.env` only if the backend is not running on `http://localhost:4000`.

## 3. Student details

The dashboard reads:
- `VITE_STUDENT_NAME`
- `VITE_ROLL_NUMBER`

Set these in `frontend/.env` for local development. For Vercel, add them under Project → Settings → Environment Variables, then redeploy. Replace the example values with your real details.

## 4. Azure payload format

The parser supports common message shapes:
- JSON object: `{"asciiValues":[72,101,108,108,111]}`
- JSON object: `{"data":[72,101,108,108,111]}`
- JSON array: `[72,101,108,108,111]`
- Comma-separated numeric text: `72,101,108,108,111`
- Plain text such as `Hello` (shown as received text; numeric ASCII values are derived only when possible)

If your instructor's device sends a different payload shape, update `backend/src/telemetry.js` accordingly. The event timestamp uses the Azure event enqueued time when available, otherwise the backend receive time.

## 5. Deployment

### Backend deployment (required for a Vercel frontend to receive live events)

Deploy the `backend` folder to a Node.js host such as Render or Azure App Service:
- Build/install command: `npm install`
- Start command: `npm start`
- Add environment variables in the host dashboard:
  - `AZURE_EVENTHUB_CONNECTION_STRING` = supplied endpoint (secret)
  - `AZURE_EVENTHUB_CONSUMER_GROUP` = `$Default` (unless instructed otherwise)
  - `CORS_ORIGIN` = your deployed Vercel URL, e.g. `https://your-project.vercel.app`
  - `PORT` = host-provided port (usually automatic)

Do not use a frontend-only Vercel deployment as the place to run the long-lived Event Hubs consumer. Keep the secret and consumer in the backend.

### Frontend deployment to Vercel

1. Push this project to your own GitHub repository.
2. In Vercel, import that repository.
3. Set **Root Directory** to `frontend`.
4. Framework preset: Vite.
5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Add environment variables:
   - `VITE_API_BASE_URL` = deployed backend base URL, e.g. `https://your-backend.example.com` (no trailing slash)
   - `VITE_STUDENT_NAME` = your name
   - `VITE_ROLL_NUMBER` = your roll number
8. Redeploy after setting variables.

The backend must allow the exact Vercel origin in `CORS_ORIGIN`.

## 6. GitHub safety checklist

Before pushing:
- Ensure `backend/.env` is ignored.
- Never add the Azure connection string to source code, frontend environment variables, screenshots, or README.
- If the secret was committed previously, removing it from the latest commit is not sufficient; rotate the key with the instructor.

## 7. Assignment checklist

- [ ] Name and roll number are correct
- [ ] Backend reports connected only when the consumer starts successfully
- [ ] Live event timestamp updates when events arrive
- [ ] ASCII values convert to the expected string (e.g. `72,101,108,108,111` → `Hello`)
- [ ] Browser can reach backend API
- [ ] GitHub repository contains no secrets
- [ ] Vercel frontend talks to the deployed backend
- [ ] GitHub and Vercel links submitted to instructor

This project is a complete implementation scaffold, but the real live connection can only be verified with a valid, active endpoint and incoming telemetry.
