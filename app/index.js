// Initialize tracing first, before any other imports
require("../tracing");

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { trace, SpanStatusCode } = require("@opentelemetry/api");

const tracer = trace.getTracer("patgroup-stavba-manager", "1.0.0");

const PORT = process.env.PORT || 10000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const JWT_SECRET = process.env.JWT_SECRET || "dev-change-me";
const JWT_EXPIRES_SECONDS = parseInt(
    process.env.JWT_EXPIRES_SECONDS || "86400",
    10
);
const COOKIE_NAME = "sm_token";
const RATE_LIMITS = {
    login: { windowMs: 15 * 60 * 1000, max: 5 },
    checkin: { windowMs: 60 * 1000, max: 1 },
    checkout: { windowMs: 60 * 1000, max: 1 },
};

let state = {
    projects: [
        {
            id: 1,
            name: "Hala Sever",
            status: "aktivní",
            address: "Prumyslova 1, Praha",
            start_date: "2025-01-10",
            planned_end: "2025-04-30",
            latitude: 50.088,
            longitude: 14.42,
        },
        {
            id: 2,
            name: "Bydleni Jih",
            status: "plánovaný",
            address: "Lesni 8, Brno",
            start_date: "2025-02-01",
            planned_end: "2025-10-15",
            latitude: 49.2,
            longitude: 16.61,
        },
        {
            id: 3,
            name: "Most Zapad",
            status: "ukončený",
            address: "Nabrezi 5, Plzen",
            start_date: "2024-03-01",
            planned_end: "2024-12-15",
            latitude: 49.75,
            longitude: 13.37,
        },
    ],
    photos: [],
    reports: [],
    protocols: [],
    attendance: {
        status: "out",
        checkInTime: null,
        projectId: null,
    },
};

const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
};

const sendText = (res, status, body) => {
    setSecurityHeaders(res);
    res.writeHead(status, { "Content-Type": "text/plain" });
    res.end(body);
};

const sendJson = (res, status, payload) => {
    setSecurityHeaders(res);
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
};

const setSecurityHeaders = (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "geolocation=*, camera=*");
    if (process.env.NODE_ENV === "production") {
        res.setHeader(
            "Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload"
        );
    }
};

const base64url = (input) =>
    Buffer.from(input)
        .toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");

const signJwt = (payload) => {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat: now, exp: now + JWT_EXPIRES_SECONDS };
    const headerPart = base64url(JSON.stringify(header));
    const payloadPart = base64url(JSON.stringify(body));
    const signature = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(`${headerPart}.${payloadPart}`)
        .digest("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    return `${headerPart}.${payloadPart}.${signature}`;
};

const verifyJwt = (token) => {
    try {
        const [headerPart, payloadPart, signature] = token.split(".");
        if (!headerPart || !payloadPart || !signature) return null;
        const expected = crypto
            .createHmac("sha256", JWT_SECRET)
            .update(`${headerPart}.${payloadPart}`)
            .digest("base64")
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_");
        const providedBuf = Buffer.from(signature);
        const expectedBuf = Buffer.from(expected);
        if (providedBuf.length !== expectedBuf.length) return null;
        if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
            return null;
        }
        const payload = JSON.parse(
            Buffer.from(payloadPart, "base64").toString("utf8")
        );
        if (payload.exp && Date.now() / 1000 > payload.exp) return null;
        return payload;
    } catch (err) {
        return null;
    }
};

const hashPassword = (password, salt) => {
    return crypto.scryptSync(password, salt, 64).toString("hex");
};

const demoUsers = (() => {
    const salt = process.env.DEMO_SALT || "demo-salt";
    const makeUser = (username, password, role, name) => ({
        username,
        role,
        name,
        hash: hashPassword(password, salt),
        salt,
    });
    return [
        makeUser("monter", "monter123", "monter", "Jan Novák"),
        makeUser("technik", "technik123", "technik", "Petr Svoboda"),
        makeUser("vedouci", "vedouci123", "stavbyvedouci", "Martin Dvořák"),
        makeUser("admin", "admin123", "administrator", "Admin"),
    ];
})();

