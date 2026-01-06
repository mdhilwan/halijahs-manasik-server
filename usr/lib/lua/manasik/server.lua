local json = require("luci.jsonc")
local http = require("luci.http")
local state = require("manasik.state")

local M = {}

local function cors()
    print("Access-Control-Allow-Origin: *")
    print("Access-Control-Allow-Methods: GET, POST, OPTIONS")
    print("Access-Control-Allow-Headers: Content-Type")
end

local function send(tbl)
    print("Content-Type: application/json")
    print("")
    print(json.stringify(tbl))
end

function M.health()
    cors()
    send({ OK = true })
end

function M.otp()
    cors()
    print("Content-Type: text/html")
    print("")
    print([[
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="font-family:sans-serif;text-align:center;padding:20px">
<h2>Manasik Router OTP</h2>
<div id="otp" style="font-size:48px;font-weight:bold">------</div>
<p>Refreshing in <span id="count">60</span>s</p>
<button onclick="restart()">Restart Server</button>
<script>
async function restart() {
  await fetch('/cgi-bin/manasik.lua/restart', { method:'POST' });
  alert('Restarting…');
}
async function fetchOtp(){
  const r = await fetch('/cgi-bin/manasik.lua/otp/code');
  const j = await r.json();
  document.getElementById('otp').innerText = '"' + j.otp + '"' || '------';
}
let c=60; fetchOtp();
setInterval(()=>{
  c--; document.getElementById('count').innerText=c;
  if(c<=0){c=60;fetchOtp();}
},1000);
</script>
</body>
</html>
    ]])
end

function M.otp_code()
    cors()
    math.randomseed(os.time())
    math.random(); math.random(); math.random() -- pop afew times to improve randomness
    state.currentOtp = tostring(math.random(100000, 999999))
    send({ otp = state.currentOtp })
end

function M.login()
    cors()
    local content_length = tonumber(os.getenv("CONTENT_LENGTH")) or 0
    local body_raw = io.read(content_length)
    local body = json.parse(body_raw)

    if body and body.otp == state.currentOtp then
        state.isLoggedIn = true
        state.broadcasting = "idle"
        state.currentOtp = nil
        send({ success = true })
    else
        print("Status: 401 Unauthorized")
        send({ success = false })
    end
end

function M.broadcast_current()
    cors()
    send({ broadcasting = state.broadcasting })
end

function M.broadcast_start()
    cors()
    state.broadcasting = "live"
    send({ broadcasting = "live" })
end

function M.broadcast_stop()
    cors()
    state.broadcasting = "idle"
    send({ broadcasting = "idle" })
end

function M.restart()
    cors()
    send({ success = true })
    os.execute("/etc/init.d/uhttpd restart &")
end

return M
