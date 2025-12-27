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
        if (data.trim() === "OK") process.exit(0);
        console.error("Unexpected response:", data);
        process.exit(2);
    });
});

req.on("error", (err) => {
    console.error("Request error:", err.message);
    process.exit(2);
});

req.end();
