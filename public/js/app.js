// Stavba Manager JavaScript - Frontend s API integrací
class StavbaManager {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.activeProject = null;
        this.currentLocation = null;
        this.map = null;
        this.attendanceStatus = "out";
        this.checkInTime = null;
        this.cameraStream = null;
        this.currentProjects = [];
        this.apiBaseUrl = "/api";

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
            stavbyvedouci: [
                "dashboard",
                "projects",
                "attendance",
                "photos",
                "reports",
                "protocols",
                "time",
            ],
            administrator: [
                "dashboard",
                "projects",
                "attendance",
                "photos",
                "reports",
                "protocols",
                "time",
                "settings",
            ],
        };

        this.init();
    }

    init() {
        console.log("StavbaManager init started");
        this.checkLogin();
    }

    async checkLogin() {
        console.log("Checking login status...");
        try {
            const me = await this.apiCall("/me", { method: "GET" });
            if (me && me.user) {
                this.currentUser = me.user;
                this.userRole = me.user.role;
                localStorage.setItem(
                    "currentUser",
                    JSON.stringify(this.currentUser)
                );
                console.log("User logged in via cookie:", me.user);
                this.showApp();
                return;
            }
        } catch (err) {
            console.warn("No active session", err.message);
        }

        console.log("No saved session, showing login");
        this.showLogin();
    }

    showLogin() {
        const loginScreen = document.getElementById("loginScreen");
        const appContainer = document.getElementById("appContainer");

        if (loginScreen) loginScreen.style.display = "flex";
        if (appContainer) appContainer.style.display = "none";

        const loginForm = document.getElementById("loginForm");
        if (loginForm) {
            // Remove any existing listeners to prevent duplicates
            const newForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newForm, loginForm);

            newForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
    }

    handleLogin() {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        console.log("Login attempt:", { username });

        if (!username || !password) {
            this.showLoginError("Vyplňte přihlašovací údaje");
            return;
        }

        this.apiCall("/login", {
            method: "POST",
            body: JSON.stringify({ username, password }),
        })
            .then((data) => {
                this.currentUser = data.user;
                this.userRole = data.user.role;
                localStorage.setItem(
                    "currentUser",
                    JSON.stringify(this.currentUser)
                );
                console.log("Login successful:", this.currentUser);
                this.showApp();
            })
            .catch((err) => {
                console.error("Login failed", err);
                this.showLoginError("Přihlášení selhalo");
            });
    }

    showLoginError(message) {
        const errorDiv = document.getElementById("loginError");
        errorDiv.textContent = message;
        errorDiv.style.display = "block";

        setTimeout(() => {
            errorDiv.style.display = "none";
        }, 3000);
    }

    showApp() {
        console.log("Showing app for user:", this.currentUser);

        try {
            const loginScreen = document.getElementById("loginScreen");
            const appContainer = document.getElementById("appContainer");

            if (loginScreen) {
                loginScreen.style.display = "none";
            }

            if (appContainer) {
                appContainer.style.display = "flex";
            }

            // Zobrazení uživatelských informací
            this.updateUserDisplay();

            // Inicializace aplikace
            this.loadData();
            this.initEventListeners();
            this.checkGeolocationSupport();
            this.updateConnectionStatus();
            this.updateDashboard();
            this.loadProjects();
            this.initReportTemplates();
            this.initProtocolTemplates();
            this.updateTimeDisplay();
            this.loadPhotos();

            // Nastavení oprávnění
            this.applyPermissions();

            this.showSection("dashboard");

            console.log("App initialized successfully");
        } catch (error) {
            console.error("CHYBA při inicializaci aplikace:", error);
            alert("Chyba při načítání aplikace: " + error.message);
            // Necháme uživatele přihlášeného, aby mohl zkusit znovu
        }
    }

    updateUserDisplay() {
        const roleIcons = {
            monter: "👷",
            technik: "🔧",
            stavbyvedouci: "👨‍💼",
            administrator: "🛡️",
        };

        const roleNames = {
            monter: "Montér",
            technik: "Technik",
            stavbyvedouci: "Stavbyvedoucí",
            administrator: "Administrátor",
        };

        document.getElementById("userRoleBadge").textContent =
            roleIcons[this.userRole];
        document.getElementById("userName").textContent = `${
            this.currentUser.name
        } (${roleNames[this.userRole]})`;
    }

    applyPermissions() {
        const allowedSections = this.permissions[this.userRole] || [];

        // Skrýt nepovolené navigační tlačítka
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            const section = btn.dataset.section;
            if (!allowedSections.includes(section)) {
                btn.style.display = "none";
            } else {
                btn.style.display = "flex";
            }
        });

        // Skrýt nepovolené sekce
        document.querySelectorAll(".content-section").forEach((section) => {
            const sectionId = section.id;
            if (!allowedSections.includes(sectionId)) {
                section.style.display = "none";
            }
        });
    }

    logout() {
        this.apiCall("/logout", { method: "POST" })
            .catch(() => null)
            .finally(() => {
                localStorage.removeItem("currentUser");
                this.currentUser = null;
                this.userRole = null;
                location.reload();
            });
    }

    initEventListeners() {
        // Odhlášení
        document
            .getElementById("logoutBtn")
            ?.addEventListener("click", () => this.logout());

        // Navigace
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const section = e.target.closest(".nav-btn").dataset.section;
                this.showSection(section);
            });
        });

        document
            .getElementById("quickCheckin")
            ?.addEventListener("click", () => {
                this.showSection("attendance");
            });

        // Attendance
        document
            .getElementById("checkinBtn")
            ?.addEventListener("click", () => this.checkIn());
        document
            .getElementById("checkoutBtn")
            ?.addEventListener("click", () => this.checkOut());

        // Photos
        document
            .getElementById("takePhotoBtn")
            ?.addEventListener("click", () => this.startCamera());
        document
            .getElementById("captureBtn")
            ?.addEventListener("click", () => this.capturePhoto());
        document
            .getElementById("cancelCameraBtn")
            ?.addEventListener("click", () => this.stopCamera());
        document
            .getElementById("savePhotoBtn")
            ?.addEventListener("click", () => this.savePhoto());
        document
            .getElementById("retakePhotoBtn")
            ?.addEventListener("click", () => this.startCamera());

        // Reports
        document
            .getElementById("newReportBtn")
            ?.addEventListener("click", () => this.showReportForm());
        document
            .getElementById("reportType")
            ?.addEventListener("change", (e) =>
                this.generateReportFields(e.target.value)
            );
        document
            .getElementById("saveReportBtn")
            ?.addEventListener("click", () => this.saveReport());
        document
            .getElementById("cancelReportBtn")
            ?.addEventListener("click", () => this.hideReportForm());

        // Protocols
        document
            .getElementById("newProtocolBtn")
            ?.addEventListener("click", () => this.showProtocolForm());
        document
            .getElementById("protocolType")
            ?.addEventListener("change", (e) =>
                this.generateProtocolSections(e.target.value)
            );
        document
            .getElementById("saveProtocolBtn")
            ?.addEventListener("click", () => this.saveProtocol());
        document
            .getElementById("cancelProtocolBtn")
            ?.addEventListener("click", () => this.hideProtocolForm());

        this.initSignatureCanvas();

        // Settings
        document
            .getElementById("exportDataBtn")
            ?.addEventListener("click", () => this.exportData());
        document
            .getElementById("importDataBtn")
            ?.addEventListener("click", () => {
                document.getElementById("importFileInput").click();
            });
        document
            .getElementById("importFileInput")
            ?.addEventListener("change", (e) => this.importData(e));
        document
            .getElementById("clearDataBtn")
            ?.addEventListener("click", () => this.clearData());

        // Project filtering
        document
            .getElementById("statusFilter")
            ?.addEventListener("change", (e) =>
                this.filterProjects(e.target.value)
            );

        document
            .getElementById("closePhotoModal")
            ?.addEventListener("click", () => this.hidePhotoModal());

        document
            .getElementById("clearSignatureBtn")
            ?.addEventListener("click", () => this.clearSignature());
    }

    // API helper
    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers,
                },
                credentials: "include",
                ...options,
            });

            if (response.status === 401) {
                this.logout();
                throw new Error("Unauthorized");
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("API call failed:", error);
            this.showToast(`Chyba API: ${error.message}`, "error");
            throw error;
        }
    }

    // Navigation
    showSection(sectionName) {
        document.querySelectorAll(".content-section").forEach((section) => {
            section.classList.remove("active");
        });

        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.classList.remove("active");
        });

        const section = document.getElementById(sectionName);
        if (section) {
            section.classList.add("active");
        }

        const navBtn = document.querySelector(
            `[data-section="${sectionName}"]`
        );
        if (navBtn) {
            navBtn.classList.add("active");
        }

        if (sectionName === "attendance") {
            this.initMap();
        } else if (sectionName === "time") {
            this.updateTimeDisplay();
        }
    }

    // Geolocation
    checkGeolocationSupport() {
        if ("geolocation" in navigator) {
            this.updateLocationStatus("GPS dostupné", true);
            this.getCurrentLocation();
        } else {
            this.updateLocationStatus("GPS nedostupné", false);
        }
    }

    getCurrentLocation() {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                this.currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                this.updateLocationStatus("GPS aktivní", true);
                if (this.map) {
                    this.updateMapLocation();
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                this.updateLocationStatus("GPS chyba", false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
        );
    }

    updateLocationStatus(text, isActive) {
        const statusElement = document.getElementById("locationStatus");
        if (!statusElement) return;

        const dot = statusElement.querySelector(".status-dot");
        const textElement = statusElement.querySelector(".status-text");

        textElement.textContent = text;
        dot.classList.toggle("gps-active", isActive);
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById("connectionStatus");
        if (!statusElement) return;

        const dot = statusElement.querySelector(".status-dot");
        const textElement = statusElement.querySelector(".status-text");

        const isOnline = navigator.onLine;
        textElement.textContent = isOnline ? "Online" : "Offline";
        dot.classList.toggle("online", isOnline);
    }

    // Map
    initMap() {
        if (this.map) return;

        const mapContainer = document.getElementById("attendanceMap");
        if (!mapContainer) return;

        this.map = L.map("attendanceMap").setView([50.0755, 14.4378], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors",
        }).addTo(this.map);

        // Add project markers
        if (this.activeProject) {
            L.marker([
                this.activeProject.latitude,
                this.activeProject.longitude,
            ])
                .addTo(this.map)
                .bindPopup(
                    `<b>${this.activeProject.name}</b><br>${this.activeProject.address}`
                );
        }

        if (this.currentLocation) {
            this.updateMapLocation();
        }
    }

    updateMapLocation() {
        if (!this.map || !this.currentLocation) return;

        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
        }

        this.userMarker = L.circleMarker(
            [this.currentLocation.lat, this.currentLocation.lng],
            {
                color: "#2E86AB",
                fillColor: "#2E86AB",
                fillOpacity: 0.7,
                radius: 8,
            }
        ).addTo(this.map);

        this.map.setView(
            [this.currentLocation.lat, this.currentLocation.lng],
            15
        );
    }

    // Attendance
    async checkIn() {
        if (!this.activeProject) {
            this.showToast("Nejprve vyberte aktivní projekt", "error");
            return;
        }

        if (!this.currentLocation) {
            this.showToast(
                "Čekám na GPS... Zkontrolujte povolení polohy v prohlížeči",
                "info"
            );
            return;
        }

        const distance = this.calculateDistance(
            this.currentLocation.lat,
            this.currentLocation.lng,
            this.activeProject.latitude,
            this.activeProject.longitude
        );

        const tolerance = parseInt(
            document.getElementById("gpsTolerance")?.value || 100
        );

        if (distance > tolerance) {
            this.showToast(
                `Jste příliš daleko od stavby (${Math.round(
                    distance
                )}m). Maximální: ${tolerance}m`,
                "error"
            );
            return;
        }

        try {
            await this.apiCall("/attendance/checkin", {
                method: "POST",
                body: JSON.stringify({
                    projectId: this.activeProject.id,
                    location: this.currentLocation,
                }),
            });

            this.attendanceStatus = "in";
            this.checkInTime = new Date();
            this.updateAttendanceUI();
            this.showToast("Úspěšně přihlášen na stavbu", "success");
        } catch (error) {
            this.showToast("Chyba při check-in", "error");
        }
    }

    async checkOut() {
        if (this.attendanceStatus === "out") {
            this.showToast("Nejste přihlášen", "error");
            return;
        }

        try {
            await this.apiCall("/attendance/checkout", {
                method: "POST",
                body: JSON.stringify({
                    location: this.currentLocation,
                }),
            });

            this.attendanceStatus = "out";
            this.updateAttendanceUI();
            this.showToast("Úspěšně odhlášen ze stavby", "success");
            this.checkInTime = null;
        } catch (error) {
            this.showToast("Chyba při check-out", "error");
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    updateAttendanceUI() {
        const statusElement = document.getElementById("attendanceStatus");
        const timeElement = document.getElementById("attendanceTime");
        const checkinBtn = document.getElementById("checkinBtn");
        const checkoutBtn = document.getElementById("checkoutBtn");

        if (this.attendanceStatus === "in") {
            statusElement.textContent = "Přihlášen";
            timeElement.textContent =
                this.checkInTime.toLocaleTimeString("cs-CZ");
            checkinBtn.classList.add("hidden");
            checkoutBtn.classList.remove("hidden");
        } else {
            statusElement.textContent = "Nepřihlášen";
            timeElement.textContent = "--:--";
            checkinBtn.classList.remove("hidden");
            checkoutBtn.classList.add("hidden");
        }
    }

    // Projects
    async loadProjects() {
        try {
            const data = await this.apiCall("/projects");
            this.currentProjects = data;
            this.renderProjects(data);
        } catch (error) {
            console.error("Failed to load projects:", error);
        }
    }

    renderProjects(projects = null) {
        const container = document.getElementById("projectsList");
        if (!container) return;

        if (!projects) {
            projects = this.currentProjects || [];
        }

        container.innerHTML = "";

        projects.forEach((project) => {
            const projectCard = document.createElement("div");
            projectCard.className = `project-card ${
                this.activeProject && this.activeProject.id === project.id
                    ? "selected"
                    : ""
            }`;

            projectCard.innerHTML = `
                <div class="project-header">
                    <h3 class="project-name">${project.name}</h3>
                    <span class="project-status ${project.status}">${
                project.status
            }</span>
                </div>
                <p class="project-address">📍 ${project.address}</p>
                <div class="project-dates">
                    📅 ${new Date(project.start_date).toLocaleDateString(
                        "cs-CZ"
                    )} - ${new Date(project.planned_end).toLocaleDateString(
                "cs-CZ"
            )}
                </div>
            `;

            projectCard.addEventListener("click", () => {
                this.selectProject(project);
            });

            container.appendChild(projectCard);
        });
    }

    selectProject(project) {
        this.activeProject = project;
        localStorage.setItem("active_project", JSON.stringify(project));
        this.renderProjects();
        this.updateDashboard();
        this.showToast(`Vybrán projekt: ${project.name}`, "success");
    }

    filterProjects(status) {
        if (status === "all") {
            this.renderProjects();
        } else {
            const filtered = this.currentProjects?.filter(
                (p) => p.status === status
            );
            this.renderProjects(filtered || []);
        }
    }

    // Camera and Photos
    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });

            const video = document.getElementById("camera");
            video.srcObject = stream;
            this.cameraStream = stream;

            document
                .getElementById("cameraContainer")
                .classList.remove("hidden");
            document.getElementById("photoForm").classList.add("hidden");
        } catch (error) {
            console.error("Camera error:", error);
            this.showToast("Nelze spustit kameru", "error");
        }
    }

    capturePhoto() {
        const video = document.getElementById("camera");
        const canvas = document.getElementById("photoCanvas");
        const ctx = canvas.getContext("2d");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        ctx.drawImage(video, 0, 0);

        this.stopCamera();
        document.getElementById("cameraContainer").classList.add("hidden");
        document.getElementById("photoForm").classList.remove("hidden");
    }

    stopCamera() {
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach((track) => track.stop());
            this.cameraStream = null;
        }
        document.getElementById("cameraContainer").classList.add("hidden");
    }

    async savePhoto() {
        const canvas = document.getElementById("photoCanvas");
        const description = document.getElementById("photoDescription").value;

        try {
            const imageData = canvas.toDataURL("image/jpeg", 0.8);

            await this.apiCall("/photos", {
                method: "POST",
                body: JSON.stringify({
                    image: imageData,
                    description: description || "Bez popisu",
                    projectId: this.activeProject?.id,
                    location: this.currentLocation,
                }),
            });

            document.getElementById("photoForm").classList.add("hidden");
            document.getElementById("photoDescription").value = "";

            this.loadPhotos();
            this.updateDashboard();
            this.showToast("Fotka byla uložena", "success");
        } catch (error) {
            this.showToast("Chyba při ukládání fotky", "error");
        }
    }

    async loadPhotos() {
        try {
            const data = await this.apiCall("/photos");
            this.renderPhotos(data);
        } catch (error) {
            console.error("Failed to load photos:", error);
        }
    }

    renderPhotos(photos = []) {
        const container = document.getElementById("photosGrid");
        if (!container) return;

        container.innerHTML = "";

        photos.reverse().forEach((photo) => {
            const photoItem = document.createElement("div");
            photoItem.className = "photo-item";

            photoItem.innerHTML = `
                <img src="${photo.image}" alt="Photo">
                <div class="photo-info">
                    <p class="photo-description">${photo.description}</p>
                    <p class="photo-meta">
                        📅 ${new Date(photo.timestamp).toLocaleString(
                            "cs-CZ"
                        )}<br>
                        🏗️ ${photo.projectName || "Bez projektu"}
                    </p>
                </div>
            `;

            photoItem.addEventListener("click", () => {
                this.showPhotoModal(photo);
            });

            container.appendChild(photoItem);
        });
    }

    showPhotoModal(photo) {
        document.getElementById("photoPreview").src = photo.image;
        document.getElementById("photoPreviewDescription").textContent =
            photo.description;
        document.getElementById("photoModal").classList.remove("hidden");
    }

    hidePhotoModal() {
        document.getElementById("photoModal").classList.add("hidden");
    }

    // Reports
    initReportTemplates() {
        const select = document.getElementById("reportType");
        if (!select) return;

        const templates = [
            { id: 1, name: "Denní report" },
            { id: 2, name: "Bezpečnostní kontrola" },
            { id: 3, name: "Kontrola kvality" },
        ];

        templates.forEach((template) => {
            const option = document.createElement("option");
            option.value = template.id;
            option.textContent = template.name;
            select.appendChild(option);
        });
    }

    showReportForm() {
        document.getElementById("reportForm").classList.remove("hidden");
    }

    hideReportForm() {
        document.getElementById("reportForm").classList.add("hidden");
        document.getElementById("reportType").value = "";
        document.getElementById("reportFields").innerHTML = "";
    }

    generateReportFields(templateId) {
        const fieldSets = {
            1: [
                "datum",
                "čas_příchodu",
                "čas_odchodu",
                "popis_prací",
                "počasí",
                "problémy",
                "poznámky",
            ],
            2: [
                "datum",
                "kontrolor",
                "bezpečnostní_opatření",
                "zjištěné_nedostatky",
                "nápravná_opatření",
            ],
            3: [
                "datum",
                "kontrolovaná_oblast",
                "stav_prací",
                "kvalita_provedení",
                "nedostatky",
            ],
        };

        const fields = fieldSets[templateId] || [];
        const container = document.getElementById("reportFields");
        container.innerHTML = "";

        fields.forEach((field) => {
            const fieldDiv = document.createElement("div");
            fieldDiv.className = "form-group";

            const label = document.createElement("label");
            label.className = "form-label";
            label.textContent =
                field.charAt(0).toUpperCase() +
                field.slice(1).replace(/_/g, " ");

            const input =
                field === "datum"
                    ? document.createElement("input")
                    : document.createElement("textarea");

            input.className = "form-control";
            input.name = field;

            if (field === "datum") {
                input.type = "date";
                input.value = new Date().toISOString().split("T")[0];
            } else {
                input.rows = 3;
            }

            fieldDiv.appendChild(label);
            fieldDiv.appendChild(input);
            container.appendChild(fieldDiv);
        });
    }

    async saveReport() {
        const templateId = document.getElementById("reportType").value;

        if (!templateId) {
            this.showToast("Vyberte typ reportu", "error");
            return;
        }

        try {
            const formData = new FormData(
                document.getElementById("reportForm")
            );
            const fields = {};
            for (let [key, value] of formData) {
                fields[key] = value;
            }

            await this.apiCall("/reports", {
                method: "POST",
                body: JSON.stringify({
                    templateId: parseInt(templateId),
                    fields: fields,
                    projectId: this.activeProject?.id,
                }),
            });

            this.hideReportForm();
            this.showToast("Report byl uložen", "success");
        } catch (error) {
            this.showToast("Chyba při ukládání reportu", "error");
        }
    }

    // Protocols
    initProtocolTemplates() {
        const select = document.getElementById("protocolType");
        if (!select) return;

        const templates = [
            { id: 1, name: "Protokol o předání staveniště" },
            { id: 2, name: "Protokol o kontrole základů" },
            { id: 3, name: "Protokol o dokončení etapy" },
        ];

        templates.forEach((template) => {
            const option = document.createElement("option");
            option.value = template.id;
            option.textContent = template.name;
            select.appendChild(option);
        });
    }

    showProtocolForm() {
        document.getElementById("protocolForm").classList.remove("hidden");
    }

    hideProtocolForm() {
        document.getElementById("protocolForm").classList.add("hidden");
        document.getElementById("protocolType").value = "";
        document.getElementById("protocolSections").innerHTML = "";
    }

    generateProtocolSections(templateId) {
        const sectionSets = {
            1: [
                "účastníci",
                "popis_staveniště",
                "stav_přístupových_cest",
                "bezpečnostní_opatření",
            ],
            2: [
                "rozměry_základů",
                "kvalita_betonu",
                "armování",
                "izolace",
                "dokumentace",
            ],
            3: [
                "popis_dokončených_prací",
                "kvalita_provedení",
                "dokumentace",
                "nedodělky",
            ],
        };

        const sections = sectionSets[templateId] || [];
        const container = document.getElementById("protocolSections");
        container.innerHTML = "";

        sections.forEach((section) => {
            const sectionDiv = document.createElement("div");
            sectionDiv.className = "form-group";

            const label = document.createElement("label");
            label.className = "form-label";
            label.textContent =
                section.charAt(0).toUpperCase() +
                section.slice(1).replace(/_/g, " ");

            const textarea = document.createElement("textarea");
            textarea.className = "form-control";
            textarea.name = section;
            textarea.rows = 4;

            sectionDiv.appendChild(label);
            sectionDiv.appendChild(textarea);
            container.appendChild(sectionDiv);
        });
    }

    initSignatureCanvas() {
        const canvas = document.getElementById("signatureCanvas");
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        let isDrawing = false;

        const startDrawing = (e) => {
            isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;
            ctx.beginPath();
            ctx.moveTo(x, y);
        };

        const draw = (e) => {
            if (!isDrawing) return;
            e.preventDefault();

            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX || e.touches[0].clientX) - rect.left;
            const y = (e.clientY || e.touches[0].clientY) - rect.top;

            ctx.lineTo(x, y);
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.stroke();
        };

        const stopDrawing = () => {
            isDrawing = false;
        };

        canvas.addEventListener("mousedown", startDrawing);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("mouseup", stopDrawing);

        canvas.addEventListener("touchstart", startDrawing);
        canvas.addEventListener("touchmove", draw);
        canvas.addEventListener("touchend", stopDrawing);
    }

    clearSignature() {
        const canvas = document.getElementById("signatureCanvas");
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    async saveProtocol() {
        const templateId = document.getElementById("protocolType").value;

        if (!templateId) {
            this.showToast("Vyberte typ protokolu", "error");
            return;
        }

        try {
            const canvas = document.getElementById("signatureCanvas");
            const signature = canvas.toDataURL();

            const formData = new FormData(
                document.getElementById("protocolForm")
            );
            const sections = {};
            for (let [key, value] of formData) {
                sections[key] = value;
            }

            await this.apiCall("/protocols", {
                method: "POST",
                body: JSON.stringify({
                    templateId: parseInt(templateId),
                    sections: sections,
                    signature: signature,
                    projectId: this.activeProject?.id,
                }),
            });

            this.hideProtocolForm();
            this.clearSignature();
            this.showToast("Protokol byl uložen", "success");
        } catch (error) {
            this.showToast("Chyba při ukládání protokolu", "error");
        }
    }

    // Time Tracking
    updateTimeDisplay() {
        const container = document.getElementById("todayTime");
        if (container) {
            container.textContent = "0:00";
        }
    }

    // Dashboard
    updateDashboard() {
        const activeProjectElement = document.getElementById("activeProject");
        if (activeProjectElement) {
            activeProjectElement.textContent = this.activeProject
                ? this.activeProject.name
                : "Nevybrán";
        }

        const currentStatusElement = document.getElementById("currentStatus");
        if (currentStatusElement) {
            currentStatusElement.textContent =
                this.attendanceStatus === "in" ? "Přihlášen" : "Nepřihlášen";
        }

        const todayPhotosElement = document.getElementById("todayPhotos");
        if (todayPhotosElement) {
            todayPhotosElement.textContent = "0";
        }
    }

    // Data Management
    loadData() {
        const savedProject = localStorage.getItem("active_project");
        if (savedProject) {
            this.activeProject = JSON.parse(savedProject);
        }
    }

    exportData() {
        this.showToast("Export je k dispozici přes API", "info");
    }

    importData(event) {
        this.showToast("Import je k dispozici přes API", "info");
    }

    clearData() {
        if (confirm("Opravdu chcete vymazat všechna data?")) {
            localStorage.clear();
            this.activeProject = null;
            this.updateDashboard();
            this.showToast("Všechna data byla vymazána", "info");
        }
    }

    // Utility
    showToast(message, type = "info") {
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
    const app = new StavbaManager();

    setInterval(() => {
        app.updateDashboard();
    }, 60000);

    window.addEventListener("online", () => app.updateConnectionStatus());
    window.addEventListener("offline", () => app.updateConnectionStatus());
});
