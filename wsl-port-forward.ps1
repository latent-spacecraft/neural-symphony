# Neural Symphony WSL2 Port Forwarding Script
# Run this as Administrator in Windows PowerShell

Write-Host "🎼 Neural Symphony - WSL2 Port Forwarding Setup" -ForegroundColor Magenta
Write-Host "=================================================" -ForegroundColor Magenta

# Get WSL2 IP address
$wslIP = bash.exe -c "hostname -I | cut -d' ' -f1"
$wslIP = $wslIP.Trim()

Write-Host "WSL2 IP Address: $wslIP" -ForegroundColor Green

# Remove existing port forwarding rules (if any)
Write-Host "Removing existing port forwarding rules..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenport=3000 | Out-Null
netsh interface portproxy delete v4tov4 listenport=3001 | Out-Null
netsh interface portproxy delete v4tov4 listenport=3002 | Out-Null

# Add new port forwarding rules
Write-Host "Setting up port forwarding..." -ForegroundColor Yellow
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3000 connectaddress=$wslIP connectport=3000
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3001 connectaddress=$wslIP connectport=3001
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3002 connectaddress=$wslIP connectport=3002

# Add Windows Firewall rules
Write-Host "Configuring Windows Firewall..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Neural Symphony Frontend" | Out-Null
netsh advfirewall firewall delete rule name="Neural Symphony Backend" | Out-Null
netsh advfirewall firewall delete rule name="Neural Symphony WebSocket" | Out-Null

netsh advfirewall firewall add rule name="Neural Symphony Frontend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Neural Symphony Backend" dir=in action=allow protocol=TCP localport=3001
netsh advfirewall firewall add rule name="Neural Symphony WebSocket" dir=in action=allow protocol=TCP localport=3002

# Display current port forwarding rules
Write-Host "Current port forwarding rules:" -ForegroundColor Green
netsh interface portproxy show all

Write-Host ""
Write-Host "✅ Port forwarding setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3001/health" -ForegroundColor White
Write-Host "   From other devices: http://[YOUR-PC-IP]:3000" -ForegroundColor White
Write-Host ""
Write-Host "💡 To remove port forwarding later, run:" -ForegroundColor Yellow
Write-Host "   netsh interface portproxy reset" -ForegroundColor Gray