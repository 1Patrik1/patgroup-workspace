const http = require("http");

const options = {
    hostname: "127.0.0.1",
    port: process.env.PORT || 3000,
    path: "/health",
    method: "GET",
    timeout: 3000,
};

const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
        if (res.statusCode === 200 && data.trim() === "OK") {
            process.exit(0);
            return;
        }
        console.error(
            "Unexpected response:",
            `status=${res.statusCode || ""}`,
            data
        );
        process.exit(2);
    });
});

req.on("error", (err) => {
    console.error("Request error:", err.message);
    process.exit(3);
});

req.end();
