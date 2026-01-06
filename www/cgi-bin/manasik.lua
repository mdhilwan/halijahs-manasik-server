#!/usr/bin/lua
package.path = "/usr/lib/lua/?.lua;/usr/lib/lua/?/init.lua;/usr/lib/lua/?/?.lua;" .. package.path
local srv = require("manasik.server")

local p = os.getenv("PATH_INFO")

if not os.getenv("REQUEST_METHOD") then print("Testing Path: " .. (p or "nil")) end

if p == "/health" then srv.health()
elseif p == "/otp" then srv.otp()
elseif p == "/otp/code" then srv.otp_code()
elseif p == "/login" then srv.login()
elseif p == "/broadcast/current" then srv.broadcast_current()
elseif p == "/broadcast/start" then srv.broadcast_start()
elseif p == "/broadcast/stop" then srv.broadcast_stop()
elseif p == "/restart" then srv.restart()
else
    print("Status: 404 Not Found")
    print("Content-Type: text/plain")
    print("")
    print("Not found")
end
