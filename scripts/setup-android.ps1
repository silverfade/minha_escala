param([ValidateSet('jdk', 'tools', 'platform', 'all')][string]$Component = 'all')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskCache = Join-Path $taskRoot 'android\.toolchain'
New-Item -ItemType Directory -Force -Path $taskCache | Out-Null

function Get-VerifiedArchive($Url, $Name, $Checksum, $Algorithm, $Destination) {
    $taskArchive = Join-Path $taskCache $Name
    if (!(Test-Path -LiteralPath $taskArchive)) {
        Invoke-WebRequest -Uri $Url -OutFile $taskArchive
    }
    if ((Get-FileHash -LiteralPath $taskArchive -Algorithm $Algorithm).Hash.ToLowerInvariant() -ne $Checksum.ToLowerInvariant()) {
        throw "Checksum incorreto para $Name. O arquivo não será executado."
    }
    if (!(Test-Path -LiteralPath $Destination)) {
        Expand-Archive -LiteralPath $taskArchive -DestinationPath $Destination
    }
    Write-Output "Conferido e extraído: $Name"
}

if ($Component -in @('jdk', 'all')) {
    $taskMetadata = Join-Path $taskCache 'jdk.json'
    if (!(Test-Path -LiteralPath $taskMetadata)) {
        Invoke-WebRequest -Uri 'https://api.adoptium.net/v3/assets/latest/17/hotspot?architecture=x64&image_type=jdk&os=windows' -OutFile $taskMetadata
    }
    $taskJdk = (Get-Content -LiteralPath $taskMetadata -Raw | ConvertFrom-Json)[0].binary.package
    Get-VerifiedArchive $taskJdk.link 'jdk17.zip' $taskJdk.checksum 'SHA256' (Join-Path $taskCache 'jdk')
}
if ($Component -in @('tools', 'all')) {
    Get-VerifiedArchive 'https://dl.google.com/android/repository/build-tools_r35_windows.zip' 'build-tools.zip' 'af059bb67cf7786f45ee0db85e2d24985df1b4b6' 'SHA1' (Join-Path $taskCache 'build-tools')
}
if ($Component -in @('platform', 'all')) {
    Get-VerifiedArchive 'https://dl.google.com/android/repository/platform-35_r02.zip' 'platform35.zip' '0bb560a90a7a2cbd0dd8348224d518b638fe7949' 'SHA1' (Join-Path $taskCache 'platform')
}
