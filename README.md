# PATGROUP Workspace

Kompletní web aplikace pro správu staveb, docházky a reportů s Node.js backenderem a moderním frontendem.

## ⚡ Rychlý start

```bash
npm install  # první spuštění (Prettier)
npm start    # spustí server na http://localhost:3000
```

**Web UI:**

-   Aplikace: http://localhost:3000/app
-   Health check: http://localhost:3000/health

## 📁 Struktura projektů

```
app/index.js              → HTTP server (Node.js)
public/
  ├─ index.html           → Web UI (HTML5)
  ├─ css/style.css        → Styly (CSS3)
  └─ js/app.js            → Frontend (vanilla JS)
scripts/
  ├─ check.js             → Health check (/health)
  └─ check-server.js      → Server connectivity check (/)
data/store.json           → Persisted data (JSON)
```

## 🔌 API Endpoints

### Health & Status

-   `GET /` – Server alive check → `OK`
-   `GET /health` – Health endpoint → `OK`

### Projekty (Stavby)

-   `GET /api/projects` – Seznam všech projektů (seed: 3 stavby)

### Docházka

-   `POST /api/attendance/checkin` – Přihlášení na stavbu

    -   Request: `{ "projectId": 1, "location": {...} }`
    -   Response: `{ "status": "in", "projectId": 1, "checkedInAt": "..." }`

-   `POST /api/attendance/checkout` – Odhlášení ze stavby
    -   Response: `{ "status": "out", "durationMs": 3600000, "checkedOutAt": "..." }`

### Fotky

-   `GET /api/photos` – Seznam fotek
-   `POST /api/photos` – Nová fotka
    -   Request: `{ "image": "base64...", "description": "...", "projectId": 1 }`

### Reporty & Protokoly

-   `POST /api/reports` – Vytvoření reportu
-   `POST /api/protocols` – Vytvoření protokolu s digitálním podpisem

## 🎯 Web UI Features

-   **Dashboard** – Přehled aktivního projektu, stav docházky
-   **Stavby** – Výběr a filtrování projektů
-   **Docházka** – Check-in/out s GPS tolerancí
-   **Fotky** – Fotoaparát, upload, galerie
-   **Reporty** – Templaty pro denní, bezpečnostní, kvalitativní reporty
-   **Protokoly** – Předání staveniště, kontrola základů, dokončení etapy s digitálním podpisem
-   **Čas** – Přehled odpracovaných hodin
-   **Nastavení** – Export/import dat, mazání

## 🔒 Data Persistence

-   **Lokální úložiště:** `data/store.json` (JSON)
-   **Co se ukládá:**
    -   Fotky (base64), reporty, protokoly
    -   Stav docházky (check-in/out časy)
    -   **Pozn.:** Projekty (seed) se neukládají, vždy z defaults
-   **Automaticky:** Při každém zápisu (check-in, nová fotka, atd.)

## 🛠️ Vývoj & Testování

### Formátování

```bash
npm run format  # Prettier (4-space indentation)
```

### Testy (Health Checks)

```bash
npm test              # Spustí check.js + check-server.js
npm run check         # pouze /health
npm run check-server  # pouze /
```

**Exit kódy:**

-   `0` – Success
-   `2` – Unexpected response
-   `3` – Network error

### VS Code Tasks

-   `Ctrl+Shift+B` → Format: Prettier
-   `Ctrl+Shift+D` → Start: Server (background)

## ⚙️ Konfigurace

### Node Server (Port)

```bash
npm start          # Port 3000 (default)
PORT=8080 npm start # Port 8080 (custom)
```

### Environment Variables

-   `PORT` – Server port (default: 3000)
-   `NODE_ENV` – Automaticky `production` na Render.com

## 📦 Dependencies

**Production:**

-   Node.js http (built-in)
-   Node.js fs, path (built-in)

**Development:**

-   prettier ^2.8.8

## 🚀 Deployment (Render.com)

```yaml
# render.yaml (auto-detected)
services:
    - type: web
      name: patgroup-server
      runtime: node
      buildCommand: npm install
      startCommand: npm start
      envVars:
          - key: PORT
            value: 10000
          - key: NODE_ENV
            value: production
      healthCheckPath: /health
```

**Live:** https://patgroup-server.onrender.com (if deployed)

## ✅ Checklist

-   [x] HTTP server (health check, static files, API)
-   [x] Frontend (HTML5, CSS3, vanilla JS)
-   [x] API endpoints (projects, attendance, photos, reports, protocols)
-   [x] Data persistence (JSON file)
-   [x] Geolocation + GPS distance tolerance
-   [x] Camera/photo capture (Web API)
-   [x] Digital signature canvas
-   [x] Responsive design (mobile-first)
-   [x] Error handling & validation
-   [x] Health checks (scripts + npm test)
-   [x] Code formatting (Prettier + EditorConfig)
-   [x] No external dependencies (vanilla JS + Node built-ins)

## 📝 Doporučená rozšíření (VS Code)

-   github.copilot-chat
-   eamodio.gitlens
-   esbenp.prettier-vscode
-   dbaeumer.vscode-eslint
-   ms-python.python
-   redhat.vscode-yaml

## 📄 Licenční informace

ISC License © PATGROUP
