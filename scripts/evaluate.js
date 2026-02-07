#!/usr/bin/env node
/**
 * Evaluation Framework for PATGROUP Workspace
 * Runs comprehensive tests and metrics collection
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;
const TIMEOUT = 5000;

// Evaluation results
const results = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    metrics: {},
    tests: [],
};

// Color codes for terminal output
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[36m",
};

function log(message, color = "reset") {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path, method = "GET", data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: method,
            timeout: TIMEOUT,
            headers: {
                "Content-Type": "application/json",
            },
        };

        if (data && method !== "GET") {
            const postData = JSON.stringify(data);
            options.headers["Content-Length"] = Buffer.byteLength(postData);
        }

        const startTime = Date.now();
        const req = http.request(options, (res) => {
            let body = "";
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => {
                const responseTime = Date.now() - startTime;
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body,
                    responseTime: responseTime,
                });
            });
        });

        req.on("error", reject);
        req.on("timeout", () => {
            req.destroy();
            reject(new Error("Request timeout"));
        });

        if (data && method !== "GET") {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runTest(name, testFn) {
    results.totalTests++;
    const startTime = Date.now();

    try {
        await testFn();
        results.passed++;
        results.tests.push({
            name,
            status: "PASS",
            duration: Date.now() - startTime,
        });
        log(`✓ ${name}`, "green");
        return true;
    } catch (error) {
        results.failed++;
        results.tests.push({
            name,
            status: "FAIL",
            error: error.message,
            duration: Date.now() - startTime,
        });
        log(`✗ ${name}: ${error.message}`, "red");
        return false;
    }
}

// Test suite
async function evaluateEndpoints() {
    log("\n=== Endpoint Evaluation ===", "blue");

    await runTest("Health endpoint responds", async () => {
        const res = await makeRequest("/health");
        if (res.statusCode !== 200)
            throw new Error(`Expected 200, got ${res.statusCode}`);
        if (res.body !== "OK")
            throw new Error(`Expected "OK", got "${res.body}"`);
        results.metrics.healthResponseTime = res.responseTime;
    });

    await runTest("Root endpoint responds", async () => {
        const res = await makeRequest("/");
        if (res.statusCode !== 200)
            throw new Error(`Expected 200, got ${res.statusCode}`);
        if (res.body !== "OK")
            throw new Error(`Expected "OK", got "${res.body}"`);
        results.metrics.rootResponseTime = res.responseTime;
    });

    await runTest("Projects API returns data", async () => {
        const res = await makeRequest("/api/projects");
        if (res.statusCode !== 200)
            throw new Error(`Expected 200, got ${res.statusCode}`);
        const projects = JSON.parse(res.body);
        if (!Array.isArray(projects))
            throw new Error("Expected array of projects");
        if (projects.length === 0)
            throw new Error("Expected at least one project");
        results.metrics.projectCount = projects.length;
        results.metrics.projectsResponseTime = res.responseTime;
    });

    await runTest("Photos API returns data", async () => {
        const res = await makeRequest("/api/photos");
        if (res.statusCode !== 200)
            throw new Error(`Expected 200, got ${res.statusCode}`);
        const photos = JSON.parse(res.body);
        if (!Array.isArray(photos)) throw new Error("Expected array of photos");
        results.metrics.photoCount = photos.length;
        results.metrics.photosResponseTime = res.responseTime;
    });

    await runTest("Attendance check-in endpoint available", async () => {
        const res = await makeRequest("/api/attendance/checkin", "POST", {
            projectId: 1,
            location: { latitude: 50.0, longitude: 14.0 },
        });
        if (![200, 400].includes(res.statusCode)) {
            throw new Error(`Unexpected status ${res.statusCode}`);
        }
    });
}

async function evaluatePerformance() {
    log("\n=== Performance Evaluation ===", "blue");

    await runTest("Response time under 100ms", async () => {
        const res = await makeRequest("/health");
        if (res.responseTime > 100) {
            throw new Error(
                `Response time ${res.responseTime}ms exceeds 100ms threshold`
            );
        }
        results.metrics.avgResponseTime = res.responseTime;
    });

    await runTest("Concurrent requests handled", async () => {
        const requests = Array(10)
            .fill(null)
            .map(() => makeRequest("/health"));
        const responses = await Promise.all(requests);
        const allSuccessful = responses.every((r) => r.statusCode === 200);
        if (!allSuccessful)
            throw new Error("Not all concurrent requests succeeded");
        const avgTime =
            responses.reduce((sum, r) => sum + r.responseTime, 0) /
            responses.length;
        results.metrics.concurrentAvgResponseTime = Math.round(avgTime);
    });
}

async function evaluateDataPersistence() {
    log("\n=== Data Persistence Evaluation ===", "blue");

    await runTest("Data directory exists", async () => {
        const dataDir = path.join(__dirname, "..", "DATA");
        if (!fs.existsSync(dataDir)) {
            throw new Error("DATA directory does not exist");
        }
    });

    await runTest("Store file accessible", async () => {
        const storePath = path.join(__dirname, "..", "DATA", "store.json");
        if (fs.existsSync(storePath)) {
            const content = fs.readFileSync(storePath, "utf8");
            const data = JSON.parse(content);
            results.metrics.storedPhotos = data.photos?.length || 0;
            results.metrics.storedReports = data.reports?.length || 0;
            results.metrics.storedProtocols = data.protocols?.length || 0;
        } else {
            log("Note: store.json will be created on first write", "yellow");
        }
    });
}

async function evaluateCodeQuality() {
    log("\n=== Code Quality Evaluation ===", "blue");

    await runTest("Main server file exists", async () => {
        const serverPath = path.join(__dirname, "..", "app", "index.js");
        if (!fs.existsSync(serverPath)) {
            throw new Error("app/index.js not found");
        }
        const content = fs.readFileSync(serverPath, "utf8");
        results.metrics.serverFileSize = content.length;
    });

    await runTest("Public files exist", async () => {
        const publicDir = path.join(__dirname, "..", "public");
        if (!fs.existsSync(publicDir)) {
            throw new Error("public directory not found");
        }
        const files = ["index.html", "css/style.css", "js/app.js"];
        for (const file of files) {
            const filePath = path.join(publicDir, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`${file} not found in public directory`);
            }
        }
    });

    await runTest("Package.json valid", async () => {
        const pkgPath = path.join(__dirname, "..", "package.json");
        const content = fs.readFileSync(pkgPath, "utf8");
        const pkg = JSON.parse(content);
        if (!pkg.scripts || !pkg.scripts.start) {
            throw new Error("package.json missing start script");
        }
        results.metrics.packageName = pkg.name;
        results.metrics.packageVersion = pkg.version;
    });
}

function generateReport() {
    log("\n=== Evaluation Summary ===", "blue");
    log(`Total Tests: ${results.totalTests}`);
    log(`Passed: ${results.passed}`, "green");
    log(`Failed: ${results.failed}`, results.failed > 0 ? "red" : "reset");
    log(
        `Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(
            1
        )}%`
    );

    log("\n=== Metrics ===", "blue");
    for (const [key, value] of Object.entries(results.metrics)) {
        log(`${key}: ${value}`);
    }

    // Save results to file
    const reportPath = path.join(__dirname, "..", "evaluation-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 4));
    log(`\nReport saved to: ${reportPath}`, "yellow");

    return results.failed === 0 ? 0 : 1;
}

async function main() {
    log("╔════════════════════════════════════════╗", "blue");
    log("║   PATGROUP Evaluation Framework       ║", "blue");
    log("╚════════════════════════════════════════╝", "blue");
    log(`Target: ${BASE_URL}`);
    log(`Timeout: ${TIMEOUT}ms\n`);

    try {
        // Run evaluation suites
        await evaluateCodeQuality();
        await evaluateDataPersistence();
        await evaluateEndpoints();
        await evaluatePerformance();

        // Generate and display report
        const exitCode = generateReport();
        process.exit(exitCode);
    } catch (error) {
        log(`\nFatal error: ${error.message}`, "red");
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { runTest, makeRequest, results };
