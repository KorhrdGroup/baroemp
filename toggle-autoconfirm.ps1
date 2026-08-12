param(
  [Parameter(Mandatory=$true)][ValidateSet("true","false")][string]$Value
)
$envLine = Get-Content .env.local | Select-String '^SUPABASE_ACCESS_TOKEN='
$token = $envLine.ToString().Split('=', 2)[1]
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$body = @{ mailer_autoconfirm = [System.Convert]::ToBoolean($Value) } | ConvertTo-Json
$resp = Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/dbnjlrnckejaweafolfp/config/auth' -Headers $headers -Method Patch -Body $body
Write-Output "mailer_autoconfirm now: $($resp.mailer_autoconfirm)"
