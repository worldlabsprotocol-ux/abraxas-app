# Run only on an authorized, persistent Windows operator workstation.
# Solana CLI runs in local WSL, while key files remain on BitLocker-protected Windows disks.
# Example: .\scripts\operations\create-devnet-program-signers.ps1 -SignerDirectory 'D:\AbraxasSigners' -BackupDirectory 'E:\AbraxasBackup'
# After a successful read-only preflight, an authorized operator may repeat with
# -Generate -OperatorAuthorized -RecoveryVerified. Only public IDs are printed.
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$SignerDirectory,
  [Parameter(Mandatory = $true)][string]$BackupDirectory,
  [switch]$Generate,
  [switch]$OperatorAuthorized,
  [switch]$RecoveryVerified
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Fail([string]$Message) { throw $Message }
function IsWithin([string]$Path, [string]$Parent) {
  $prefix = $Parent.TrimEnd('\') + '\'
  return $Path.Equals($Parent, [StringComparison]::OrdinalIgnoreCase) -or
    $Path.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)
}
function AssertNoReparseAncestor([string]$Path) {
  $cursor = $Path
  while ($cursor) {
    if (Test-Path -LiteralPath $cursor) {
      $item = Get-Item -LiteralPath $cursor -Force
      if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        Fail 'Signer and backup paths must not traverse links or junctions.'
      }
    }
    $parent = Split-Path -Parent $cursor
    if ($parent -eq $cursor) { break }
    $cursor = $parent
  }
}
function AssertOutsideWorktree([string]$Path) {
  $cursor = $Path
  while ($cursor) {
    if (Test-Path -LiteralPath (Join-Path $cursor '.git')) {
      Fail 'Signer and backup directories must be outside every Git worktree.'
    }
    $parent = Split-Path -Parent $cursor
    if ($parent -eq $cursor) { break }
    $cursor = $parent
  }
}
function AssertEncryptedVolume([string]$Root) {
  $mountPoint = $Root.TrimEnd('\')
  $volume = Get-BitLockerVolume -MountPoint $mountPoint -ErrorAction Stop
  if (-not $volume -or $volume.ProtectionStatus -ne 'On' -or $volume.VolumeStatus -ne 'FullyEncrypted') {
    Fail "BitLocker protection must be on and fully encrypted for $mountPoint."
  }
  if (-not @($volume.KeyProtector | Where-Object { $_.KeyProtectorType -eq 'RecoveryPassword' }).Count) {
    Fail "A recovery protector is required for $mountPoint."
  }
}
function SetPrivateAcl([string]$Path, [bool]$IsDirectory, [System.Security.Principal.SecurityIdentifier]$Sid) {
  $acl = Get-Acl -LiteralPath $Path
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($rule in @($acl.Access)) { [void]$acl.RemoveAccessRuleAll($rule) }
  if ($IsDirectory) {
    $access = [System.Security.AccessControl.FileSystemAccessRule]::new(
      $Sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
  } else {
    $access = [System.Security.AccessControl.FileSystemAccessRule]::new($Sid, 'FullControl', 'Allow')
  }
  $acl.AddAccessRule($access)
  Set-Acl -LiteralPath $Path -AclObject $acl
}
function AssertPrivateAcl([string]$Path, [System.Security.Principal.SecurityIdentifier]$Sid) {
  $acl = Get-Acl -LiteralPath $Path
  if (-not $acl.AreAccessRulesProtected) { Fail 'Private file or directory inherits access rules.' }
  $operatorGrant = $false
  foreach ($rule in $acl.Access) {
    if ($rule.AccessControlType -eq 'Allow') {
      $ruleSid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier])
      if ($ruleSid.Value -ne $Sid.Value) { Fail 'Private file or directory has an unexpected access grant.' }
      $operatorGrant = $true
    }
  }
  if (-not $operatorGrant) { Fail 'Private file or directory lacks an operator access grant.' }
}
function WslPath([string]$Path) {
  $translated = (& wsl.exe --exec wslpath -a -u $Path 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $translated -notmatch '^/') { Fail 'WSL cannot map a protected Windows path.' }
  $roundTrip = (& wsl.exe --exec wslpath -w $translated 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or -not ([IO.Path]::GetFullPath($roundTrip)).Equals(
      [IO.Path]::GetFullPath($Path), [StringComparison]::OrdinalIgnoreCase)) {
    Fail 'WSL path mapping does not resolve to the protected Windows file.'
  }
  return $translated
}
function PublicId([string]$Keygen, [string]$Path) {
  $id = (& wsl.exe --exec $Keygen pubkey (WslPath $Path) 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $id -notmatch '^[1-9A-HJ-NP-Za-km-z]{32,44}$') {
    Fail 'Could not derive a program public ID from a retained signer.'
  }
  return $id
}