const findUser = (username) => demoUsers.find((u) => u.username === username);

const parseCookies = (req) => {
    const header = req.headers?.cookie;
    if (!header) return {};
    return header.split(";").reduce((acc, part) => {
        const [k, v] = part.trim().split("=");
        if (k && v) acc[k] = decodeURIComponent(v);
        return acc;
    }, {});
};

const authenticateRequest = (req) => {
    const cookies = parseCookies(req);
    if (!cookies[COOKIE_NAME]) return null;
    const payload = verifyJwt(cookies[COOKIE_NAME]);
    return payload || null;
};

const respondUnauthorized = (res) => {
    sendJson(res, 401, { error: "Unauthorized" });
};

const sanitizeText = (value, max = 500) => {
    if (typeof value !== "string") return "";
    return value.replace(/[<>]/g, "").slice(0, max);
};

const validateNumber = (value) =>
    typeof value === "number" && Number.isFinite(value);

const validateId = (value) => Number.isInteger(value) && value > 0;

const validateAttendance = (body) => {
    if (!validateId(body.projectId)) throw new Error("projectId required");
};

const validatePhoto = (body) => {
    if (!body.image || typeof body.image !== "string")
        throw new Error("image required");
    if (body.image.length > 5 * 1024 * 1024) throw new Error("image too large");
    if (body.projectId !== undefined && !validateId(body.projectId))
        throw new Error("invalid projectId");
};

const validateReport = (body) => {
    if (!validateId(body.templateId)) throw new Error("templateId required");
    if (!body.fields || typeof body.fields !== "object")
        throw new Error("fields required");
};

const validateProtocol = (body) => {
    if (!validateId(body.templateId)) throw new Error("templateId required");
    if (!body.sections || typeof body.sections !== "object")
        throw new Error("sections required");
};

const rateLimiters = {};

const allowRequest = (key, windowMs, max) => {
    const now = Date.now();
    const bucket = rateLimiters[key] || { count: 0, start: now };
    if (now - bucket.start > windowMs) {
        bucket.start = now;
        bucket.count = 0;
    }
    bucket.count += 1;
    rateLimiters[key] = bucket;
    return bucket.count <= max;
};

const requireRateLimit = (req, res, name) => {
    const cfg = RATE_LIMITS[name];
    if (!cfg) return true;
    const ip = req.socket.remoteAddress || "unknown";
    const ok = allowRequest(`${name}:${ip}`, cfg.windowMs, cfg.max);
    if (!ok) {
        sendJson(res, 429, { error: "Too many requests" });
    }
    return ok;
};

const loadState = () => {
    return tracer.startActiveSpan("loadState", (span) => {
        try {
            span.setAttribute("data.file", DATA_FILE);

            if (!fs.existsSync(DATA_FILE)) {
                span.addEvent("No state file found, using defaults");
                span.setStatus({ code: SpanStatusCode.OK });
                span.end();
                return;
            }
            const data = fs.readFileSync(DATA_FILE, "utf8");
            const parsed = JSON.parse(data);

            span.setAttribute("data.size", data.length);

            // Merge s defaults, ale projects vždy z init state pokud nejsou v souboru
            if (parsed.photos !== undefined) {
                state.photos = parsed.photos;
                span.setAttribute("data.photos.count", parsed.photos.length);
            }
            if (parsed.reports !== undefined) {
                state.reports = parsed.reports;
                span.setAttribute("data.reports.count", parsed.reports.length);
            }
            if (parsed.protocols !== undefined) {
                state.protocols = parsed.protocols;
                span.setAttribute(
                    "data.protocols.count",
                    parsed.protocols.length
                );
            }
            if (parsed.attendance !== undefined) {
                state.attendance = {
                    ...state.attendance,
                    ...parsed.attendance,
                };
            }

            if (state.attendance.checkInTime) {
                state.attendance.checkInTime = new Date(
                    state.attendance.checkInTime
                );
            }

            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
        } catch (err) {
            span.recordException(err);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: err.message,
            });
            span.end();
            console.error("Failed to load state:", err.message);
        }
    });
};

