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

    broadcasting = true;
    latestAudioChunk = null; // reset
    res.json({ broadcasting: true });
});

// Stop broadcast
app.post("/broadcast/stop", (req, res) => {
    if (!isLoggedIn) {
        return res.status(401).json({ success: false, error: "Not logged in" });
    }

    broadcasting = false;
    latestAudioChunk = null; // clear
    res.json({ broadcasting: false });
});

/* ------------------------
   POST AUDIO CHUNK (USTAZ)
-------------------------*/
app.post("/broadcast/audio", (req, res) => {
    if (!isLoggedIn || !broadcasting) {
        return res.status(400).json({ success: false, error: "Broadcast inactive" });
    }

    const { chunk } = req.body; // expect base64 string

    if (!chunk) {
        return res.status(400).json({ success: false, error: "Missing chunk" });
    }

    latestAudioChunk = chunk; // store latest chunk only
    res.json({ success: true });
});

/* ------------------------
   GET AUDIO CHUNK (JEMAAH)
-------------------------*/
app.get("/broadcast/audio", (req, res) => {
    if (!broadcasting || !latestAudioChunk) {
        return res.json({ chunk: null });
    }

    res.json({ chunk: latestAudioChunk });
});

app.listen(4321, () => {
    console.log("Manasik Router API running on port 4321");
});