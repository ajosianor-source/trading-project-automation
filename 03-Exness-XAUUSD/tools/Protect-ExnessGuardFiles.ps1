[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$commonFeed = Join-Path $env:APPDATA 'MetaQuotes\Terminal\Common\Files\ExnessGoldGuard'
$relayConfig = Join-Path $PSScriptRoot 'whatsapp-relay\config.json'
$runtime = Join-Path $projectRoot 'runtime'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

function Protect-Path {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    if ($PSCmdlet.ShouldProcess($Path, 'Restrict ACL to current user and SYSTEM')) {
        $acl = Get-Acl -LiteralPath $Path
        $acl.SetAccessRuleProtection($true, $false)
        foreach ($rule in @($acl.Access)) { [void]$acl.RemoveAccessRuleAll($rule) }
        $inheritance = if ((Get-Item -LiteralPath $Path).PSIsContainer) {
            [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
        } else {
            [System.Security.AccessControl.InheritanceFlags]::None
        }
        foreach ($account in @($identity, 'NT AUTHORITY\SYSTEM')) {
            $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
                $account, 'FullControl', $inheritance,
                [System.Security.AccessControl.PropagationFlags]::None, 'Allow')
            $acl.AddAccessRule($rule)
        }
        Set-Acl -LiteralPath $Path -AclObject $acl
    }
}

Protect-Path $commonFeed
Protect-Path $relayConfig
Protect-Path $runtime
Write-Host 'Sensitive ExnessGuard paths are restricted to the current user and SYSTEM.'
