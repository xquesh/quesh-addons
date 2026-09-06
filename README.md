# QADDONS

Mały loader Tampermonkey pobiera runtime QADDONS z dwoma niezależnymi dodatkami:

- **Legendary Notificator** — neonowe powiadomienie po legendarnym łupie,
  przeniesione z istniejącego Legendary Notificator 6.2.1.
- **Pozycja powiadomień** — ustawienie odległości tekstowych komunikatów gry
  od dołu ekranu (0–300 px), bez przesuwania konsoli.

Przycisk z ikoną **quesh.png** otwiera listę **DODATKI** w panelu **QADDONS**. Checkbox rzeczywiście uruchamia lub
zatrzymuje addon; **USTAWIENIA** otwiera jego konfigurację. Przycisk **DODATKI**
wraca do listy. Przycisk z ikoną i panel można przeciągać. Pozycje zapisują się przy
zakończeniu przeciągania. Kółko myszy przewija panel i listę zakładek.
Konfigurację można otworzyć także dla wyłączonego dodatku; nie uruchamia to efektów.

Nagłówek pokazuje numer uruchomionego runtime QADDONS. Lampka pod nagłówkiem:

- zielona — nie ma nowszej opublikowanej wersji;
- czerwona — dostępna jest nowsza wersja; obok zobaczysz jej numer i wskazówkę,
  żeby odświeżyć grę przez Ctrl+F5;
- szara — trwa sprawdzanie;
- żółta — nie udało się sprawdzić wersji (np. brak sieci).

Sprawdzanie odbywa się po uruchomieniu, co 5 minut i po kliknięciu
**Sprawdź aktualizacje**. Zapytanie o `dist/version.json` omija cache, ma limit
10 sekund i nie przesyła cookies ani danych gry. Nie instaluje nic automatycznie.

## Instalacja i build

| Plik | Rola |
| --- | --- |
| `dist/installer.user.js` | Mały loader instalowany w Tampermonkey: nagłówek i wstawienie `<script src="…">`. Bez addonów, storage i UI. |
| `dist/margonem-toolkit.js` | Właściwy kod aplikacji pobierany z GitHub Pages: core, addon manager, UI i wszystkie addony. Zwykły bundle IIFE bez nagłówka userscripta. |
| `dist/version.json` | Numer opublikowanej wersji runtime, używany przez lampkę aktualizacji. |

