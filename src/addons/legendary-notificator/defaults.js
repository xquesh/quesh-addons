export const DEFAULTS = {
    mute: false, customAudio: '', fallbackDuration: 15,

    performanceMode: 'balanced', pauseWhenHidden: true,

    animationBaseLine: true, animationBaseOpacity: 0.26,

    /*
     * WIELOWARSTWOWY NEON
     *
     * Każda z 3 warstw ma:
     * - kolor,
     * - siłę,
     * - krycie,
     * - szerokość.
     *
     * Siła / krycie / szerokość pracują w skali 0-5.
     * Warstwa 3 odpowiada za najdalszy i najmocniej rozlany bloom.
     */
    multiLayerEnabled: true,

    neonCoreColor: '#efffff', neonCoreOpacity: 1,

    neonLayer1Color: '#7ffff8', neonLayer1Strength: 3, neonLayer1Opacity: 4, neonLayer1Width: 2,

    neonLayer2Color: '#25e1da', neonLayer2Strength: 2, neonLayer2Opacity: 2, neonLayer2Width: 1,

    neonLayer3Color: '#079ba5', neonLayer3Strength: 1, neonLayer3Opacity: 1, neonLayer3Width: 1,

    /*
     * Zachowane jako osobne przełączniki LN.
     * Zewnętrzne cienie używają dokładnej logiki 3 warstw.
     * Wewnętrzne, jeśli włączone, są ich lustrzanym odpowiednikiem.
     */
    neonInside: false, neonOutside: true,

    /*
     * Legacy / generic glow
     */
    glowNear: 6, glowFar: 18,

    ambientPower: 0.06, ambientSpread: 18, ambientMode: 'static',

    /* OUTER LOOT */

    outerEffect: 'static', outerColor: '#46f7ed', outerAccent: '#ffffff', outerWidth: 2, outerSpeed: 2.5, outerIntensity: 1,
    outerGlow: true, outerAmbient: false, outerPadding: 0, outerDirection: 'cw', outerLeft: 0, outerRight: 0, outerTop: 0,
    outerBottom: 0,

    /* INNER LOOT */

    lootEffect: 'static', lootColor: '#46f7ed', lootAccent: '#ffffff', lootWidth: 2, lootSpeed: 2.2, lootIntensity: 1, lootGlow: true,
    lootAmbient: false, lootPadding: 0, lootDirection: 'cw',

    /* ITEM CARD */

    cardEffect: 'static', cardColor: '#46f7ed', cardAccent: '#ffffff', cardWidth: 1, cardSpeed: 1.8, cardIntensity: 0.95,
    cardGlow: true, cardAmbient: false, cardPadding: 1, cardDirection: 'cw',

    /* ITEM */

    itemEffect: 'static', itemColor: '#46f7ed', itemAccent: '#ffffff', itemWidth: 1, itemSpeed: 1.3, itemIntensity: 1, itemGlow: true,
    itemAmbient: false, itemPadding: 2, itemDirection: 'cw',

    /* CONFIRM */

    confirmEffect: 'none', confirmColor: '#46f7ed', confirmAccent: '#ffffff', confirmWidth: 1, confirmSpeed: 1.5,
    confirmIntensity: 0.8, confirmGlow: false, confirmAmbient: false, confirmPadding: 0, confirmDirection: 'cw',

    /* GAME CANVAS */

    canvasEffect: 'static', canvasColor: '#46f7ed', canvasAccent: '#ffffff', canvasWidth: 2, canvasSpeed: 4, canvasIntensity: 1,
    canvasGlow: true, canvasAmbient: false, canvasPadding: -8, canvasDirection: 'cw',

    /*
     * Osobny inward glow pola gry.
     * Nie zależy od globalnego "Świeć do środka", bo dla canvasu
     * chcemy móc mieć światło do wnętrza bez zalewania lootu/HUD.
     */
    canvasInnerGlow: true, canvasInnerIntensity: 0.85,

    /* WORLD */

    worldEnabled: false, worldColor: '#23e4dc', worldPower: 0.04,

    /* HUD */

    uiEnabled: true, uiColorSource: 'custom', uiColor: '#46f7ed',

    uiEffect: 'static',

    uiCoreMode: 'neon', uiCoreOpacity: 1,

    uiWidth: 1, uiSpeed: 2.8, uiDirection: 'cw',

    uiGlowPower: 0.45,

    uiNearBlur: 7, uiFarBlur: 26,

    uiPadding: 0, uiWaveSpan: 1.15,

    /* SHELL */

    uiShellFrame: true, uiShellPadding: 0, uiShellLeft: 0, uiShellRight: 0, uiShellTop: 0, uiShellBottom: 0,

    /* HUD TARGETS */

    uiTopFrame: true, uiGameFrame: false, uiChatFrame: true, uiChatInnerLines: true, uiRightFrame: true, uiEquipmentFrame: true,
    uiInventoryFrame: true, uiBottomFrame: true, uiBattleFrame: true,

    /* AUTO */

    uiStructuralAuto: false,

    uiAutoBorder: true, uiAutoOutline: true, uiAutoShadow: true,

    uiAutoThreshold: 75, uiAutoNeutrality: 85, uiAutoMinLength: 120, uiAutoMaxTargets: 25
};
