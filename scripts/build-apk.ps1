$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskAndroid = Join-Path $taskRoot 'android'
$taskCache = Join-Path $taskAndroid '.toolchain'
$taskJdk = (Get-ChildItem -LiteralPath (Join-Path $taskCache 'jdk') -Directory | Select-Object -First 1).FullName
$taskTools = (Get-ChildItem -LiteralPath (Join-Path $taskCache 'build-tools') -Directory | Select-Object -First 1).FullName
$taskPlatform = (Get-ChildItem -LiteralPath (Join-Path $taskCache 'platform') -Directory | Select-Object -First 1).FullName
$taskAndroidJar = Join-Path $taskPlatform 'android.jar'
$taskMain = Join-Path $taskAndroid 'app\src\main'
$taskBuild = Join-Path $taskAndroid '.build'
$taskSigning = Join-Path $taskAndroid '.signing'
$taskDist = Join-Path $taskRoot 'dist'
$taskApk = Join-Path $taskDist 'Minha Escala - Teste.apk'

foreach ($taskDirectory in @($taskBuild, $taskSigning, $taskDist, "$taskBuild\generated", "$taskBuild\classes", "$taskBuild\dex", "$taskBuild\assets")) {
    New-Item -ItemType Directory -Force -Path $taskDirectory | Out-Null
}
function Run-Checked($Executable, $Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falha no comando: $Executable" }
}

Run-Checked 'node' @((Join-Path $PSScriptRoot 'build-portable.cjs'))
Copy-Item -LiteralPath (Join-Path $taskDist 'Minha Escala - Celular.html') -Destination (Join-Path $taskBuild 'assets\index.html') -Force

# As ferramentas nativas do SDK usam caminhos relativos para aceitar pastas com acentos no Windows.
$taskJarRelative = $taskAndroidJar.Substring($taskRoot.Length + 1)
Run-Checked (Join-Path $taskTools 'aapt2.exe') @('compile', '--dir', 'android\app\src\main\res', '-o', 'android\.build\resources.zip')
Run-Checked (Join-Path $taskTools 'aapt2.exe') @('link', '-o', 'android\.build\base.apk', '-I', $taskJarRelative, '--manifest', 'android\app\src\main\AndroidManifest.xml', 'android\.build\resources.zip', '-A', 'android\.build\assets', '--java', 'android\.build\generated', '--version-code', '1', '--version-name', '0.1.0-teste')

$taskSources = @((Get-ChildItem -LiteralPath (Join-Path $taskMain 'java') -Filter '*.java' -Recurse).FullName) + @((Get-ChildItem -LiteralPath (Join-Path $taskBuild 'generated') -Filter '*.java' -Recurse).FullName)
Run-Checked (Join-Path $taskJdk 'bin\javac.exe') (@('-encoding', 'UTF-8', '--release', '8', '-classpath', $taskAndroidJar, '-d', (Join-Path $taskBuild 'classes')) + $taskSources)
$taskClasses = @((Get-ChildItem -LiteralPath (Join-Path $taskBuild 'classes') -Filter '*.class' -Recurse).FullName)
Run-Checked (Join-Path $taskJdk 'bin\java.exe') (@('-cp', (Join-Path $taskTools 'lib\d8.jar'), 'com.android.tools.r8.D8', '--lib', $taskAndroidJar, '--min-api', '26', '--output', (Join-Path $taskBuild 'dex')) + $taskClasses)

$taskZip = [System.IO.Compression.ZipFile]::Open((Join-Path $taskBuild 'base.apk'), [System.IO.Compression.ZipArchiveMode]::Update)
try {
    foreach ($taskDex in (Get-ChildItem -LiteralPath (Join-Path $taskBuild 'dex') -Filter '*.dex')) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($taskZip, $taskDex.FullName, $taskDex.Name, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $taskZip.Dispose() }
Run-Checked (Join-Path $taskTools 'zipalign.exe') @('-f', '4', 'android\.build\base.apk', 'android\.build\aligned.apk')

$taskKeystore = Join-Path $taskSigning 'teste.keystore'
if (!(Test-Path -LiteralPath $taskKeystore)) {
    # Chave exclusiva para testes locais; a senha padrão não é uma credencial de produção.
    Run-Checked (Join-Path $taskJdk 'bin\keytool.exe') @('-genkeypair', '-keystore', $taskKeystore, '-storepass', 'android', '-keypass', 'android', '-alias', 'minha-escala-teste', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000', '-dname', 'CN=Minha Escala Teste, O=Teste local, C=BR', '-noprompt')
}
Run-Checked (Join-Path $taskJdk 'bin\java.exe') @('-jar', (Join-Path $taskTools 'lib\apksigner.jar'), 'sign', '--ks', $taskKeystore, '--ks-key-alias', 'minha-escala-teste', '--ks-pass', 'pass:android', '--key-pass', 'pass:android', '--out', $taskApk, (Join-Path $taskBuild 'aligned.apk'))
Run-Checked (Join-Path $taskJdk 'bin\java.exe') @('-jar', (Join-Path $taskTools 'lib\apksigner.jar'), 'verify', '--verbose', $taskApk)
Run-Checked (Join-Path $taskTools 'zipalign.exe') @('-c', '4', 'dist\Minha Escala - Teste.apk')
$taskPermissions = & (Join-Path $taskTools 'aapt.exe') dump permissions 'dist\Minha Escala - Teste.apk'
if ($LASTEXITCODE -ne 0 -or ($taskPermissions -match 'uses-permission')) {
    throw 'O APK possui permissões inesperadas. Não distribua este pacote.'
}
Write-Output 'Permissões do APK conferidas: nenhuma.'
Write-Output "APK pronto: $taskApk"
