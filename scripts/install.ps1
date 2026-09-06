[CmdletBinding()]
param(
    [string]$RepositoryUrl,
    [switch]$PrintUrl
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

try {
    if (-not $RepositoryUrl) {
        $header = Get-Content -LiteralPath (Join-Path $projectRoot 'src\userscript-header.txt') -Raw -Encoding UTF8
        $download = [regex]::Match($header, '(?m)^//\s*@downloadURL\s+(https://[A-Za-z0-9-]+\.github\.io/\S+)\s*$')
        if ($download.Success) {
            $installUrl = $download.Groups[1].Value.Trim()
        } elseif ((Test-Path -LiteralPath (Join-Path $projectRoot '.git')) -and (Get-Command git -ErrorAction SilentlyContinue)) {
            $RepositoryUrl = git -C $projectRoot config --get remote.origin.url
            if ($LASTEXITCODE -ne 0) { $RepositoryUrl = $null }
        }
    }

    if (-not $installUrl) {
        if (-not $RepositoryUrl) {
            if ($PrintUrl) { throw 'Brak adresu repozytorium. Podaj -RepositoryUrl.' }
            $RepositoryUrl = Read-Host 'Adres repozytorium GitHub (https://github.com/login/repo)'
        }
        $repository = $RepositoryUrl.Trim().TrimEnd('/') -replace '\.git$', ''
        $repository = $repository -replace '^git@github\.com:', 'https://github.com/'
        $repository = $repository -replace '^ssh://git@github\.com/', 'https://github.com/'
        $match = [regex]::Match($repository, '^https://github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)$')
        if (-not $match.Success) { throw 'Podaj adres repozytorium na github.com, bez sciezki do pliku.' }

        $owner = $match.Groups[1].Value
        $name = $match.Groups[2].Value
        $installUrl = "https://$owner.github.io/$name/dist/installer.user.js"
    }

    if ($PrintUrl) {
        Write-Output $installUrl
        exit 0
    }

    Write-Host 'Margonem Toolkit - instalacja w Tampermonkey'
    Write-Host ''
    Write-Host '1. Otwieram maly loader z GitHub Pages w domyslnej przegladarce.'
    Write-Host '2. W Tampermonkey kliknij Zainstaluj (lub Aktualizuj).'
    Write-Host '3. Wylacz stary Legendary Notificator i odswiez Margonem.'
    Write-Host ''
    Write-Host "Adres: $installUrl"
    Write-Host 'Jesli widzisz sam kod: sprawdz, czy Tampermonkey jest zainstalowane i ma zgode na userscripty.'
    Start-Process -FilePath $installUrl
} catch {
    Write-Error $_
    exit 1
}
