param(
    [switch]$NoNewWindows
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "ai_backend"
$frontendDir = Join-Path $root "pmh_frontend"

if (-not (Test-Path (Join-Path $backendDir "app\main.py"))) {
    throw "Backend entrypoint not found at $backendDir\app\main.py"
}

if (-not (Test-Path (Join-Path $frontendDir "package.json"))) {
    throw "Frontend package.json not found at $frontendDir\package.json"
}

function Start-ProjectProcess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Title,
        [Parameter(Mandatory = $true)]
        [string]$WorkingDirectory,
        [Parameter(Mandatory = $true)]
        [string]$Command
    )

    if ($NoNewWindows) {
        Write-Host "Starting $Title in current window context..."
        Start-Job -Name $Title -ScriptBlock {
            param($wd, $cmd)
            Set-Location $wd
            Invoke-Expression $cmd
        } -ArgumentList $WorkingDirectory, $Command | Out-Null
        return
    }

    $launcher = @"
Set-Location '$WorkingDirectory'
`$host.UI.RawUI.WindowTitle = '$Title'
Write-Host 'Running $Title...' -ForegroundColor Cyan
$Command
"@

    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", $launcher
    ) | Out-Null
}

Start-ProjectProcess -Title "MATRIA Backend" -WorkingDirectory $backendDir -Command "python -m uvicorn app.main:app --reload --port 8000"
Start-ProjectProcess -Title "MATRIA Frontend" -WorkingDirectory $frontendDir -Command "npm run dev"

if ($NoNewWindows) {
    Write-Host ""
    Write-Host "Started backend and frontend as background jobs in this PowerShell session." -ForegroundColor Green
    Write-Host "Use 'Get-Job' to inspect them and 'Receive-Job -Keep -Name ""MATRIA Backend""' to read output." -ForegroundColor Green
} else {
    Write-Host "Started MATRIA backend and frontend in separate PowerShell windows." -ForegroundColor Green
}
