# 🚀 SPUŠTĚNÍ APLIKACE PATGROUP

## ✅ RYCHLÝ START

### 1. Spuštění serveru (v PowerShell):

```powershell
# Varianta A: V novém okně (doporučeno)
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$PWD'; node app/index.js"

# Varianta B: Přímo v terminálu (blokuje terminál)
node app/index.js
```

### 2. Otevři aplikaci v prohlížeči:

```
http://localhost:3000/app/
```

### 3. Test API:

```powershell
# Test zdraví serveru
node scripts/check-server.js

# Test API projektů
Invoke-RestMethod -Uri http://localhost:3000/api/projects -Method Get
```

---

## 📋 KONFIGURACE

### Porty:

-   **Výchozí port:** `3000`
-   **Změna portu:** `$env:PORT=8080; node app/index.js`

### API Endpointy:

-   `GET /` - Health check
-   `GET /health` - Health check
-   `GET /app/` - Webová aplikace
-   `GET /api/projects` - Seznam projektů
-   `POST /api/attendance/checkin` - Check-in na projekt
-   `POST /api/attendance/checkout` - Check-out z projektu
-   `GET /api/photos` - Seznam fotek
-   `POST /api/photos` - Nahrání fotky
-   `POST /api/reports` - Vytvoření reportu
-   `POST /api/protocols` - Vytvoření protokolu

### Data:

-   **Uložení:** `DATA/store.json`
-   **Automatické ukládání:** Po každé změně

---

## 🔧 ŘEŠENÍ PROBLÉMŮ

### Server neběží:

```powershell
# Zastavit všechny node procesy
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Spustit znovu
node app/index.js
```

### Port je obsazený:

```powershell
# Najít proces na portu 3000
netstat -ano | findstr :3000

# Nebo změnit port
$env:PORT=8080; node app/index.js
```

### Chyba npm:

```powershell
# Použij přímo node místo npm
node app/index.js
```

---

## 📱 FUNKCE APLIKACE

### ✅ Dashboard

-   Přehled projektů
-   Aktuální docházka
-   Quick check-in

### 🏗️ Stavby (Projekty)

-   Seznam všech staveb
-   Filtrování podle stavu (aktivní, plánovaný, ukončený)
-   Mapa projektů s lokacemi

### 📍 Docházka

-   Check-in na projekt s GPS lokací
-   Check-out s výpočtem odpracované doby
-   Historie docházky

### 📸 Fotodokumentace

-   Pořízení fotky přes kameru
-   Přiřazení k projektu
-   Popis a GPS lokace
-   Galerie fotek

### 📝 Reporty

-   Denní report
-   Report průběhu
-   Report dokončení

### 📋 Protokoly

-   Protokol o předání staveniště
-   Kolaudační protokol
-   Zápis z kontrolního dne
-   Digitální podpis

### ⚙️ Nastavení

-   Export dat (JSON)
-   Import dat
-   Vymazání dat

---

## 🎯 TESTOVÁNÍ

```powershell
# Health check
node scripts/check-server.js

# API test
node scripts/check.js
```

---

## 📦 DEPLOYMENT (Render.com)

Server je nakonfigurován pro automatický deployment na Render.com:

1. Push do GitHubu
2. Render automaticky detekuje `render.yaml`
3. Build: `npm install`
4. Start: `npm start`
5. Production URL: `https://patgroup-server.onrender.com`

---

## 🛠️ DEVELOPMENT

### Formátování kódu:

```powershell
npx prettier --write .
```

### Debugging v VS Code:

-   `F5` - Spustit debugger
-   Breakpointy v `app/index.js`

---

## 📞 PODPORA

Server běží na: http://localhost:3000
Web aplikace: http://localhost:3000/app/
API: http://localhost:3000/api/\*

**STATUS:** ✅ Server je připravený a funkční!
