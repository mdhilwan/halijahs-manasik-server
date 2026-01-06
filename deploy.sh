#!/bin/sh

# 1. Pull latest code
echo "Pulling latest code..."
git pull || { echo "Git pull failed"; exit 1; }

# 2. Deploy Lua modules and scripts
echo "Copying files..."
cp -r usr/lib/lua/manasik /usr/lib/lua/
cp www/cgi-bin/manasik.lua /www/cgi-bin/
cp etc/init.d/manasik /etc/init.d/

# 3. Set executable permissions
echo "Setting permissions..."
chmod +x /www/cgi-bin/manasik.lua
chmod +x /etc/init.d/manasik

# 4. Restart web server
echo "Restarting uhttpd..."
/etc/init.d/uhttpd restart

# 5. Health Check
echo "Running health check..."
RESPONSE=$(curl -s 127.0.0.1)

if echo "$RESPONSE" | grep -q '"OK": true' || echo "$RESPONSE" | grep -q '"ok": true'; then
    echo "Deployment successful: $RESPONSE"
else
    echo "Deployment FAILED: $RESPONSE"
    exit 1
fi