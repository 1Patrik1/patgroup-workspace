# 🔐 Přihlašovací systém - Dokumentace

## 🎯 Přehled

Aplikace Stavba Manager obsahuje plnohodnotný přihlašovací systém s rolemi a oprávněními. Po prvním otevření aplikace se zobrazí přihlašovací obrazovka.

---

## 🚀 Jak se přihlásit

1. **Otevři aplikaci:** http://localhost:3000/app/
2. **Zadej přihlašovací údaje:**
    - Uživatelské jméno
    - Heslo
    - Vyber roli z dropdown menu
3. **Klikni na "Přihlásit se"**
4. **Aplikace se otevře** s oprávněními podle zvolené role

### ⚠️ Důležité:

-   Všechna 3 pole (jméno, heslo, role) musí být vyplněná
-   Role musí odpovídat uživateli
-   Po přihlášení zůstaneš přihlášen i po zavření prohlížeče (LocalStorage)
-   Pro odhlášení klikni na **🚪 Odhlásit** v pravém horním rohu

---

## 👥 Role uživatelů

### 1. 👷 MONTÉR

**Přihlašovací údaje:**

-   **Uživatel:** `monter`
-   **Heslo:** `monter123`
-   **Role:** Montér

**Oprávnění:**

-   ✅ Dashboard
-   ✅ Stavby (zobrazení)
-   ✅ Docházka (check-in/out)
-   ✅ Fotodokumentace
-   ✅ Čas (sledování odpracovaných hodin)

**Popis:** Základní uživatel pro terénní práce. Může si zaznamenat docházku, fotit průběh stavby a sledovat své odpracované hodiny.

---

### 2. 🔧 TECHNIK

**Přihlašovací údaje:**

-   **Uživatel:** `technik`
-   **Heslo:** `technik123`
-   **Role:** Technik

**Oprávnění:**

-   ✅ Dashboard
-   ✅ Stavby (zobrazení)
-   ✅ Docházka
-   ✅ Fotodokumentace
-   ✅ **Reporty** (denní, průběhu, dokončení)
-   ✅ Čas

**Popis:** Rozšířená role pro technické pracovníky. Kromě montéřských oprávnění může vytvářet a spravovat reporty o průběhu prací.

---

### 3. 👨‍💼 STAVBYVEDOUCÍ

**Přihlašovací údaje:**

-   **Uživatel:** `vedouci`
-   **Heslo:** `vedouci123`
-   **Role:** Stavbyvedoucí

**Oprávnění:**

-   ✅ Dashboard
-   ✅ Stavby (kompletní správa)
-   ✅ Docházka
-   ✅ Fotodokumentace
-   ✅ Reporty
-   ✅ **Protokoly** (předání staveniště, kolaudace, kontrolní dny)
-   ✅ Čas

**Popis:** Vedoucí stavby s plným přístupem k projektovému řízení. Může vytvářet oficiální protokoly a spravovat všechny aspekty stavby.

---

### 4. 🛡️ ADMINISTRÁTOR

**Přístup:** admin / admin123

**Oprávnění:**

-   ✅ Dashboard
-   ✅ Stavby
-   ✅ Docházka
-   ✅ Fotodokumentace
-   ✅ Reporty
-   ✅ Protokoly
-   ✅ Čas
-   ✅ **Nastavení** (export/import dat, správa systému)

**Popis:** Plný přístup ke všem funkcím včetně správy dat a systémového nastavení.

---

## 🔒 Bezpečnostní funkce

### Ověření přihlášení

-   Uživatelské jméno, heslo a role musí být správné
-   Všechna pole jsou povinná
-   Chybová hlášení při nesprávných údajích

### Session Management

-   Přihlášení se ukládá do `localStorage`
-   Automatické přihlášení při opětovné návštěvě
-   Tlačítko "Odhlásit" v hlavičce

### Oprávnění

-   Dynamické skrývání navigace podle role
-   Automatické omezení přístupu k sekcím
-   Zobrazení role a jména v hlavičce

---

## 💻 Použití

### Přihlášení

1. Otevři aplikaci: `http://localhost:3000/app/`
2. Zadej přihlašovací údaje:
    - **Uživatelské jméno**
    - **Heslo**
    - **Role** (vyber z dropdown menu)
3. Klikni na "Přihlásit se"

### Odhlášení