const saveState = () => {
    return tracer.startActiveSpan("saveState", (span) => {
        try {
            span.setAttribute("data.file", DATA_FILE);

            if (!fs.existsSync(DATA_DIR)) {
                fs.mkdirSync(DATA_DIR, { recursive: true });
                span.addEvent("Created data directory");
            }
            const snapshot = {
                ...state,
                attendance: {
                    ...state.attendance,
                    checkInTime: state.attendance.checkInTime
                        ? state.attendance.checkInTime.toISOString()
                        : null,
                },
            };
            const data = JSON.stringify(snapshot, null, 2);
            fs.writeFileSync(DATA_FILE, data, "utf8");

            span.setAttribute("data.size", data.length);
            span.setAttribute("data.photos.count", state.photos.length);
            span.setAttribute("data.reports.count", state.reports.length);
            span.setAttribute("data.protocols.count", state.protocols.length);
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
        } catch (err) {
            span.recordException(err);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: err.message,
            });
            span.end();
            console.error("Failed to save state:", err.message);
        }
    });
};

const parseBody = (req) => {
    return new Promise((resolve, reject) => {
        let data = "";
        req.on("data", (chunk) => {
            data += chunk;
            if (data.length > 5 * 1024 * 1024) {
                reject(new Error("Payload too large"));
                req.destroy();
            }
        });
        req.on("end", () => {
            if (!data) return resolve({});
            try {
                resolve(JSON.parse(data));
            } catch (err) {
                reject(new Error("Invalid JSON"));
            }
        });
        req.on("error", reject);
    });
};

const serveStatic = (pathname, res) => {
    const relativePath = pathname.replace(/^\/app\//, "");
    const normalized = path.normalize(relativePath).replace(/^[/\\]+/, "");

    if (normalized.startsWith("..")) {
        sendText(res, 400, "Bad Request");
        return;
    }

    const filePath = path.join(PUBLIC_DIR, normalized || "index.html");

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            sendText(res, 404, "Not Found");
            return;
        }

        const ext = path.extname(filePath);
        const contentType = contentTypes[ext] || "application/octet-stream";
        setSecurityHeaders(res);
        res.writeHead(200, { "Content-Type": contentType });
        fs.createReadStream(filePath).pipe(res);
    });
};

