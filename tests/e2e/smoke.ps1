<#
.SYNOPSIS
    Binary smoke test for zapret-gui.

.DESCRIPTION
    Starts the compiled binary, verifies it survives the first few seconds
    without crashing, then gracefully terminates it.  Designed to run in CI
    after a successful build (both debug and release binaries are accepted).

    Exit codes:
      0 — all assertions passed
      1 — one or more assertions failed

.PARAMETER BinaryPath
    Path to the zapret-gui.exe binary. Defaults to the debug build location.

.PARAMETER StartupWaitSeconds
    How long to wait for the process to be considered "stable". Default: 5.

.EXAMPLE
    # Debug build (fast CI)
    .\tests\e2e\smoke.ps1 -BinaryPath "src-tauri\target\debug\zapret-gui.exe"

    # Release build (release gate)
    .\tests\e2e\smoke.ps1 -BinaryPath "src-tauri\target\release\zapret-gui.exe"
#>
param (
    [string] $BinaryPath        = "src-tauri\target\debug\zapret-gui.exe",
    [int]    $StartupWaitSeconds = 5
)

$ErrorActionPreference = "Stop"
$PassCount = 0
$FailCount = 0

function Pass([string]$msg) { Write-Host "  PASS  $msg" -ForegroundColor Green; $script:PassCount++ }
function Fail([string]$msg) { Write-Host "  FAIL  $msg" -ForegroundColor Red;  $script:FailCount++ }

# ── Pre-flight ─────────────────────────────────────────────────────────────
Write-Host "`n=== zapret-gui binary smoke test ===" -ForegroundColor Cyan
Write-Host "Binary : $BinaryPath"
Write-Host "Timeout: ${StartupWaitSeconds}s`n"

if (-not (Test-Path $BinaryPath)) {
    Write-Host "ERROR: binary not found at '$BinaryPath'" -ForegroundColor Red
    Write-Host "Run 'pnpm tauri build' or 'cargo build' first."
    exit 1
}

# Kill any stale instances left from a previous run
Get-Process -Name "zapret-gui" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 500

# ── Test 1: binary starts without immediate crash ──────────────────────────
$proc = $null
try {
    $proc = Start-Process -FilePath (Resolve-Path $BinaryPath) -PassThru
    Start-Sleep -Seconds $StartupWaitSeconds

    if ($proc.HasExited) {
        Fail "Process exited within ${StartupWaitSeconds}s (exit code: $($proc.ExitCode))"
    } else {
        Pass "Process is running after ${StartupWaitSeconds}s (PID $($proc.Id))"
    }
} catch {
    Fail "Failed to start process: $_"
}

# ── Test 2: process appears in the system process list ─────────────────────
$found = Get-Process -Name "zapret-gui" -ErrorAction SilentlyContinue
if ($found) {
    Pass "zapret-gui found in system process list"
} else {
    Fail "zapret-gui not found in system process list"
}

# ── Test 3: no crash dump written in the last 10 seconds ──────────────────
$crashDir = Join-Path $env:TEMP "zapret-gui-crashes"
$recentCrash = $false
if (Test-Path $crashDir) {
    $recentCrash = Get-ChildItem $crashDir -Filter "*.toml" |
        Where-Object { $_.LastWriteTime -gt (Get-Date).AddSeconds(-($StartupWaitSeconds + 2)) } |
        Select-Object -First 1
}
if ($recentCrash) {
    Fail "Crash report found: $($recentCrash.FullName)"
} else {
    Pass "No crash report written during startup"
}

# ── Teardown ───────────────────────────────────────────────────────────────
Write-Host "`nCleaning up..."
if ($proc -and -not $proc.HasExited) {
    $proc.Kill()
    $null = $proc.WaitForExit(3000)
}
# Also stop any winws.exe the app may have spawned
Get-Process -Name "winws" -ErrorAction SilentlyContinue | Stop-Process -Force

# ── Summary ────────────────────────────────────────────────────────────────
Write-Host "`n────────────────────────────────────"
Write-Host "Results: $PassCount passed, $FailCount failed" -ForegroundColor $(if ($FailCount -eq 0) {"Green"} else {"Red"})

if ($FailCount -gt 0) { exit 1 }
exit 0
