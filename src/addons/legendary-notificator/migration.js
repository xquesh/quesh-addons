export function migrateLayerSettings( raw, fromLegacy = false ) {
    const migrated = {
        ...(raw || {})
    };

    /*
     * Migracja ustawień z poprzedniej wersji bez resetowania
     * pozostałej konfiguracji użytkownika.
     */
    const legacyMap = [ ['neonLayer1Strength', 'shacalGlow1'], ['neonLayer1Opacity', 'shacalOpacity1'],
        ['neonLayer1Width', 'shacalWidth1'],

        ['neonLayer2Strength', 'shacalGlow2'], ['neonLayer2Opacity', 'shacalOpacity2'], ['neonLayer2Width', 'shacalWidth2'],

        ['neonLayer3Strength', 'shacalGlow3'], ['neonLayer3Opacity', 'shacalOpacity3'], ['neonLayer3Width', 'shacalWidth3']
    ];

    for (const [nextKey, oldKey] of legacyMap) {
        if ( migrated[nextKey] === undefined && migrated[oldKey] !== undefined ) {
            migrated[nextKey] = migrated[oldKey];
        }

        delete migrated[oldKey];
    }

    /*
     * Stare ręczne blur/spread/bloom nie należą już do silnika
     * warstw. Usuwamy je przy migracji, żeby zapis ustawień był
     * czytelny i nie zawierał martwych parametrów.
     */
    [ 'neonEngineMode', 'neonLayer1Power', 'neonLayer2Power', 'neonLayer3Power', 'neonCoreBlur', 'neonNearBlur', 'neonNearSpread',
        'neonMediumBlur', 'neonMediumSpread', 'neonFarBlur', 'neonFarSpread', 'neonBloomPower', 'neonBloomBlur', 'neonBloomSpread'
    ].forEach( key => delete migrated[key] );

    if (fromLegacy) {
        /*
         * Po zmianie architektury nie dublujemy już obrysu mapy:
         * canvas ma własną ramkę, a uiGameFrame pozostaje opcją
         * ręczną. Domyślnie wyłączamy więc drugi obrys tej samej
         * geometrii i cofamy canvas o 8 px do środka.
         */
        migrated.neonInside = false; migrated.neonOutside = true; migrated.uiGameFrame = false;

        if ( migrated.canvasPadding === undefined || Number(migrated.canvasPadding) === 0 ) {
            migrated.canvasPadding = -8;
        }
    }

    return migrated;
}
