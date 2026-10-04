param(
    [int]$Port = 8080,
    [string]$OpenPage = "index.html"
)

$ErrorActionPreference = "Stop"
$Root = [System.IO.Path]::GetFullPath($PSScriptRoot)

function Get-MimeType([string]$Path) {
    $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
    switch ($ext) {
        ".html" { return "text/html; charset=utf-8" }
        ".js"   { return "text/javascript; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".svg"  { return "image/svg+xml" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".webp" { return "image/webp" }
        ".wav"  { return "audio/wav" }
        ".mp3"  { return "audio/mpeg" }
        ".ico"  { return "image/x-icon" }
        default  { return "application/octet-stream" }
    }
}

function Send-Response {
    param(
        [System.Net.Sockets.NetworkStream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [string]$ContentType,
        [byte[]]$Body
    )

    $header = "HTTP/1.1 $StatusCode $StatusText`r`n" +
              "Content-Type: $ContentType`r`n" +
              "Content-Length: $($Body.Length)`r`n" +
              "Cache-Control: no-cache`r`n" +
              "Connection: close`r`n`r`n"

    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    if ($Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

$url = "http://127.0.0.1:$Port/$OpenPage"
Write-Host ""
Write-Host "SORT//SHIFT local server" -ForegroundColor Cyan
Write-Host "Game URL: $url" -ForegroundColor Green
Write-Host "Keep this window open while playing. Press Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Milliseconds 350
Start-Process $url

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $null
        try {
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
            $requestLine = $reader.ReadLine()

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                continue
            }

            while ($true) {
                $headerLine = $reader.ReadLine()
                if ($null -eq $headerLine -or $headerLine.Length -eq 0) {
                    break
                }
            }

            $parts = $requestLine.Split(" ")
            if ($parts.Length -lt 2) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Bad Request")
                Send-Response -Stream $stream -StatusCode 400 -StatusText "Bad Request" -ContentType "text/plain; charset=utf-8" -Body $body
                continue
            }

            $requestTarget = $parts[1]
            $queryIndex = $requestTarget.IndexOf("?")
            if ($queryIndex -ge 0) {
                $requestTarget = $requestTarget.Substring(0, $queryIndex)
            }

            $relativePath = [System.Uri]::UnescapeDataString($requestTarget).TrimStart("/")
            if ([string]::IsNullOrWhiteSpace($relativePath)) {
                $relativePath = "index.html"
            }

            $relativePath = $relativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)
            $rootWithSlash = $Root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
            $fullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $relativePath))

            if (-not $fullPath.StartsWith($rootWithSlash, [System.StringComparison]::OrdinalIgnoreCase)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
                Send-Response -Stream $stream -StatusCode 403 -StatusText "Forbidden" -ContentType "text/plain; charset=utf-8" -Body $body
                continue
            }

            if (Test-Path -LiteralPath $fullPath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $mime = Get-MimeType $fullPath
                Send-Response -Stream $stream -StatusCode 200 -StatusText "OK" -ContentType $mime -Body $bytes
            }
            else {
                $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                Send-Response -Stream $stream -StatusCode 404 -StatusText "Not Found" -ContentType "text/plain; charset=utf-8" -Body $body
            }
        }
        catch {
            if ($null -ne $stream) {
                try {
                    $body = [System.Text.Encoding]::UTF8.GetBytes("500 Server Error")
                    Send-Response -Stream $stream -StatusCode 500 -StatusText "Server Error" -ContentType "text/plain; charset=utf-8" -Body $body
                }
                catch {
                }
            }
        }
        finally {
            if ($null -ne $client) {
                $client.Close()
            }
        }
    }
}
finally {
    $listener.Stop()
}
