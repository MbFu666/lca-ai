# Publish a signed release to GitHub Releases (electron-updater "github" provider feed).
#
# Usage:
#   .\tools\gh-publish-release.ps1 -Token <gh PAT or oauth token> -Owner MbFu666 -Repo lca-ai-releases -Tag v0.2.0
#
# Creates the (public) repo if missing, creates the Release if missing, uploads
# latest.yml + installer as release assets. electron-updater then reads the feed from
# https://github.com/<Owner>/<Repo>/releases (provider: github).
param(
  [string]$Token,
  [string]$Owner = 'MbFu666',
  [string]$Repo = 'lca-ai-releases',
  [string]$Tag = 'v0.2.1',
  [string]$ReleaseDir = 'release',
  [string]$Version = '',   # defaults to version in latest.yml
  [string]$PfxPath = 'buildResources\lcaai-codesign.pfx',
  [string]$Password = $env:PFX_PASSWORD,   # NEVER hardcode; set $env:PFX_PASSWORD
  [string]$Signtool = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign-2.6.0\winCodeSign-2.6.0-5puky\windows-10\x64\signtool.exe"
)
$ErrorActionPreference = 'Stop'
if (-not $Token) { Write-Error 'Pass -Token'; exit 1 }
$H = @{ Authorization = "Bearer $Token"; 'User-Agent' = 'lcaai-publish'; Accept = 'application/vnd.github+json' }
$root = (Get-Location).Path
$ymlPath = Join-Path $root "$ReleaseDir\latest.yml"
if (-not $Version) {
  $Version = (Select-String -Path $ymlPath -Pattern '^version:\s*(.+)$').Matches[0].Groups[1].Value.Trim()
}
$exeName = "LCA AI Studio-$Version-x64.exe"
$exePath = Join-Path $root "$ReleaseDir\$exeName"

# 1) ensure repo exists (public)
try {
  Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo" -Headers $H -TimeoutSec 20 | Out-Null
  Write-Output "repo exists: $Owner/$Repo"
} catch {
  $body = @{ name = $Repo; public = $true; description = 'LCA AI Studio release feed (auto-update)' ; has_issues = $false; has_wiki = $false } | ConvertTo-Json
  Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method POST -Headers $H -ContentType 'application/json' -Body $body -TimeoutSec 30 | Out-Null
  Write-Output "created public repo: $Owner/$Repo"
}

# 1b) ensure repo has at least one commit (GitHub refuses releases on empty repos)
try {
  Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/contents/README.md" -Headers $H -TimeoutSec 20 | Out-Null
} catch {
  $readme = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("# $Repo`n`nRelease feed for LCA AI Studio auto-update (electron-updater github provider).`n"))
  Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/contents/README.md" -Method PUT -Headers $H -ContentType 'application/json' `
    -Body (@{ message = 'init: release feed'; content = $readme } | ConvertTo-Json) -TimeoutSec 30 | Out-Null
  Write-Output "initial commit created (README.md)"
}

# 2) ensure release exists
$rel = $null
try { $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/releases/tags/$Tag" -Headers $H -TimeoutSec 20 } catch { $rel = $null }
if (-not $rel) {
  $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/releases" -Method POST -Headers $H -ContentType 'application/json' `
    -Body (@{ tag_name = $Tag; name = "LCA AI Studio $Tag"; body = 'Auto-update release feed'; draft = $false; prerelease = $false } | ConvertTo-Json) -TimeoutSec 30
  Write-Output "created release: $Tag"
} else { Write-Output "release exists: $Tag" }

# 3) upload assets (replace if present). Large files go through curl (more robust than Invoke-WebRequest).
function Upload-Asset($file, $ctype) {
  $name = Split-Path $file -Leaf
  $existing = $rel.assets | Where-Object { $_.name -eq $name }
  if ($existing) { Invoke-RestMethod -Uri $existing.url -Method DELETE -Headers $H -TimeoutSec 30 | Out-Null }
  $up = "$($rel.upload_url -replace '\{.*$','')?name=$([Uri]::EscapeDataString($name))"
  if ((Get-Item $file).Length -gt 50MB) {
    & curl.exe -sS -L --retry 3 --retry-delay 5 -X POST -H "Authorization: Bearer $Token" -H "User-Agent: lcaai-publish" -H "Content-Type: $ctype" --data-binary "@$file" $up -o "$env:TEMP\gh-asset-resp.json" -w "http=%{http_code}" | Out-Null
    $r = Get-Content "$env:TEMP\gh-asset-resp.json" -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
    if (-not $r -or -not $r.id) { throw "curl upload failed for $name" }
  } else {
    Invoke-WebRequest -Uri $up -Method POST -Headers ($H + @{ 'Content-Type' = $ctype }) -InFile $file -TimeoutSec 600 -UseBasicParsing | Out-Null
  }
  Write-Output "uploaded asset: $name"
}
Upload-Asset $ymlPath 'text/yaml'
Upload-Asset $exePath 'application/octet-stream'

Write-Output "`nFeed: https://github.com/$Owner/$Repo/releases (electron-updater provider: github, owner=$Owner, repo=$Repo)"
