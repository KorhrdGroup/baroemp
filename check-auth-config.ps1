$envLine = Get-Content .env.local | Select-String '^SUPABASE_ACCESS_TOKEN='
$token = $envLine.ToString().Split('=', 2)[1]
$headers = @{ Authorization = "Bearer $token" }
$resp = Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/dbnjlrnckejaweafolfp/config/auth' -Headers $headers -Method Get
$resp | Select-Object mailer_autoconfirm, disable_signup, external_email_enabled, smtp_host, rate_limit_email_sent, mailer_secure_email_change_enabled | Format-List
