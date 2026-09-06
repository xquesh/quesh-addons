const FRAME_PRESET_BASE = {
    uiEnabled: true,

    uiCoreMode: 'neon', uiCoreOpacity: 1,

    uiWidth: 1, uiSpeed: 2.8, uiDirection: 'cw',

    uiGlowPower: 1,

    uiNearBlur: 7, uiFarBlur: 26,

    uiPadding: 0, uiWaveSpan: 1.15,

    uiShellFrame: true,

    uiShellPadding: 0, uiShellLeft: 0, uiShellRight: 0, uiShellTop: 0, uiShellBottom: 0,

    uiTopFrame: true, uiGameFrame: false, uiChatFrame: true, uiChatInnerLines: true, uiRightFrame: true, uiEquipmentFrame: true,
    uiInventoryFrame: true, uiBottomFrame: true, uiBattleFrame: true,

    uiStructuralAuto: false
};

function colorPack(main, accent = '#ffffff') {
    return {
        outerColor: main, outerAccent: accent,

        lootColor: main, lootAccent: accent,

        cardColor: main, cardAccent: accent,

        itemColor: main, itemAccent: accent,

        confirmColor: main, confirmAccent: accent,

        canvasColor: main, canvasAccent: accent
    };
}

const CYAN_LAYER_BASE = {
    multiLayerEnabled: true,

    neonCoreColor: '#efffff', neonCoreOpacity: 1,

    /*
     * Presety celowo NIE ustawiają dalekiej warstwy wysoko.
     * Przy tej matematyce szerokość W3 = 4/5 potrafi wygenerować
     * setki pikseli bloom na każdej ramce jednocześnie.
     * Maksymalny rozbłysk nadal można ustawić ręcznie w panelu.
     */
    neonLayer1Color: '#78fff7', neonLayer1Strength: 3, neonLayer1Opacity: 4, neonLayer1Width: 2,

    neonLayer2Color: '#22ddd7', neonLayer2Strength: 2, neonLayer2Opacity: 2, neonLayer2Width: 1,

    neonLayer3Color: '#078f9d', neonLayer3Strength: 1, neonLayer3Opacity: 1, neonLayer3Width: 1,

    neonInside: false, neonOutside: true,

    ambientPower: 0.05, ambientSpread: 18, ambientMode: 'static'
};

