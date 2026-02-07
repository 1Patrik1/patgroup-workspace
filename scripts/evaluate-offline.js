#!/usr/bin/env node
/**
 * Offline Evaluation Framework
 * Runs static analysis and code quality checks without requiring a running server
 */

const fs = require("fs");
const path = require("path");

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    blue: "\x1b[36m",
};

const results = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    metrics: {},
    tests: [],
};

function log(message, color = "reset") {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runTest(name, testFn) {
    results.totalTests++;
    try {
        testFn();
        results.passed++;
        results.tests.push({ name, status: "PASS" });
        log(`✓ ${name}`, "green");
        return true;
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: "FAIL", error: error.message });
        log(`✗ ${name}: ${error.message}`, "red");
        return false;
    }
}

function warning(message) {
    results.warnings++;
    log(`⚠ ${message}`, "yellow");
}

function analyzeFile(filePath, checks) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, "utf8");

    for (const [name, checkFn] of Object.entries(checks)) {
        if (!checkFn(content)) {
            throw new Error(`Check failed: ${name}`);
        }
    }

    return content;
}

function evaluateProjectStructure() {
    log("\n=== Project Structure ===", "blue");

    runTest("Required directories exist", () => {
        const dirs = ["app", "public", "scripts", "DATA"];
        for (const dir of dirs) {
            const dirPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(dirPath)) {
                throw new Error(`Missing directory: ${dir}`);
            }
        }
    });

    runTest("Required files exist", () => {
        const files = [
            "package.json",
            "README.md",
            "app/index.js",
            "public/index.html",
            "public/css/style.css",
            "public/js/app.js",
        ];
        for (const file of files) {
            const filePath = path.join(process.cwd(), file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Missing file: ${file}`);
            }
        }
    });

    runTest("Configuration files valid", () => {
        const pkgPath = path.join(process.cwd(), "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

        if (!pkg.scripts || !pkg.scripts.start) {
            throw new Error("Missing start script in package.json");
        }
        if (!pkg.main) {
            throw new Error("Missing main entry point in package.json");
        }

        results.metrics.packageName = pkg.name;
        results.metrics.packageVersion = pkg.version;
    });
}

function evaluateServerCode() {
    log("\n=== Server Code Analysis ===", "blue");

    runTest("Server file structure", () => {
        const serverPath = path.join(process.cwd(), "app", "index.js");
        const content = analyzeFile(serverPath, {
            "Has HTTP server": (c) =>
                c.includes("http.createServer") ||
                c.includes("require('http')"),
            "Handles routes": (c) =>
                c.includes("req.url") || c.includes("pathname"),
            "Has error handling": (c) =>
                c.includes("try") && c.includes("catch"),
            "Exports server": (c) =>
                c.includes("module.exports") || c.includes("listen"),
        });

        results.metrics.serverLines = content.split("\n").length;
        results.metrics.serverSize = content.length;
    });
}

function evaluateFrontendCode() {
    log("\n=== Frontend Code Analysis ===", "blue");

    runTest("HTML structure valid", () => {
        const htmlPath = path.join(process.cwd(), "public", "index.html");
        const content = analyzeFile(htmlPath, {
            "Has DOCTYPE": (c) => c.includes("<!DOCTYPE html>"),
            "Has head tag": (c) => c.includes("<head>"),
            "Has body tag": (c) => c.includes("<body>"),
            "Links stylesheet": (c) => c.includes("css/style.css"),
            "Links JavaScript": (c) => c.includes("js/app.js"),
        });

        results.metrics.htmlLines = content.split("\n").length;
    });

    runTest("JavaScript frontend exists", () => {
        const jsPath = path.join(process.cwd(), "public", "js", "app.js");
        const content = analyzeFile(jsPath, {
            "Has API calls": (c) =>
                c.includes("fetch") || c.includes("XMLHttpRequest"),
            "Has DOM manipulation": (c) =>
                c.includes("document.") || c.includes("querySelector"),
        });

        results.metrics.frontendJsLines = content.split("\n").length;
    });

    runTest("CSS styling exists", () => {
        const cssPath = path.join(process.cwd(), "public", "css", "style.css");
        const content = fs.readFileSync(cssPath, "utf8");

        if (content.length < 100) {
            warning("CSS file seems minimal");
        }

        results.metrics.cssLines = content.split("\n").length;
        results.metrics.cssSize = content.length;
    });
}

function evaluateAPIEndpoints() {
    log("\n=== API Endpoint Analysis ===", "blue");

    runTest("API endpoints defined", () => {
        const serverPath = path.join(process.cwd(), "app", "index.js");
        const content = fs.readFileSync(serverPath, "utf8");

        const endpoints = [
            "/health",
            "/api/projects",
            "/api/photos",
            "/api/attendance/checkin",
            "/api/attendance/checkout",
        ];

        const foundEndpoints = [];
        for (const endpoint of endpoints) {
            if (content.includes(endpoint)) {
                foundEndpoints.push(endpoint);
            }
        }

        results.metrics.definedEndpoints = foundEndpoints.length;
        results.metrics.endpoints = foundEndpoints;

        if (foundEndpoints.length < 3) {
            throw new Error(`Only ${foundEndpoints.length} endpoints found`);
        }
    });
}

function evaluateDataPersistence() {
    log("\n=== Data Persistence ===", "blue");

    runTest("Data directory accessible", () => {
        const dataDir = path.join(process.cwd(), "DATA");
        if (!fs.existsSync(dataDir)) {
            throw new Error("DATA directory not found");
        }

        const stats = fs.statSync(dataDir);
        if (!stats.isDirectory()) {
            throw new Error("DATA is not a directory");
        }
    });

    runTest("Store file structure", () => {
        const storePath = path.join(process.cwd(), "DATA", "store.json");

        if (fs.existsSync(storePath)) {
            const content = fs.readFileSync(storePath, "utf8");
            const data = JSON.parse(content);

            results.metrics.storedPhotos = data.photos?.length || 0;
            results.metrics.storedReports = data.reports?.length || 0;
            results.metrics.storedProtocols = data.protocols?.length || 0;
            results.metrics.hasAttendanceState = !!data.attendanceState;
        } else {
            warning(
                "store.json not yet created (will be created on first write)"
            );
        }
    });
}

function evaluateScripts() {
    log("\n=== Scripts Analysis ===", "blue");

    runTest("Test scripts exist", () => {
        const scripts = [
            "check.js",
            "check-server.js",
            "evaluate.js",
            "evaluate-offline.js",
        ];
        const scriptsDir = path.join(process.cwd(), "scripts");

        const found = [];
        for (const script of scripts) {
            const scriptPath = path.join(scriptsDir, script);
            if (fs.existsSync(scriptPath)) {
                found.push(script);
            }
        }

        results.metrics.availableScripts = found.length;

        if (found.length < 2) {
            throw new Error("Not enough test scripts found");
        }
    });
}

function calculateCodeMetrics() {
    log("\n=== Code Metrics ===", "blue");

    const codeFiles = [
        "app/index.js",
        "public/js/app.js",
        "public/css/style.css",
        "public/index.html",
    ];

    let totalLines = 0;
    let totalSize = 0;

    for (const file of codeFiles) {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf8");
            const lines = content.split("\n").length;
            const size = content.length;

            totalLines += lines;
            totalSize += size;
        }
    }

    results.metrics.totalCodeLines = totalLines;
    results.metrics.totalCodeSize = totalSize;

    log(`Total lines of code: ${totalLines}`);
    log(`Total code size: ${(totalSize / 1024).toFixed(2)} KB`);
}

function generateReport() {
    log("\n=== Evaluation Summary ===", "blue");
    log(`Total Tests: ${results.totalTests}`);
    log(`Passed: ${results.passed}`, "green");
    log(`Failed: ${results.failed}`, results.failed > 0 ? "red" : "reset");
    log(
        `Warnings: ${results.warnings}`,
        results.warnings > 0 ? "yellow" : "reset"
    );
    log(
        `Success Rate: ${((results.passed / results.totalTests) * 100).toFixed(
            1
        )}%`
    );

    log("\n=== Metrics ===", "blue");
    for (const [key, value] of Object.entries(results.metrics)) {
        if (typeof value === "object") {
            log(`${key}:`);
            console.log(value);
        } else {
            log(`${key}: ${value}`);
        }
    }

    const reportPath = path.join(
        process.cwd(),
        "evaluation-offline-report.json"
    );
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 4));
    log(`\nReport saved to: ${reportPath}`, "yellow");

    return results.failed === 0 ? 0 : 1;
}

function main() {
    log("╔════════════════════════════════════════╗", "blue");
    log("║   PATGROUP Offline Evaluation         ║", "blue");
    log("╚════════════════════════════════════════╝", "blue");
    log(`Working directory: ${process.cwd()}\n`);

    try {
        evaluateProjectStructure();
        evaluateServerCode();
        evaluateFrontendCode();
        evaluateAPIEndpoints();
        evaluateDataPersistence();
        evaluateScripts();
        calculateCodeMetrics();

        const exitCode = generateReport();
        process.exit(exitCode);
    } catch (error) {
        log(`\nFatal error: ${error.message}`, "red");
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { runTest, results };
