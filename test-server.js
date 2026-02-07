// Initialize tracing first
require("./tracing");

const http = require("http");
const PORT = 3000;

const server = http.createServer((req, res) => {
    console.log(`Request: ${req.method} ${req.url}`);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Test OK\n");
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`Test server running on http://127.0.0.1:${PORT}`);
});

server.on("error", (err) => {
    console.error("Server error:", err);
});
