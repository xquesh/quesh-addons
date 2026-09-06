# Analiza Legendary Notificator 6.2.1

Plik referencyjny ma około 5030 linii. Migracja bazuje na jego funkcjach,
stałych, presetach i CSS; renderer nie jest implementowany ponownie.

| Obszar legacy | Odpowiedzialność / zależności |
| --- | --- |
| DEFAULT SETTINGS, PERFORMANCE, PRESETS | Parametry warstw 0–5, trzy profile kosztu renderowania, dziesięć presetów |
| MULTILAYER NEON | Tablice siły/krycia, profile bloom/frame/item, inset i filtry ruchu; zależy od settings i helperów kolorów |
| SHAPES, BASE RECTANGLE, SVG MOTION | Geometria kresek, animacje CSS i Web Animations; zależy od silnika neonu |
| OVERLAY, POSITION, STACKING | Cache stylu i geometrii, lokalny canvas, przywracanie inline-style właściciela |
| LOOT TARGETS, HUD | Wyłącznie widoczny .loot-wnd z legendą; filtrowanie kart mieszanych rarity, segmentacja HUD wokół HP |
| MAIN SYNC, SCHEDULER, OBSERVERS | RAF batching, MutationObserver/ResizeObserver, wolny maintenance 350–1100 ms tylko podczas efektu |
| GAME DATA, HOOK | parseJSON po oryginalnym parserze; loc l/loot/k/c/colossus; DOM rozstrzyga cele renderowania |
| TEST | Przedmiot z gry, pakiet loot.init podawany do prawdziwego parseJSON |
| AUDIO | URL lub trzy oscylatory; wymaga uzupełnienia cleanup dla AudioContext i opóźnionych callbacków |
| CONFIG HTML, PANEL | Helpery sekcji, zakładki, wheel, drag; zapis pozycji dopiero po mouseup |
| TEXT NOTIFICATIONS | Osobny CSS dla big-messages; zostaje osobnym addonem |

Aktualny klucz legacy: `legendary_notificator_v595_settings`.
Kolejność fallback: v594, v593, v580, v572, v571, v570 (ten sam wzór klucza).
Pozycje: `legendary_notificator_v580_button_pos`, `legendary_notificator_v580_panel_pos`.
Zakładka: `legendary_notificator_panel_tab`.
Zachowana migracja shacalGlow/Opacity/Width do neonLayer oraz usuwanie martwych
parametrów starszego silnika. Starsze fallbacki mają dodatkową normalizację
canvas/neonInside/uiGameFrame dokładnie jak loadSettings w referencji.

Granice lifecycle: core posiada hook gry, storage, style manager i panel.
Każde włączenie addonu dostaje własny scope zasobów (timery, RAF, listenery,
obserwatory, subskrypcje). Wyłączenie anuluje także oczekującą aktywację 20 ms,
podgląd ustawień i dźwięk. Konfiguracja wyłączonego addonu jest osobnym,
tymczasowym widokiem UI i nie uruchamia detekcji ani efektów.