if ($env:CI -or $env:GITHUB_ACTIONS) { Fail 'Refusing signer creation in CI.' }
if ($Generate -and (-not $OperatorAuthorized -or -not $RecoveryVerified)) {
  Fail 'Generation requires explicit operator authorization and an independently tested BitLocker recovery backup.'
}
if (-not $SignerDirectory -or -not $BackupDirectory) { Fail 'Both absolute directories are required.' }
if ($SignerDirectory -notmatch '^[A-Za-z]:\\' -or $BackupDirectory -notmatch '^[A-Za-z]:\\') {
  Fail 'Use absolute local Windows drive paths, not relative or network paths.'
}
$signerPath = [IO.Path]::GetFullPath($SignerDirectory).TrimEnd('\')
$backupPath = [IO.Path]::GetFullPath($BackupDirectory).TrimEnd('\')
$signerRoot = [IO.Path]::GetPathRoot($signerPath)
$backupRoot = [IO.Path]::GetPathRoot($backupPath)
if ($signerRoot.Equals($backupRoot, [StringComparison]::OrdinalIgnoreCase)) {
  Fail 'The encrypted backup must be on a separate physical drive.'
}
$signerPartition = Get-Partition -DriveLetter $signerRoot[0] -ErrorAction Stop
$backupPartition = Get-Partition -DriveLetter $backupRoot[0] -ErrorAction Stop
if ($signerPartition.DiskNumber -eq $backupPartition.DiskNumber) {
  Fail 'The encrypted backup must be on a different physical disk.'
}
AssertEncryptedVolume $signerRoot
AssertEncryptedVolume $backupRoot
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$restricted = @($repoRoot, [IO.Path]::GetFullPath([IO.Path]::GetTempPath()))
if ($env:CODEX_HOME) { $restricted += [IO.Path]::GetFullPath($env:CODEX_HOME) }
if ($env:USERPROFILE) { $restricted += [IO.Path]::GetFullPath((Join-Path $env:USERPROFILE '.codex')) }
foreach ($path in @($signerPath, $backupPath)) {
  foreach ($parent in $restricted) {
    if (IsWithin $path $parent) { Fail 'Signer and backup directories must be outside the repository, Codex, and temporary storage.' }
  }
  AssertNoReparseAncestor $path
  AssertOutsideWorktree $path
}
if (-not (Get-Command wsl.exe -CommandType Application -ErrorAction SilentlyContinue)) {
  Fail 'Local WSL with the official Solana CLI is required on this Windows workstation.'
}
$keygen = (& wsl.exe --exec bash -lc 'command -v solana-keygen' 2>$null | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $keygen -notmatch '^/[A-Za-z0-9_./-]+$') {
  Fail 'Install the official Solana CLI in local WSL before signer generation.'
}
$proof = Join-Path $signerPath 'abraxas-proof-continuity-devnet.json'
$consumer = Join-Path $signerPath 'abraxas-entitlement-consumer-devnet.json'
$proofBackup = Join-Path $backupPath 'abraxas-proof-continuity-devnet.json'
$consumerBackup = Join-Path $backupPath 'abraxas-entitlement-consumer-devnet.json'
$allPaths = @($proof, $consumer, $proofBackup, $consumerBackup)
$existing = @($allPaths | Where-Object { Test-Path -LiteralPath $_ })
if ($existing.Count -gt 0 -and $existing.Count -ne 4) {
  Fail 'A partial signer or backup set exists. Stop and reconcile; no key will be replaced.'
}
if ($existing.Count -eq 0 -and -not $Generate) {
  Write-Output 'READY_FOR_OPERATOR: encrypted separate disks and WSL Solana CLI verified; no key was generated.'
  return
}
$sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
if ($existing.Count -eq 0) {
  if (-not (Test-Path -LiteralPath $signerPath)) {
    New-Item -ItemType Directory -Path $signerPath -ErrorAction Stop | Out-Null
  }
  if (-not (Test-Path -LiteralPath $backupPath)) {
    New-Item -ItemType Directory -Path $backupPath -ErrorAction Stop | Out-Null
  }
  SetPrivateAcl $signerPath $true $sid
  SetPrivateAcl $backupPath $true $sid
  foreach ($path in @($proof, $consumer)) {
    & wsl.exe --exec $keygen new --silent --no-bip39-passphrase --outfile (WslPath $path) *> $null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $path)) {
      Fail 'Signer creation failed. Stop and reconcile any partial files; never regenerate automatically.'
    }
    SetPrivateAcl $path $false $sid
  }
  Copy-Item -LiteralPath $proof -Destination $proofBackup -ErrorAction Stop
  Copy-Item -LiteralPath $consumer -Destination $consumerBackup -ErrorAction Stop
  SetPrivateAcl $proofBackup $false $sid
  SetPrivateAcl $consumerBackup $false $sid
}
foreach ($path in @($signerPath, $backupPath) + $allPaths) { AssertPrivateAcl $path $sid }
if ((Get-FileHash -LiteralPath $proof -Algorithm SHA256).Hash -ne
    (Get-FileHash -LiteralPath $proofBackup -Algorithm SHA256).Hash -or
    (Get-FileHash -LiteralPath $consumer -Algorithm SHA256).Hash -ne
    (Get-FileHash -LiteralPath $consumerBackup -Algorithm SHA256).Hash) {
  Fail 'Encrypted backup bytes differ from the retained signers.'
}
$proofId = PublicId $keygen $proof
$consumerId = PublicId $keygen $consumer
if ($proofId -eq $consumerId -or $proofId -ne (PublicId $keygen $proofBackup) -or
    $consumerId -ne (PublicId $keygen $consumerBackup)) {
  Fail 'Backup public IDs differ from retained signers.'
}
Write-Output "proof_continuity_public_id=$proofId"
Write-Output "entitlement_consumer_public_id=$consumerId"
Write-Output 'Retain both private signer files and the separate encrypted backup. Share only the public IDs.'

