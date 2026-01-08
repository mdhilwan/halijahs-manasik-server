local json = require("luci.jsonc")
local http = require("luci.http")
local state = require("manasik.state")
local OTP_FILE = "/tmp/manasik_otp"
local BROADCAST_STATE_FILE = "/tmp/broadcast_state"

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
    local code = tostring(math.random(100000, 999999))
    M.save_otp(code)
    send({ otp = code })
end

local function log(msg)
    local safe_msg = tostring(msg):gsub('"', '\\"')
    os.execute(string.format('logger -t "MANASIK_DEBUG" "%s"', safe_msg))
end

function M.login()
    cors()
    local content_length = tonumber(os.getenv("CONTENT_LENGTH")) or 0
    local body_raw = io.read(content_length)
    local expectedOtp = M.get_otp()
    log("expectedOtp: " .. (expectedOtp or "nil"))

    local body = json.parse(body_raw)

    if body then
        log("Parsed OTP: " .. tostring(body.otp) .. " | Expected: " .. tostring(expectedOtp))
    else
        log("JSON Parsing failed")
    end

    if body and expectedOtp and body.otp == expectedOtp then
        os.remove("/tmp/manasik_otp")
        state.isLoggedIn = true
        M.save_broadcast_state("idle")
        send({ success = true })
    else
        print("Status: 401 Unauthorized")
        send({ success = false })
    end
end

function M.broadcast_current()
    cors()
    local current = M.get_broadcast_state()
    log("broadcast_current ::: " + current)
    send({ broadcasting = current })
end

function M.broadcast_start()
    cors()
    log("broadcast_start")
    M.save_broadcast_state("live")
    send({ broadcasting = "live" })
end

function M.broadcast_stop()
    cors()
    log("broadcast_stop")
    M.save_broadcast_state("idle")
    send({ broadcasting = "idle" })
end

function M.restart()
    cors()
    send({ success = true })
    os.execute("/etc/init.d/uhttpd restart &")
end

function M.save_otp(code)
    local f = io.open(OTP_FILE, "w")
    if f then
        f:write(code)
        f:close()
    end
end

function M.get_otp()
    local f = io.open(OTP_FILE, "r")
    if f then
        local code = f:read("*all")
        f:close()
        return code
    end
    return nil
end

function M.save_broadcast_state(code)
    local f = io.open(BROADCAST_STATE_FILE, "w")
    if f then
        f:write(code)
        f:close()
    end
end

function M.get_broadcast_state()
    local f = io.open(BROADCAST_STATE_FILE, "r")
    if f then
        local code = f:read("*all")
        f:close()
        return code
    end
    return nil
end

return M
