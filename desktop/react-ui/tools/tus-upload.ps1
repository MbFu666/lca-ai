# Chunked (TUS resumable) upload of a large file to Supabase Storage.
# Bypasses the ~50MB single-request limit by uploading in chunks.
param(
  [string]$Token,
  [string]$FilePath,
  [string]$Bucket = 'releases',
  [string]$ObjectPath,           # e.g. "win/LCA AI Studio-0.2.0-x64.exe"
  [string]$SupabaseUrl = 'https://pbisngkepszwzzjivxus.supabase.co',
  [int]$ChunkMB = 8
)
$ErrorActionPreference = 'Stop'
if (-not $ObjectPath) { $ObjectPath = Split-Path $FilePath -Leaf }
$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$total = $bytes.Length
$b64 = { param($s) [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($s)) }
$meta = "bucketName $($b64.Invoke($Bucket)),objectName $($b64.Invoke($ObjectPath))"

$h = @{
  Authorization   = "Bearer $Token"
  apikey          = $Token
  'tus-resumable' = '1.0.0'
  'x-upsert'      = 'true'
}

# 1) create resumable upload
$createHdr = $h.Clone()
$createHdr['Upload-Length'] = "$total"
$createHdr['Upload-Metadata'] = $meta
$resp = Invoke-WebRequest -Uri "$SupabaseUrl/storage/v1/upload/resumable" -Method POST -Headers $createHdr -TimeoutSec 60 -UseBasicParsing
$loc = $resp.Headers['Location']
if (-not $loc) { $loc = $resp.Headers['location'] }
Write-Output "upload created: $loc"
$uploadUrl = if ($loc -match '^http') { $loc } else { "$SupabaseUrl$loc" }

# 2) send chunks
$chunk = $ChunkMB * 1MB
$offset = 0
while ($offset -lt $total) {
  $len = [Math]::Min($chunk, $total - $offset)
  $slice = New-Object byte[] $len
  [Array]::Copy($bytes, $offset, $slice, 0, $len)
  $ph = $h.Clone()
  $ph['Upload-Offset'] = "$offset"
  $ph['Content-Type'] = 'application/offset+octet-stream'
  Invoke-WebRequest -Uri $uploadUrl -Method PATCH -Headers $ph -Body $slice -TimeoutSec 300 -UseBasicParsing | Out-Null
  $offset += $len
  Write-Output ("  uploaded {0:N1} / {1:N1} MB" -f ($offset / 1MB), ($total / 1MB))
}
Write-Output "TUS upload complete: $Bucket/$ObjectPath ($total bytes)"
