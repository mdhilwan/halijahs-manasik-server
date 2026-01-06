#!/usr/bin/lua
package.path = "/usr/lib/lua/?.lua;/usr/lib/lua/?/init.lua;/usr/lib/lua/?/?.lua;" .. package.path
local http = require("luci.http")
local srv = require("manasik.server")

local cgi = require "luci.sgi.cgi"
local env = cgi.run()

local p = http.getenv("PATH_INFO")

if p == "/health" then srv.health()
elseif p == "/otp" then srv.otp()
elseif p == "/otp/code" then srv.otp_code()
elseif p == "/login" then srv.login()
elseif p == "/broadcast/current" then srv.broadcast_current()
elseif p == "/broadcast/start" then srv.broadcast_start()
elseif p == "/broadcast/stop" then srv.broadcast_stop()
elseif p == "/restart" then srv.restart()
else
    http.status(404)
    http.write("Not found")
end