const handleApi = async (pathname, req, res) => {
    return tracer.startActiveSpan(
        "api.request",
        {
            attributes: {
                "http.route": pathname,
                "http.method": req.method,
                "http.target": pathname,
            },
        },
        async (span) => {
            try {
                // Public: login
                if (pathname === "/api/login" && req.method === "POST") {
                    if (!requireRateLimit(req, res, "login")) return;
                    try {
                        const body = await parseBody(req);
                        const { username, password } = body || {};
                        if (!username || !password) {
                            sendJson(res, 400, {
                                error: "Missing credentials",
                            });
                            span.setStatus({ code: SpanStatusCode.ERROR });
                            return;
                        }
                        const user = findUser(username);
                        if (!user) {
                            sendJson(res, 401, {
                                error: "Invalid credentials",
                            });
                            span.setStatus({ code: SpanStatusCode.ERROR });
                            return;
                        }
                        const hashed = hashPassword(password, user.salt);
                        if (hashed !== user.hash) {
                            sendJson(res, 401, {
                                error: "Invalid credentials",
                            });
                            span.setStatus({ code: SpanStatusCode.ERROR });
                            return;
                        }

                        const token = signJwt({
                            username: user.username,
                            role: user.role,
                            name: user.name,
                        });
                        res.setHeader(
                            "Set-Cookie",
                            `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax${
                                process.env.NODE_ENV === "production"
                                    ? "; Secure"
                                    : ""
                            }`
                        );

                        sendJson(res, 200, {
                            user: {
                                username: user.username,
                                role: user.role,
                                name: user.name,
                            },
                            expiresIn: JWT_EXPIRES_SECONDS,
                        });
                        span.setStatus({ code: SpanStatusCode.OK });
                    } catch (err) {
                        sendJson(res, 400, { error: err.message });
                        span.recordException(err);
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: err.message,
                        });
                    }
                    return;
                }

                if (pathname === "/api/logout" && req.method === "POST") {
                    res.setHeader(
                        "Set-Cookie",
                        `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${
                            process.env.NODE_ENV === "production"
                                ? "; Secure"
                                : ""
                        }`
                    );
                    sendJson(res, 200, { status: "logged_out" });
                    span.setStatus({ code: SpanStatusCode.OK });
                    return;
                }

                if (pathname === "/api/me" && req.method === "GET") {
                    const auth = authenticateRequest(req);
                    if (!auth) {
                        respondUnauthorized(res);
                        span.setStatus({ code: SpanStatusCode.ERROR });
                        return;
                    }
                    sendJson(res, 200, {
                        user: {
                            username: auth.username,
                            role: auth.role,
                            name: auth.name,
                        },
                    });
                    span.setStatus({ code: SpanStatusCode.OK });
                    return;
                }

                const auth = authenticateRequest(req);
                if (!auth) {
                    respondUnauthorized(res);
                    span.setStatus({ code: SpanStatusCode.ERROR });
                    return;
                }

                if (pathname === "/api/projects" && req.method === "GET") {
                    span.addEvent("projects_retrieved", {
                        "projects.count": state.projects.length,
                    });
                    sendJson(res, 200, state.projects);
                    span.setStatus({ code: SpanStatusCode.OK });
                    span.end();
                    return;
                }

                if (
                    pathname === "/api/attendance/checkin" &&
                    req.method === "POST"
                ) {
                    if (!requireRateLimit(req, res, "checkin")) return;
                    try {
                        const body = await parseBody(req);
                        validateAttendance(body);
                        span.addEvent("checkin_attempt", {
                            "project.id": body.projectId,
                        });

                        const project = state.projects.find(
                            (p) => p.id === body.projectId
                        );
                        if (!project) {
                            sendJson(res, 400, { error: "Unknown project" });
                            span.recordException(
                                new Error("Project not found")
                            );
                            span.setStatus({
                                code: SpanStatusCode.ERROR,
                                message: "unknown project",
                            });
                            span.end();
                            return;
                        }

                        state.attendance.status = "in";
                        state.attendance.projectId = project.id;
                        state.attendance.checkInTime = new Date();
                        saveState();

                        span.addEvent("checkin_success", {
                            "project.name": project.name,
                        });

                        sendJson(res, 200, {
                            status: "in",
                            projectId: project.id,
                            checkedInAt:
                                state.attendance.checkInTime.toISOString(),
                        });
                        span.setStatus({ code: SpanStatusCode.OK });
                    } catch (err) {
                        sendJson(res, 400, { error: err.message });
                        span.recordException(err);
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: err.message,
                        });
                    }
                    return;
                }

                if (
                    pathname === "/api/attendance/checkout" &&
                    req.method === "POST"
                ) {
                    if (!requireRateLimit(req, res, "checkout")) return;
                    if (state.attendance.status === "out") {
                        sendJson(res, 400, { error: "Not checked in" });
                        return;
                    }

                    const checkOutTime = new Date();
                    const startTime = state.attendance.checkInTime
                        ? new Date(state.attendance.checkInTime)
                        : null;
                    const durationMs = startTime ? checkOutTime - startTime : 0;

                    state.attendance.status = "out";
                    state.attendance.projectId = null;
                    state.attendance.checkInTime = null;
                    saveState();

                    sendJson(res, 200, {
                        status: "out",
                        durationMs,
                        checkedOutAt: checkOutTime.toISOString(),
                    });
                    span.setStatus({ code: SpanStatusCode.OK });
                    return;
                }

                if (pathname === "/api/photos" && req.method === "GET") {
                    sendJson(res, 200, state.photos);
                    span.setStatus({ code: SpanStatusCode.OK });
                    return;
                }

                if (pathname === "/api/photos" && req.method === "POST") {
                    try {
                        const body = await parseBody(req);
                        validatePhoto(body);
                        span.addEvent("photo_save_attempt", {
                            "project.id": body.projectId,
                        });

                        const project = state.projects.find(
                            (p) => p.id === body.projectId
                        );
                        const safeDescription = sanitizeText(
                            body.description || "Bez popisu",
                            500
                        );
                        const safeLocation = body.location || null;
                        const entry = {
                            id: state.photos.length + 1,
                            image: body.image,
                            description: safeDescription,
                            projectId: body.projectId || null,
                            projectName: project ? project.name : null,
                            location: safeLocation,
                            timestamp: new Date().toISOString(),
                        };
                        state.photos.push(entry);
                        saveState();

                        span.addEvent("photo_saved", {
                            "photo.id": entry.id,
                            "photo.size_bytes": body.image
                                ? body.image.length
                                : 0,
                        });

                        sendJson(res, 201, entry);
                        span.setStatus({ code: SpanStatusCode.OK });
                    } catch (err) {
                        sendJson(res, 400, { error: err.message });
                        span.recordException(err);
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: err.message,
                        });
                    }
                    return;
                }

                if (pathname === "/api/reports" && req.method === "POST") {
                    try {
                        const body = await parseBody(req);
                        validateReport(body);
                        span.addEvent("report_create", {
                            "report.type": body.type,
                        });

                        const entry = {
                            id: state.reports.length + 1,
                            ...body,
                            createdAt: new Date().toISOString(),
                        };
                        state.reports.push(entry);
                        saveState();

                        span.addEvent("report_created", {
                            "report.id": entry.id,
                        });

                        sendJson(res, 201, entry);
                        span.setStatus({ code: SpanStatusCode.OK });
                    } catch (err) {
                        sendJson(res, 400, { error: err.message });
                        span.recordException(err);
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: err.message,
                        });
                    }
                    return;
                }

                if (pathname === "/api/protocols" && req.method === "POST") {
                    try {
                        const body = await parseBody(req);
                        validateProtocol(body);
                        span.addEvent("protocol_create", {
                            "protocol.type": body.type,
                        });

                        const entry = {
                            id: state.protocols.length + 1,
                            ...body,
                            createdAt: new Date().toISOString(),
                        };
                        state.protocols.push(entry);
                        saveState();

                        span.addEvent("protocol_created", {
                            "protocol.id": entry.id,
                        });

                        sendJson(res, 201, entry);
                        span.setStatus({ code: SpanStatusCode.OK });
                    } catch (err) {
                        sendJson(res, 400, { error: err.message });
                        span.recordException(err);
                        span.setStatus({
                            code: SpanStatusCode.ERROR,
                            message: err.message,
                        });
                    }
                    return;
                }

                sendJson(res, 404, { error: "Not found" });
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: "not found",
                });
                span.end();
            } catch (err) {
                span.recordException(err);
                span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: err.message,
                });
                throw err;
            } finally {
                if (!span.ended) {
                    span.end();
                }
            }
        }
    );
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname === "/" || pathname === "/health") {
        sendText(res, 200, "OK");
        return;
    }

    if (pathname.startsWith("/api/")) {
        handleApi(pathname, req, res);
        return;
    }

    if (pathname === "/app" || pathname === "/app/") {
        serveStatic("/app/index.html", res);
        return;
    }

    if (pathname.startsWith("/app/")) {
        serveStatic(pathname, res);
        return;
    }

    sendText(res, 404, "Not Found");
});

loadState();
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

// Export server for tests if required
module.exports = server;
