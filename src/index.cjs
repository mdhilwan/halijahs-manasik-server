const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" })); // allow audio chunks as base64
app.use(express.urlencoded({ limit: "5mb", extended: true }));

let currentOtp = null;
let isLoggedIn = false;
let broadcasting = false;

// Store latest audio chunk
let latestAudioChunk = null;
let latestAudioChunkId = 0;

// Health endpoint
app.get("/health", (req, res) => {
    res.json({ OK: true });
});

// OTP HTML endpoint
app.get("/otp", (req, res) => {
    res.send(`
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <style>
                body { font-family: sans-serif; padding: 20px; text-align: center; }
                .otp-box { font-size: 48px; margin-top: 20px; font-weight: bold; }
                .timer { font-size: 18px; margin-top: 10px; color: #555; }
                button { margin-top: 20px; padding: 10px 20px; font-size: 18px; }
            </style>
        </head>
        <body>
            <h2>Manasik Router OTP</h2>
            <div class="otp-box" id="otp">------</div>
            <div class="timer">Refreshing in <span id="count">60</span>s</div>

            <script>
                async function fetchOtp() {
                    const res = await fetch('/otp/code');
                    const data = await res.json();
                    document.getElementById('otp').innerText = data.otp || '------';
                }

                let counter = 60;
                fetchOtp();

                setInterval(() => {
                    counter--;
                    document.getElementById('count').innerText = counter;
                    if (counter <= 0) {
                        counter = 60;
                        fetchOtp();
                    }
                }, 1000);
            </script>
        </body>
        </html>
    `);
});

// OTP code JSON endpoint
app.get("/otp/code", (req, res) => {
    currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP:", currentOtp);
    res.json({ otp: currentOtp });
});

// Login with OTP
app.post("/login", (req, res) => {
    const { otp } = req.body;

    console.log('/login', `Received "${otp}", expects "${currentOtp}"`)

    if (!currentOtp) {
        return res.status(400).json({ success: false, error: "No OTP generated" });
    }

    if (otp === currentOtp) {
        isLoggedIn = true;
        broadcasting = 'idle';
        currentOtp = null;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: "Invalid OTP" });
    }
});

/* ------------------------
   GET BROADCAST STATUS
-------------------------*/
app.get("/broadcast/current", (req, res) => {
    res.json({ broadcasting });
});

// Start broadcast
app.post("/broadcast/start", (req, res) => {
    if (!isLoggedIn) {
        return res.status(401).json({ success: false, error: "Not logged in" });
    }

    broadcasting = 'live';
    pushSseEvent("status", { broadcasting: "live" });
    latestAudioChunk = null; // reset
    res.json({ broadcasting: true });
});

// Stop broadcast
app.post("/broadcast/stop", (req, res) => {
    if (!isLoggedIn) {
        return res.status(401).json({ success: false, error: "Not logged in" });
    }

    broadcasting = 'idle';
    pushSseEvent("status", { broadcasting: "idle" });
    latestAudioChunk = null; // clear
    res.json({ broadcasting: 'idle' });
});

/* ------------------------
   POST AUDIO CHUNK (USTAZ)
-------------------------*/
app.post("/broadcast/audio", (req, res) => {
    try {
        if (!isLoggedIn || !broadcasting) {
            return res.status(400).json({ success: false, error: "Broadcast inactive" });
        }

        const { data } = req.body; // expect base64 string

        if (!data) {
            return res.status(400).json({ success: false, error: "Missing chunk" });
        }

        latestAudioChunk = data; // store latest chunk only
        latestAudioChunkId += 1;
        pushSseEvent("audio", { chunkId: latestAudioChunkId, data: latestAudioChunk });

        console.log({latestAudioChunkId})

        res.json({ success: true, chunkId: latestAudioChunkId });
    } catch (err) {
        console.error('POST /broadcast/audio error', err);
        res.status(500).json({ success: false, error: 'server error' });
    }
});

/* ------------------------
   SSE STREAM FOR JEMAAH
-------------------------*/
const clients = [];

app.get("/broadcast/stream", (req, res) => {
    // Set SSE headers
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
    });
    res.flushHeaders();

    // Add client to connection list
    const client = { id: Date.now(), res };
    clients.push(client);

    console.log("SSE client connected:", client.id);

    // Initial state
    res.write(`event: status\ndata: ${JSON.stringify({ broadcasting })}\n\n`);

    // Remove client on disconnect
    req.on("close", () => {
        const idx = clients.indexOf(client);
        if (idx !== -1) clients.splice(idx, 1);
        console.log("SSE client disconnected:", client.id);
    });
});

// Helper to push events
function pushSseEvent(event, payload) {
    clients.forEach(c => {
        c.res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    });
}

/* ------------------------
   GET AUDIO CHUNK (JEMAAH)
-------------------------*/
app.get("/broadcast/audio", (req, res) => {
    try {
        if (!broadcasting || !latestAudioChunk) {
            return res.json({ chunkId: 0, data: null });
        }

        res.json({ chunkId: latestAudioChunkId, data: latestAudioChunk });
    } catch (e) {
        console.error('GET /broadcast/audio error', err);
        res.status(500).json({ success: false, error: 'server error' });
    }
});

/* ------------------------
   RESTART SERVER
-------------------------*/
app.post("/restart", (req, res) => {
    res.json({ success: true, message: "Restarting server..." });
    console.log("Restarting server on request...");
    setTimeout(() => {
        process.exit(0); // pm2 or rc.local will restart it
    }, 500);
});

app.listen(4321, () => {
    console.log("Manasik Router API running on port 4321");
});