# Publish a signed release to the auto-update feed (Supabase Storage public bucket).
#
# Prereqs:
#   - A public Supabase Storage bucket named "releases" (script tries to create it).
#   - A Supabase access token (user JWT with storage write, or service_role key).
#
# Usage:
#   .\tools\publish-release.ps1 -Token "<supabase access token>"
#   .\tools\publish-release.ps1 -Token $env:SUPABASE_TOKEN -Bucket releases -Prefix win
param(
  [string]$Token,
  [string]$SupabaseUrl = 'https://pbisngkepszwzzjivxus.supabase.co',
  [string]$Bucket = 'releases',
  [string]$Prefix = 'win',
  [string]$ReleaseDir = 'release',
  [string]$PfxPath = 'buildResources\lcaai-codesign.pfx',
  [string]$Password = 'LcaAi2026!',
  [string]$Signtool = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign-2.6.0\winCodeSign-2.6.0-5puky\windows-10\x64\signtool.exe"
)
$ErrorActionPreference = 'Stop'
if (-not $Token) { Write-Error 'Pass -Token <supabase access token>'; exit 1 }

$root = (Get-Location).Path
$exeName = 'LCA AI Studio-0.2.0-x64.exe'
$exePath = Join-Path $root "$ReleaseDir\$exeName"
$ymlPath = Join-Path $root "$ReleaseDir\latest.yml"
if (-not (Test-Path $exePath)) { Write-Error "Installer not found: $exePath"; exit 1 }

# 1) ensure bucket exists (public). NOTE: do NOT send file_size_limit here (causes 400 on some projects).
try {
  Invoke-RestMethod -Uri "$SupabaseUrl/storage/v1/bucket" -Method POST -ContentType 'application/json' `
    -Headers @{ Authorization = "Bearer $Token"; apikey = $Token } `
    -Body (@{ id = $Bucket; name = $Bucket; public = $true } | ConvertTo-Json) | Out-Null
  Write-Output "Bucket '$Bucket' created"
} catch { Write-Output "Bucket '$Bucket' already exists (or needs manual create)" }

# 2) sign installer (no timestamp; self-signed)
& $Signtool sign /f $PfxPath /p $Password /fd SHA256 $exePath 2>&1 | Select-Object -Last 1

# 3) recompute latest.yml against signed bytes
$bytes = [System.IO.File]::ReadAllBytes($exePath)
$sha = [Convert]::ToBase64String(([System.Security.Cryptography.SHA512]::Create()).ComputeHash($bytes))
$size = $bytes.Length
$yml = "version: 0.2.0`nfiles:`n  - url: $exeName`n    sha512: $sha`n    size: $size`npath: $exeName`nsha512: $sha`nreleaseDate: '$((Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"))'"
[System.IO.File]::WriteAllText($ymlPath, $yml)
Write-Output "latest.yml regenerated (size=$size)"

# 4) upload latest.yml (small, single POST) then exe (large, TUS chunked)
$hdr = @{ Authorization = "Bearer $Token"; apikey = $Token; 'x-upsert' = 'true' }
Invoke-RestMethod -Uri "$SupabaseUrl/storage/v1/object/$Bucket/$Prefix/latest.yml" -Method POST `
  -Headers ($hdr + @{ 'Content-Type' = 'text/yaml' }) -InFile $ymlPath | Out-Null
Write-Output "uploaded latest.yml"
& "$PSScriptRoot\tus-upload.ps1" -Token $Token -FilePath $exePath -Bucket $Bucket -ObjectPath "$Prefix/$exeName"
Write-Output "uploaded $exeName (TUS)"

Write-Output "`nFeed URL: $SupabaseUrl/storage/v1/object/public/$Bucket/$Prefix/latest.yml"
Write-Output "Done. Clients with electron-updater (generic provider) will pick this up."
