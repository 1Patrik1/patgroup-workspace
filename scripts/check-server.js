const http = require("http");

const PORT = process.env.PORT || 3000;
const options = {
    hostname: "127.0.0.1",
    port: PORT,
    path: "/",
    method: "GET",
    timeout: 5000,
};

const req = http.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
        if (data.trim() === "OK") {
            console.log("check-server: OK");
            process.exit(0);
        } else {
            console.error("check-server: unexpected response:", data);
            process.exit(2);
        }
    });
});

req.on("error", (err) => {
    console.error("check-server: error", err.message);
    process.exit(3);
});

req.end();