Klikni na tlačítko **"🚪 Odhlásit"** v pravém horním rohu hlavičky.

---

## 🎨 UI/UX Features

### Přihlašovací obrazovka

-   Moderní gradient pozadí
-   Responzivní design
-   Animace při načtení
-   Demo přístupy zobrazené přímo na obrazovce

### Hlavička aplikace

-   **Levá strana:** Logo Stavba Manager
-   **Střed:** Badge s rolí + jméno uživatele
-   **Pravá strana:** Status indikátory + tlačítko odhlásit

### Responzivita

-   Plně responzivní na mobilních zařízeních
-   Adaptivní layout hlavičky
-   Touch-friendly ovládací prvky

---

## 🔧 Technické detaily

### Frontend (JavaScript)

```javascript
// Struktura uživatele
this.users = {
    monter: {
        password: "monter123",
        role: "monter",
        name: "Jan Novák",
    },
    // ... další uživatelé
};

// Oprávnění podle rolí
this.permissions = {
    monter: ["dashboard", "projects", "attendance", "photos", "time"],
    technik: [
        "dashboard",
        "projects",
        "attendance",
        "photos",
        "reports",
        "time",
    ],
    // ... další role
};
```

### LocalStorage

```javascript
// Uložení přihlášení
localStorage.setItem("currentUser", JSON.stringify(userData));

// Načtení při startu
const savedUser = localStorage.getItem("currentUser");
```

### CSS Třídy

-   `.login-screen` - Fullscreen přihlašovací obrazovka
-   `.login-container` - Přihlašovací formulář
-   `.user-info` - Badge s uživatelskými informacemi
-   `.btn-logout` - Tlačítko odhlásit

---

## 📱 Testování

### Test různých rolí:

1. **Montér:**

    - Přihlaš se jako montér
    - Ověř, že vidíš pouze: Dashboard, Stavby, Docházka, Fotky, Čas
    - Zkontroluj, že Reporty, Protokoly a Nastavení nejsou viditelné

2. **Technik:**

    - Přihlaš se jako technik
    - Ověř přístup k Reportům
    - Zkontroluj, že Protokoly a Nastavení stále nejsou dostupné

3. **Stavbyvedoucí:**

    - Přihlaš se jako vedoucí
    - Ověř přístup k Protokolům
    - Zkontroluj, že Nastavení ještě není dostupné

4. **Administrátor:**
    - Přihlaš se jako admin
    - Ověř plný přístup ke všem sekcím včetně Nastavení

---

## 🚀 Budoucí vylepšení

### Doporučené funkce:

-   [ ] Integrace s backend API pro autentizaci
-   [ ] Password reset funkce
-   [ ] Dvou-faktorová autentizace (2FA)
-   [ ] Historie přihlášení uživatelů
-   [ ] Administrátorské rozhraní pro správu uživatelů
-   [ ] Změna hesla po prvním přihlášení
-   [ ] Session timeout po nečinnosti
-   [ ] Audit log všech akcí uživatelů

### Backend API endpointy (budoucnost):

```javascript
POST /api/auth/login     // Přihlášení
POST /api/auth/logout    // Odhlášení
POST /api/auth/refresh   // Refresh token
GET  /api/users          // Seznam uživatelů (admin)
POST /api/users          // Vytvoření uživatele (admin)
PUT  /api/users/:id      // Úprava uživatele (admin)
DELETE /api/users/:id    // Smazání uživatele (admin)
```

---

## ⚠️ Poznámky

### Pro vývoj:

-   Hesla jsou aktuálně uložena v plain textu (pouze pro demo!)
-   V produkci použij bcrypt nebo jiný hash algoritmus
-   Autentizace je pouze na frontendu (bez backend validace)

### Pro produkci:

-   **POVINNÉ:** Implementovat backend autentizaci
-   **POVINNÉ:** Hashovat hesla (bcrypt, argon2)
-   **POVINNÉ:** Použít JWT tokeny pro session management
-   **DOPORUČENO:** HTTPS pouze
-   **DOPORUČENO:** Rate limiting pro login attempts
-   **DOPORUČENO:** CAPTCHA pro ochranu před boty

---

## 📞 Kontakt

Aplikace je nyní plně funkční s přihlašovacím systémem!

**URL:** http://localhost:3000/app/

**Status:** ✅ Implementováno a funkční