const PRESETS = {

    referenceCyanTube: {
        ...FRAME_PRESET_BASE, ...CYAN_LAYER_BASE, ...colorPack('#42eee7', '#ffffff'),

        performanceMode: 'balanced',

        animationBaseLine: true, animationBaseOpacity: 0.22,

        outerEffect: 'static', outerWidth: 2, outerIntensity: 1.00, outerGlow: true, outerAmbient: false,

        lootEffect: 'static', lootWidth: 2, lootIntensity: 0.92, lootGlow: true, lootAmbient: false,

        cardEffect: 'static', cardWidth: 1, cardIntensity: 0.72, cardGlow: true, cardAmbient: false,

        itemEffect: 'static', itemWidth: 1, itemIntensity: 0.88, itemGlow: true, itemAmbient: false,

        confirmEffect: 'none',

        canvasEffect: 'static', canvasWidth: 2, canvasIntensity: 0.42, canvasGlow: true, canvasAmbient: false,

        uiColorSource: 'custom', uiColor: '#42eee7', uiEffect: 'static', uiCoreMode: 'neon', uiCoreOpacity: 1, uiWidth: 1,
        uiGlowPower: 0.42,

        worldEnabled: false
    },

    referenceCyanStrong: {
        ...FRAME_PRESET_BASE, ...CYAN_LAYER_BASE, ...colorPack('#42fff4', '#ffffff'),

        performanceMode: 'balanced',

        /* mocniej, ale bez turkusowej mgły na całym ekranie */
        neonLayer1Strength: 4, neonLayer1Opacity: 5, neonLayer1Width: 2,

        neonLayer2Strength: 3, neonLayer2Opacity: 3, neonLayer2Width: 2,

        neonLayer3Strength: 3, neonLayer3Opacity: 2, neonLayer3Width: 2,

        ambientPower: 0.07,

        outerEffect: 'static', lootEffect: 'static', cardEffect: 'static', itemEffect: 'static', confirmEffect: 'none',
        canvasEffect: 'static',

        outerIntensity: 1.12, lootIntensity: 1.02, cardIntensity: 0.82, itemIntensity: 0.95, canvasIntensity: 0.52,

        uiColorSource: 'custom', uiColor: '#42fff4', uiEffect: 'static', uiGlowPower: 0.52,

        worldEnabled: false
    },

    referenceCyanBreathe: {
        ...FRAME_PRESET_BASE, ...CYAN_LAYER_BASE, ...colorPack('#42eee7', '#ffffff'),

        animationBaseLine: true, animationBaseOpacity: 0.20,

        outerEffect: 'breathe', lootEffect: 'breathe', cardEffect: 'breathe', itemEffect: 'heartbeat', confirmEffect: 'none',
        canvasEffect: 'breathe',

        outerIntensity: 0.96, lootIntensity: 0.88, cardIntensity: 0.68, itemIntensity: 0.82, canvasIntensity: 0.38,

        uiColorSource: 'custom', uiColor: '#42eee7', uiEffect: 'breathe', uiGlowPower: 0.38,

        outerSpeed: 2.4, lootSpeed: 2.4, cardSpeed: 2.4, itemSpeed: 2.4, canvasSpeed: 2.4, uiSpeed: 2.4,

        worldEnabled: false
    },

    referenceCyanOrbit: {
        ...FRAME_PRESET_BASE, ...CYAN_LAYER_BASE, ...colorPack('#42eee7', '#ffffff'),

        /* ruch ma być czytelny, więc mniej statycznego bloom */
        neonLayer1Width: 1, neonLayer2Strength: 1, neonLayer2Opacity: 1, neonLayer2Width: 1, neonLayer3Strength: 1,
        neonLayer3Opacity: 1, neonLayer3Width: 1,

        animationBaseLine: true, animationBaseOpacity: 0.20,

        outerEffect: 'orbit', lootEffect: 'orbit', cardEffect: 'orbit', itemEffect: 'comet', confirmEffect: 'none',
        canvasEffect: 'orbit',

        outerIntensity: 0.92, lootIntensity: 0.82, cardIntensity: 0.66, itemIntensity: 0.80, canvasIntensity: 0.34,

        uiColorSource: 'custom', uiColor: '#42eee7', uiEffect: 'orbit', uiGlowPower: 0.34,

        outerSpeed: 3, lootSpeed: 2.7, cardSpeed: 2.3, itemSpeed: 1.8, canvasSpeed: 5, uiSpeed: 4,

        worldEnabled: false
    },

    referenceCyanScanner: {
        ...FRAME_PRESET_BASE, ...CYAN_LAYER_BASE, ...colorPack('#42eee7', '#ffffff'),

        /* scanner = ostra kreska, bez dalekiej trzeciej warstwy */
        neonLayer1Strength: 3, neonLayer1Opacity: 4, neonLayer1Width: 1, neonLayer2Strength: 1, neonLayer2Opacity: 1,
        neonLayer2Width: 1, neonLayer3Strength: 0, neonLayer3Opacity: 0, neonLayer3Width: 0,

        animationBaseLine: true, animationBaseOpacity: 0.16,

        outerEffect: 'scannerCross', lootEffect: 'scannerCross', cardEffect: 'scannerV', itemEffect: 'scannerCross',
        confirmEffect: 'none', canvasEffect: 'scannerCross',

        outerIntensity: 0.86, lootIntensity: 0.78, cardIntensity: 0.62, itemIntensity: 0.76, canvasIntensity: 0.30,

        uiColorSource: 'custom', uiColor: '#42eee7', uiEffect: 'scannerCross', uiGlowPower: 0.30,

        worldEnabled: false
    },

    referencePink: {
        ...FRAME_PRESET_BASE,

        multiLayerEnabled: true, neonCoreColor: '#fff4ff', neonCoreOpacity: 1,

        neonLayer1Color: '#ff75ee', neonLayer1Strength: 3, neonLayer1Opacity: 4, neonLayer1Width: 2,

        neonLayer2Color: '#ff21ce', neonLayer2Strength: 2, neonLayer2Opacity: 2, neonLayer2Width: 1,

        neonLayer3Color: '#9d137f', neonLayer3Strength: 1, neonLayer3Opacity: 1, neonLayer3Width: 1,

        neonInside: false, neonOutside: true, ambientPower: 0.05, ambientSpread: 18, ambientMode: 'static',

        ...colorPack('#ff20d2', '#ffffff'),

        outerEffect: 'static', lootEffect: 'static', cardEffect: 'static', itemEffect: 'static', confirmEffect: 'none',
        canvasEffect: 'static',

        outerIntensity: 1.00, lootIntensity: 0.90, cardIntensity: 0.72, itemIntensity: 0.86, canvasIntensity: 0.40,

        uiColorSource: 'custom', uiColor: '#ff20d2', uiEffect: 'static', uiGlowPower: 0.40,

        worldEnabled: false
    },

    cyberViolet: {
        ...FRAME_PRESET_BASE,

        multiLayerEnabled: true, neonCoreColor: '#ffffff', neonCoreOpacity: 1,

        neonLayer1Color: '#d68cff', neonLayer1Strength: 3, neonLayer1Opacity: 4, neonLayer1Width: 2,

        neonLayer2Color: '#9a4dff', neonLayer2Strength: 2, neonLayer2Opacity: 2, neonLayer2Width: 1,

        neonLayer3Color: '#542283', neonLayer3Strength: 1, neonLayer3Opacity: 1, neonLayer3Width: 1,

        neonInside: false, neonOutside: true, ambientPower: 0.05, ambientSpread: 18, ambientMode: 'static',

        ...colorPack('#a34fff', '#ff6de6'),

        outerEffect: 'dual', lootEffect: 'orbit', cardEffect: 'breathe', itemEffect: 'comet', confirmEffect: 'none',
        canvasEffect: 'dual',

        outerIntensity: 0.92, lootIntensity: 0.84, cardIntensity: 0.68, itemIntensity: 0.82, canvasIntensity: 0.34,

        uiColorSource: 'custom', uiColor: '#a34fff', uiEffect: 'cascade', uiGlowPower: 0.34,

        worldEnabled: false
    },

    goldenLegend: {
        ...FRAME_PRESET_BASE,

        multiLayerEnabled: true, neonCoreColor: '#fffde8', neonCoreOpacity: 1,

        neonLayer1Color: '#fff29a', neonLayer1Strength: 3, neonLayer1Opacity: 4, neonLayer1Width: 2,

        neonLayer2Color: '#ffd742', neonLayer2Strength: 2, neonLayer2Opacity: 2, neonLayer2Width: 1,

        neonLayer3Color: '#a66e09', neonLayer3Strength: 1, neonLayer3Opacity: 1, neonLayer3Width: 1,

        neonInside: false, neonOutside: true, ambientPower: 0.05, ambientSpread: 18, ambientMode: 'static',

        ...colorPack('#ffd742', '#ffffff'),

        outerEffect: 'static', lootEffect: 'static', cardEffect: 'static', itemEffect: 'static', confirmEffect: 'none',
        canvasEffect: 'static',

        outerIntensity: 1.00, lootIntensity: 0.90, cardIntensity: 0.72, itemIntensity: 0.86, canvasIntensity: 0.40,

        uiColorSource: 'custom', uiColor: '#ffd742', uiEffect: 'static', uiGlowPower: 0.40,

        worldEnabled: false
    },

    performance: {
        ...FRAME_PRESET_BASE, ...CYAN_LAYER_BASE, ...colorPack('#42eee7', '#ffffff'),

        performanceMode: 'eco',

        neonLayer1Strength: 2, neonLayer1Opacity: 3, neonLayer1Width: 1,

        neonLayer2Strength: 1, neonLayer2Opacity: 1, neonLayer2Width: 1,

        neonLayer3Strength: 0, neonLayer3Opacity: 0, neonLayer3Width: 0,

        ambientPower: 0,

        outerEffect: 'static', lootEffect: 'static', cardEffect: 'static', itemEffect: 'static', confirmEffect: 'none',
        canvasEffect: 'static',

        outerIntensity: 0.82, lootIntensity: 0.74, cardIntensity: 0.58, itemIntensity: 0.72, canvasIntensity: 0.26,

        outerAmbient: false, lootAmbient: false, cardAmbient: false, itemAmbient: false, canvasAmbient: false,

        worldEnabled: false,

        uiColorSource: 'custom', uiColor: '#42eee7', uiEffect: 'static', uiGlowPower: 0.26
    },

    minimal: {
        ...FRAME_PRESET_BASE,

        multiLayerEnabled: false,

        ...colorPack('#42d9d1', '#ffffff'),

        performanceMode: 'eco',

        outerEffect: 'static', outerGlow: false, outerIntensity: 0.70,

        lootEffect: 'none', cardEffect: 'none',

        itemEffect: 'static', itemGlow: false, itemIntensity: 0.72,

        confirmEffect: 'none', canvasEffect: 'none',

        uiEffect: 'static', uiCoreMode: 'original', uiGlowPower: 0.18,

        worldEnabled: false
    }
};

export { PRESETS };
