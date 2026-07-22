[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$VanityName,
    [ValidatePattern('^[A-Z]{2}$')][string]$Country = 'CN',
    [string]$CandidateTitle,
    [ValidateRange(1, 200)][int]$DealLimit = 50
)

$ErrorActionPreference = 'Stop'
$Country = $Country.ToUpperInvariant()

function Read-PlainTextSecret([string]$Prompt) {
    $secure = Read-Host $Prompt -AsSecureString
    [System.Net.NetworkCredential]::new('', $secure).Password
}

function Get-DynamicProperty($Object, [string]$Name) {
    $Object.PSObject.Properties[$Name].Value
}

$steamKey = Read-PlainTextSecret 'Steam Web API key'
$itadKey = Read-PlainTextSecret 'IsThereAnyDeal API key'
$itadHeaders = @{ 'ITAD-API-Key' = $itadKey }

try {
    $profile = Invoke-RestMethod -Method Get -Uri 'https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/' -Body @{
        key = $steamKey
        vanityurl = $VanityName
    }
    if ($profile.response.success -ne 1) { throw "Cannot resolve $VanityName" }
    $steamId = [string]$profile.response.steamid

    $library = Invoke-RestMethod -Method Get -Uri 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/' -Body @{
        key = $steamKey
        steamid = $steamId
        include_appinfo = 'true'
        include_played_free_games = 'true'
    }
    $owned = @{}
    foreach ($game in @($library.response.games)) { $owned[[int]$game.appid] = $true }

    $shops = Invoke-RestMethod -Method Get -Uri "https://api.isthereanydeal.com/service/shops/v1?country=$Country"
    $steamShop = $shops | Where-Object title -eq 'Steam' | Select-Object -First 1
    if (-not $steamShop) { throw "Steam shop unavailable for $Country" }
    $shopId = [int]$steamShop.id

    $dealsResponse = Invoke-RestMethod -Method Get -Uri "https://api.isthereanydeal.com/deals/v2?country=$Country&shops=$shopId&limit=$DealLimit" -Headers $itadHeaders
    $deals = if ($dealsResponse.list) { @($dealsResponse.list) } elseif ($dealsResponse.deals) { @($dealsResponse.deals) } else { @($dealsResponse) }
    $candidate = if ($CandidateTitle) {
        $deals | Where-Object title -eq $CandidateTitle | Select-Object -First 1
    } else {
        $deals | Where-Object type -eq 'game' | Select-Object -First 1
    }
    if (-not $candidate) { throw 'No matching game deal found.' }

    $mapping = Invoke-RestMethod -Method Post -Uri "https://api.isthereanydeal.com/lookup/shop/$shopId/id/v1" -Headers $itadHeaders -ContentType 'application/json' -Body (ConvertTo-Json @([string]$candidate.id))
    $products = @(Get-DynamicProperty $mapping ([string]$candidate.id))
    $appProduct = $products | Where-Object { $_ -match '^app/\d+$' } | Select-Object -First 1
    $subProduct = $products | Where-Object { $_ -match '^sub/\d+$' } | Select-Object -First 1

    if ($appProduct) {
        $appId = [int]($appProduct -replace '^app/', '')
    } elseif ($subProduct) {
        $packageId = [int]($subProduct -replace '^sub/', '')
        $packageResponse = Invoke-RestMethod -Method Get -Uri "https://store.steampowered.com/api/packagedetails?packageids=$packageId&cc=$($Country.ToLowerInvariant())&l=english"
        $package = Get-DynamicProperty $packageResponse ([string]$packageId)
        $apps = @($package.data.apps)
        if ($apps.Count -ne 1) { throw "Package $packageId has $($apps.Count) apps; refusing to guess." }
        $appId = [int]$apps[0].id
    } else {
        throw "Unsupported mapping: $($products -join ', ')"
    }

    $appResponse = Invoke-RestMethod -Method Get -Uri "https://store.steampowered.com/api/appdetails?appids=$appId&cc=$($Country.ToLowerInvariant())&l=english"
    $app = Get-DynamicProperty $appResponse ([string]$appId)
    if (-not $app.success -or $app.data.type -ne 'game') { throw "App $appId is not a validated base game." }

    $release = [DateTimeOffset]::Parse($app.data.release_date.date, [Globalization.CultureInfo]::GetCultureInfo('en-US'))
    $twoYearsAgo = [DateTimeOffset]::UtcNow.AddDays(-730)
    $windowStart = if ($release -gt $twoYearsAgo) { $release } else { $twoYearsAgo }
    $since = $windowStart.ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ', [Globalization.CultureInfo]::InvariantCulture)
    $historyUri = "https://api.isthereanydeal.com/games/history/v2?id=$([uri]::EscapeDataString([string]$candidate.id))&country=$Country&shops=$shopId&since=$([uri]::EscapeDataString($since))"

    $history = @(Invoke-RestMethod -Method Get -Uri $historyUri -Headers $itadHeaders | Where-Object {
        $_.shop.id -eq $shopId -and
        $_.deal.price.currency -eq $candidate.deal.price.currency -and
        $null -ne $_.deal.price.amountInt
    })
    $minimum = $history | Sort-Object { $_.deal.price.amountInt } | Select-Object -First 1
    $earliest = $history | Sort-Object { [DateTimeOffset]::Parse($_.timestamp) } | Select-Object -First 1
    $coverage = $history.Count -gt 0 -and [DateTimeOffset]::Parse($earliest.timestamp) -le $windowStart.AddDays(7)
    $currentMinor = $candidate.deal.price.amountInt
    $minimumMinor = if ($minimum) { $minimum.deal.price.amountInt } else { $null }

    $lowStatus = if (-not $coverage) {
        'INCOMPLETE_HISTORY'
    } elseif ($currentMinor -le $minimumMinor) {
        if ($release -gt $twoYearsAgo) { 'RELEASE_LOW' } else { 'TWO_YEAR_LOW' }
    } elseif ($currentMinor -le [Math]::Ceiling($minimumMinor * 1.05)) {
        'NEAR_LOW'
    } else {
        'NOT_LOW'
    }

    $expiry = if ($candidate.deal.expiry) { [DateTimeOffset]::Parse($candidate.deal.expiry) } else { $null }
    $expiryStatus = if (-not $expiry) { 'UNKNOWN' } elseif ($expiry -gt [DateTimeOffset]::UtcNow) { 'ACTIVE' } else { 'EXPIRED' }

    [PSCustomObject]@{
        SteamId = $steamId
        LibraryGameCount = $owned.Count
        Game = $app.data.name
        SteamAppId = $appId
        Owned = $owned.ContainsKey($appId)
        Region = $Country
        Currency = $candidate.deal.price.currency
        ReleaseDate = $release
        HistoryStart = $windowStart
        Observations = $history.Count
        CoverageComplete = $coverage
        CurrentPrice = $candidate.deal.price.amount
        ReferenceLow = if ($minimum) { $minimum.deal.price.amount } else { $null }
        DiscountPercent = $candidate.deal.cut
        LowStatus = $lowStatus
        Expiry = $expiry
        ExpiryStatus = $expiryStatus
        ITADGameId = $candidate.id
        SteamProducts = $products -join ', '
    } | Format-List
}
finally {
    $steamKey = $null
    $itadKey = $null
    $itadHeaders = $null
}