[Zainstaluj loader w Tampermonkey](https://xquesh.github.io/quesh-addons/dist/installer.user.js)
i potwierdź **Zainstaluj** lub **Aktualizuj**, a następnie odśwież Margonem.
Runtime jest pobierany przez loader z
[`margonem-toolkit.js`](https://xquesh.github.io/quesh-addons/dist/margonem-toolkit.js).
Nie instaluj runtime jako osobnego userscripta.

Przy przejściu ze starego pełnego userscripta zainstaluj loader ręcznie z linku
powyżej. Loader nazywa się teraz **QADDONS** i ma `@version` 1.0.2.
Po instalacji wyłącz poprzedni wpis, jeśli Tampermonkey pozostawi oba skrypty.
Wyłącz też samodzielny Legendary Notificator. Ustawienia QADDONS
pozostają pod dotychczasowym kluczem localStorage.

Do lokalnego budowania potrzebny jest Node.js (zalecane 22 lub nowsze) i npm.

```sh
npm install
npm run build
npm run check
node --check dist/installer.user.js
node --check dist/margonem-toolkit.js
```

`npm run build` generuje oba pliki JavaScript i `version.json`. Stary pełny `dist/margonem-toolkit.user.js`
jest usuwany przez build, aby nie pozostawał alternatywny plik instalacyjny.

Obsługiwane domeny: `https://*.margonem.pl/*` i `https://*.margonem.com/*`,
z wykluczeniem `forum.margonem.pl` i `forum.margonem.com`. Loader ma `@grant none`;
runtime uruchamia się w kontekście strony i korzysta z jej `window` oraz `Engine`.

### Instalator Windows

Uruchom `install.cmd` z pobranego repozytorium. Instalator nie potrzebuje Node.js
ani npm: otwiera `installer.user.js` z GitHub Pages w domyślnej przeglądarce.
W Tampermonkey potwierdź **Zainstaluj** lub **Aktualizuj**, wyłącz stary
Legendary Notificator i odśwież grę. Nie instaluje rozszerzenia Tampermonkey
ani nie modyfikuje profilu przeglądarki.

Adres jest odczytywany z `@downloadURL`, a gdy go nie ma — wyliczany jako adres
GitHub Pages z remote `origin`. Możesz też przekazać adres repozytorium:

```powershell
.\install.cmd -RepositoryUrl https://github.com/xquesh/quesh-addons
```

Opcja `-PrintUrl` wypisuje adres bez otwierania przeglądarki. W Chrome/Edge
Tampermonkey może wymagać włączenia zgody na userscripty w ustawieniach
rozszerzenia: [instrukcja Tampermonkey](https://www.tampermonkey.net/faq.php#Q209).
Plik CMD uruchamia lokalny skrypt PowerShell z `ExecutionPolicy Bypass` tylko
dla tego procesu; nie zmienia systemowej polityki wykonywania skryptów.

```sh
npm run watch
```

Watch przebudowuje runtime po zmianach jego modułów i przy każdym buildzie zapisuje
także installer. Po zmianie samego `src/installer.js` lub nagłówka uruchom build
albo zrestartuj watch. Po zmianie `src/version.js` zrestartuj watch, aby manifest
i runtime użyły tej samej wersji. Lokalny build nie zmienia plików na GitHub Pages.

Jedyna zależność developerska to `esbuild`. Nie ma zależności npm w runtime,
`@require`, dynamicznych importów ani backendu. Build tworzy czytelny, nieminifikowany
runtime IIFE bez nagłówka oraz osobny installer z nagłówkiem. Każdy udany build,
także watch, uruchamia `node --check` dla obu plików.
Szczegóły: [esbuild API](https://esbuild.github.io/api/).

## Struktura

```text
src/
  main.js
  installer.js
  userscript-header.txt
  version.js
  assets/
    quesh.png
  core/
    addon-manager.js
    settings.js
    legacy-migration.js
    events.js
    game.js
    styles.js
    scheduler.js
    updates.js
    ui/
      panel.js
      controls.js
      tabs.js
      settings-styles.js
  addons/
    legendary-notificator/
      index.js
      runtime.js
      defaults.js
      constants.js
      performance.js
      migration.js
      helpers.js
      detection.js
      neon-engine.js
      animations.js
      overlays.js
      targets.js
      target-config.js
      hud.js
      renderer.js
      observers.js
      effect-styles.js
      presets.js
      settings-ui.js
      test-loot.js
      audio.js
    notification-position/
      index.js
      defaults.js
      settings-ui.js
dist/
  installer.user.js
  margonem-toolkit.js
  version.json
legacy/
  legendary-notificator-v6.2.1.txt
scripts/
  build.mjs
  check.mjs
  check-updates.mjs
  browser-check.mjs
  browser-sanity.html
  install.ps1
docs/
  legacy-analysis.md
package.json
package-lock.json
.gitignore
README.md
install.cmd
.github/workflows/pages.yml
```

## Mapa przeniesienia legacy

| Fragment referencji | Moduł |
| --- | --- |
| DEFAULT SETTINGS, PERFORMANCE, PRESETS | `defaults.js`, `performance.js`, `presets.js` |
| HELPERS, MULTILAYER NEON | `helpers.js`, `neon-engine.js` |
| SHAPES, BASE RECTANGLE, PARTIAL LINE, AMBIENT, SVG MOTION | `animations.js` |
| LOCAL OVERLAY LAYERING, CREATION, POSITION, STACKING, MANAGER | `overlays.js` |
| POSITIONER BACKGROUNDS, LOOT TARGETS | `targets.js` |
| TARGET CONFIG | `target-config.js` |
| UI TARGETS, SHELL, AUTO HUD, HP OCCLUSION, SYNC HUD | `hud.js` |
| WORLD, MAIN SYNC, SCHEDULER, ACTIVATE | `renderer.js` |
| EVENT-DRIVEN LAYOUT OBSERVERS | `observers.js`, scope w `core/scheduler.js` |
| DETECT LEGEND, GAME DATA | `detection.js` |
| TEST ITEM, TEST | `test-loot.js` |
| AUDIO | `audio.js` |
| CONFIG HTML, zakładki i formularz | `settings-ui.js`, helpery `core/ui/` |
| CSS efektów | `effect-styles.js` (identyczny CSS efektów) |
| HOOK, resize/scroll/visibility | `core/game.js` i event bus |
| TEXT NOTIFICATIONS | addon `notification-position` |
| STORAGE | `core/settings.js`, `core/legacy-migration.js`, `migration.js` |

Ścieżki bez prefiksu w tabeli odnoszą się do `src/addons/legendary-notificator/`.
Analiza zależności i historycznych kluczy jest w `docs/legacy-analysis.md`.

Fabryki modułów Legendary Notificatora otrzymują kontrolowany stan pojedynczej
instancji, context oraz wewnętrzny obiekt funkcji `runtime`. `runtime.js` łączy je
przed uruchomieniem obserwatorów. Umożliwia to zachowanie wzajemnych wywołań
renderera i obserwatorów bez globalnych zmiennych i cyklicznych importów ESM.
Nie ma generowania kodu ani `eval` w userscripcie.

## Storage i migracja

Jedyny główny klucz to `margonem_toolkit_settings`:

```json
{
  "version": 1,
  "core": { "panelX": 70, "panelY": 55, "lastView": "addons" },
  "addons": {
    "legendary-notificator": { "enabled": true, "settings": {} },
    "notification-position": { "enabled": true, "settings": { "bottom": 75 } }
  }
}
```

`core` przechowuje również pozycję przycisku i ostatnią zakładkę Legendary
Notificatora. Każde otwarcie głównego panelu pokazuje manager dodatków.

Wyłącznie gdy nowy klucz **nie istnieje**, importer szuka kolejno:
`legendary_notificator_v595_settings`, następnie v594, v593, v580, v572, v571
i v570 z tym samym sufiksem `_settings`. Niepoprawny JSON starego klucza nie
blokuje kolejnego fallbacku.



Nowy dokument jest zapisywany od razu; następne uruchomienie nie importuje legacy
ponownie. Stare klucze pozostają nienaruszone. Uszkodzony JSON nowego klucza lub
nieobsługiwana nowsza wersja schematu zatrzymuje start i zgłasza błąd w konsoli,
zamiast nadpisywać dane. Niedostępny zapis localStorage zgłasza błąd w konsoli.

Kolejne schematy dodawaj w `core/settings.js`: podnieś `SCHEMA_VERSION` i dopisz
funkcję do `SCHEMA_MIGRATIONS` pod numerem wersji wejściowej, np.:

```js
SCHEMA_MIGRATIONS.set(1, data => ({ ...data, version: 2 }));
```

Każdy krok dostaje kopię danych i musi zwiększyć wersję dokładnie o jeden.
Nie zmieniaj głównego klucza przy aktualizacji wersji userscripta.

## Dodawanie addonu

1. Utwórz katalog `src/addons/twoj-addon/` z fabryką definicji w `index.js`.
2. Zaimportuj fabrykę w `src/main.js` i wywołaj `manager.register(createTwojAddon())`.
3. Uruchom build/check. Panel i storage automatycznie obsłużą nowy addon.

Kontrakt:

```js
export function createTwojAddon() {
    return {
        id: 'twoj-addon',
        name: 'Twój addon',
        description: 'Opis widoczny w managerze.',
        defaultEnabled: false,
        defaults: { color: '#ffffff' },
        init(ctx) {},
        enable(ctx) {},
        disable(ctx) {},
        destroy(ctx) {},
        renderSettings(ctx) {},
        onSettingsChange(ctx) {}
    };
}
```

Callbacki są opcjonalne. `id` musi być unikalne i pasować do `[a-z][a-z0-9-]*`.
`init` jest wywoływane raz i służy przygotowaniu stanu; zasoby działania rejestruj
w `enable`. Każde włączenie otrzymuje świeży scope, wyłączenie uruchamia `disable`
i sprząta scope, a `destroy` zwalnia także zasoby inicjalizacji.

Context:

- `ctx.settings` — stabilny obiekt ustawień konkretnego addonu.
- `ctx.changeSettings(patch)` — zapis i powiadomienie aktywnego addonu.
- `ctx.enabled`, `ctx.setEnabled(value)` — aktualny stan lifecycle i przełączenie.
- `ctx.storage.save()`, `ctx.storage.core`, `ctx.storage.updateCore(patch)` — wspólny storage.
- `ctx.events.on(name, callback)`, `emit(name, payload)` — event bus; subskrypcje scope są sprzątane automatycznie.
- `ctx.styles.set(id, css)`, `remove(id)`, `clear()` — style z namespace addonu.
- `ctx.scheduler.timeout`, `clearTimeout`, `frame`, `cancelFrame`, `listen`,
  `observer(Constructor, callback)`, `cleanup(callback)`, `signal` — kontrolowane zasoby.
- `ctx.game.page` — okno gry; `ctx.game.hooked` — stan centralnego hooka.
- `ctx.ui.open()`, `openSettings(id)`, `showAddons()`, `close()` — nawigacja panelu.
- `ctx.container` — kontener przekazywany tylko do `renderSettings`.

`renderSettings` ma osobny, krótkotrwały scope, zamykany przy opuszczeniu widoku;
może zwrócić dodatkową funkcję cleanup. Nie uruchamiaj tam działania addonu.
Sprzątaj własne elementy DOM, animacje i audio w `disable` albo przez
`ctx.scheduler.cleanup`. Core anuluje zarządzane timery, RAF, obserwatory,
subskrypcje, listenery i CSS nawet po błędzie `disable`.

Centralny `core/game.js` jest jedynym miejscem podmiany `Engine.communication.parseJSON`.
Publikuje `gamePacket`, `lootOpened`, `lootClosed`, `gameReady`, `layoutChanged`,
`lootScrolled` i `visibilityChanged`. Legendary Notificator publikuje dodatkowo
`legendaryLoot` po swojej dotychczasowej detekcji. Ten event sygnalizuje pakiet;
cele efektów nadal są potwierdzane przez rzeczywisty DOM `.loot-wnd`.

Singleton `window.__MARGONEM_TOOLKIT__` w kontekście strony udostępnia `open()`, `addons`
i `destroy()`. Ponowne wykonanie bundle niszczy poprzednią instancję.
Hook przywraca oryginalny parser tylko jeśli nadal jest jego właścicielem;
nie nadpisuje późniejszego wrappera innego skryptu, a stary callback zostaje
wtedy nieaktywny. Kompatybilne API `LegendaryNotificator` istnieje podczas
włączenia tego addonu (m.in. `test`, `preset`, `status`, `settings`).

## Weryfikacja

`npm run check` sprawdza składnię wszystkich modułów i obu plików dist, mały loader,
jego adresy i obsługę błędu pobierania, brak nagłówka w runtime,
pojedynczy hook, migracje oraz cleanup obu rzeczywistych addonów w fixture Node.
Porównuje 98 przeniesionych funkcji po podstawieniu zależności, CSS efektów,
defaults i presety z referencją. Wykonuje również 16 632 porównania wyników
silnika neonowego z uruchomioną referencją v6.2.1.

Dodatkowy test w lokalnym Chrome headless, bez paczek przeglądarkowych npm:

```sh
node scripts/browser-check.mjs
```

Domyślna ścieżka Chrome jest windowsowa. Dla innej instalacji ustaw `CHROME_PATH`
na plik wykonywalny Chrome/Chromium. Test wymaga Node 22+ (wbudowany WebSocket),
używa osobnego profilu w katalogu tymczasowym i lokalnego portu DevTools.
Pozostawia profil tymczasowy do ewentualnej diagnostyki. Nie korzysta z Twojego
profilu przeglądarki i nie łączy się z Margonem.

Fixture przeglądarkowy uruchamia rzeczywisty installer. Test przechwytuje jego
żądanie do adresu GitHub Pages i podaje lokalny runtime, bez dostępu do sieci.
Potwierdza działanie w kontekście strony bez `unsafeWindow` oraz obejmuje manager,
zakładki, TESTUJ przez parser fixture,
oba oznaczenia legendy, loc l/k, mieszane rarity, wszystkie presety, lokalny
canvas, aurę, zamykanie lootu, enable/disable i ponowne wykonanie bundle.

To nie zastępuje testu w grze. W działającym Margonem trzeba potwierdzić
rzeczywiste pakiety zwykłego lootu/kolosa, aktualny DOM i stacking innych addonów,
wizualną zgodność przy danym skalowaniu UI, politykę autoplay/custom audio,
pauzowanie po ukryciu karty oraz interakcje drag/wheel z klientem gry.

## Wdrożenie i aktualizacje przez GitHub Pages

Repozytorium: [xquesh/quesh-addons](https://github.com/xquesh/quesh-addons).

1. W repozytorium otwórz **Settings → Pages → Build and deployment** i ustaw
   **Source: GitHub Actions**.
2. Wyślij zmiany na `master` lub uruchom ręcznie workflow **Deploy GitHub Pages**
   z zakładki **Actions**.
3. Workflow wykonuje `npm ci`, build i check, po czym publikuje oba pliki
   JavaScript i `version.json` w katalogu `dist/` artefaktu Pages. Poczekaj na pomyślne zakończenie
   zadania `deploy`.
4. Otwórz [installer](https://xquesh.github.io/quesh-addons/dist/installer.user.js)
   i sprawdź dostępność [runtime](https://xquesh.github.io/quesh-addons/dist/margonem-toolkit.js).

Konfiguracja workflow: [`.github/workflows/pages.yml`](.github/workflows/pages.yml).
Uprawnienia i mechanizm publikacji opisuje
[dokumentacja GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Przy wydaniu nowego runtime podnieś `VERSION` w `src/version.js` oraz wersję
pakietu w `package.json` i `package-lock.json`. Build bierze numer z `src/version.js`
do runtime i `dist/version.json`; check pilnuje zgodności z wersją pakietu.
Używaj numerów `MAJOR.MINOR.PATCH`, np. `1.1.0`.

Zmiany addonów wymagają wdrożenia nowego runtime, a następnie odświeżenia gry;
nie wymagają ponownej instalacji loadera. Przeglądarka/CDN mogą przez pewien czas
korzystać z cache. Loader nie dodaje parametrów omijających cache.
Zmiany loadera wymagają podniesienia `@version` w `src/userscript-header.txt`.
Jego `updateURL` i `downloadURL` wskazują `installer.user.js` na GitHub Pages.

`dist/` pozostaje w repozytorium; `.gitignore` wyklucza m.in. `node_modules/`
i `*.log`.
