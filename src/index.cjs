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
    latestAudioChunk = null; // reset
    res.json({ broadcasting: true });
});

// Stop broadcast
app.post("/broadcast/stop", (req, res) => {
    if (!isLoggedIn) {
        return res.status(401).json({ success: false, error: "Not logged in" });
    }

    broadcasting = 'idle';
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

        const { chunk } = req.body; // expect base64 string

        if (!chunk) {
            return res.status(400).json({ success: false, error: "Missing chunk" });
        }

        latestAudioChunk = chunk; // store latest chunk only
        latestAudioChunkId += 1;

        res.json({ success: true, chunkId: latestAudioChunkId });
    } catch (err) {
        console.error('POST /broadcast/audio error', err);
        res.status(500).json({ success: false, error: 'server error' });
    }
});

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

app.listen(4321, () => {
    console.log("Manasik Router API running on port 4321");
});