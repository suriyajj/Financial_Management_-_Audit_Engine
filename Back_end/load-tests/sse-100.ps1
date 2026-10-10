# Run after login in a browser/Postman session. This script opens 100 SSE connections with curl.
# Set ACCESS_COOKIE to the accessToken cookie value.
$base="http://localhost:3000"
$jobs=@()
for($i=1;$i -le 100;$i++){
  $jobs += Start-Job -ScriptBlock { param($url,$cookie) curl.exe -N -s -H "Cookie: accessToken=$cookie" $url } -ArgumentList "$base/api/logs/stream",$env:ACCESS_COOKIE
}
Write-Host "100 SSE jobs started. Press Enter to close them."
Read-Host
$jobs | Stop-Job
$jobs | Remove-Job -Force
Write-Host "All SSE jobs stopped. Check active stream count/logs and repeat the test."
