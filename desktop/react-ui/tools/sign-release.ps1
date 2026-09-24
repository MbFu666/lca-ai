# Sign LCA AI Studio release artifacts with a code-signing certificate.
# Usage:
#   .\sign-release.ps1 -PfxPath buildResources\lcaai-codesign.pfx -Password 'LcaAi2026!'
#   .\sign-release.ps1 -PfxPath C:\path\to\ev-cert.pfx -Password 'secret'   # purchased EV/OV cert
param(
  [string]$PfxPath = 'buildResources\lcaai-codesign.pfx',
  [string]$Password = $env:PFX_PASSWORD,   # NEVER hardcode; set $env:PFX_PASSWORD
  [string]$ReleaseDir = 'release',
  [string]$Timestamp = 'http://timestamp.sectigo.com'
)

$ErrorActionPreference = 'Stop'
if (-not $Password) { Write-Error 'Set $env:PFX_PASSWORD (certificate password) before signing.'; exit 1 }
$targets = Get-ChildItem -Path $ReleaseDir -Filter '*.exe' -ErrorAction SilentlyContinue
if (-not $targets) { Write-Error "No .exe found in $ReleaseDir"; exit 1 }

foreach ($exe in $targets) {
  Write-Output "Signing $($exe.Name) ..."
  & signtool sign /f "$PfxPath" /p "$Password" /fd SHA256 /tr "$Timestamp" /td SHA256 /v "$($exe.FullName)"
  if ($LASTEXITCODE -ne 0) { Write-Warning "signtool failed for $($exe.Name) (exit $LASTEXITCODE)" }
}

Write-Output "`nVerification:"
foreach ($exe in $targets) {
  $sig = Get-AuthenticodeSignature $exe.FullName
  Write-Output ("  {0,-45} {1}" -f $exe.Name, $sig.Status)
}
Write-Output "`nNote: self-signed certs show Status=UnknownError/UntrustedRoot on other machines (not in their trust store)."
Write-Output "      A purchased EV/OV cert from a public CA will show Status=Valid everywhere and clears SmartScreen."
