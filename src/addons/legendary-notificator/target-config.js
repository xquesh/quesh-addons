
export function createTargetConfig(state, ctx, runtime) {
    /* ==========================================================
       TARGET CONFIG
    ========================================================== */

    function targetConfig(prefix) {
        return {
            effect: state.settings[ prefix + 'Effect' ] || 'none',

            color: state.settings[ prefix + 'Color' ] || '#42eee7',

            accent: state.settings[ prefix + 'Accent' ] || '#ffffff',

            width: runtime.clamp( state.settings[ prefix + 'Width' ], 1, 6 ),

            speed: runtime.clamp( state.settings[ prefix + 'Speed' ], 0.4, 9 ),

            intensity: runtime.clamp( state.settings[ prefix + 'Intensity' ], 0.1, 2 ),

            glow: Boolean( state.settings[ prefix + 'Glow' ] ),

            /*
             * Jedna logika 3 warstw, ale trzy geometrie cienia:
             * - outer: pełny daleki bloom,
             * - loot/canvas: kontrolowana ramka,
             * - card/item/confirm: ciasny obrys przedmiotu.
             *
             * Dzięki temu maksymalna W3 nadal może eksplodować na
             * oknie łupu, ale nie sumuje się w turkusową taflę na HUD.
             */
            glowProfile: prefix === 'outer' ? 'bloom' : ( [ 'card', 'item', 'confirm' ].includes(prefix) ? 'item' : 'frame' ),

            ambient: Boolean( state.settings[ prefix + 'Ambient' ] ),

            padding: Number( state.settings[ prefix + 'Padding' ] ) || 0,

            direction: state.settings[ prefix + 'Direction' ] || 'cw',

            coreMode: 'neon',

            coreOpacity: 1,

            /*
             * Canvas ma własny inward glow. Pozostałe elementy nadal
             * korzystają z globalnego przełącznika neonInside.
             */
            insetEnabled: prefix === 'canvas'
                ? Boolean(state.settings.canvasInnerGlow)
                : Boolean(state.settings.neonInside),

            insetPower: prefix === 'canvas'
                ? runtime.clamp(state.settings.canvasInnerIntensity, 0, 2)
                : 1,

            left: prefix === 'outer' ? ( Number( state.settings.outerLeft ) || 0 ) : 0,

            right: prefix === 'outer' ? ( Number( state.settings.outerRight ) || 0 ) : 0,

            top: prefix === 'outer' ? ( Number( state.settings.outerTop ) || 0 ) : 0,

            bottom: prefix === 'outer' ? ( Number( state.settings.outerBottom ) || 0 ) : 0
        };
    }

    function getUiColor() {
        switch ( state.settings.uiColorSource ) {
            case 'loot': return state.settings.lootColor;

            case 'item': return state.settings.itemColor;

            case 'custom': return state.settings.uiColor;

            default: return state.settings.outerColor;
        }
    }

    function uiConfig() {
        return {
            effect: state.settings.uiEffect,

            color: getUiColor(),

            accent: state.settings.outerAccent || '#ffffff',

            width: runtime.clamp( state.settings.uiWidth, 1, 4 ),

            speed: runtime.clamp( state.settings.uiSpeed, 0.5, 9 ),

            intensity: runtime.clamp( state.settings.uiGlowPower, 0.1, 2 ),

            glow: true,

            glowProfile: 'frame',

            ambient: false,

            padding: Number( state.settings.uiPadding ) || 0,

            direction: state.settings.uiDirection || 'cw',

            coreMode: state.settings.uiCoreMode,

            coreOpacity: runtime.clamp( state.settings.uiCoreOpacity, 0.1, 1 ),

            near: runtime.effectiveBlur( state.settings.uiNearBlur ),

            far: runtime.effectiveBlur( state.settings.uiFarBlur ),

            left: 0, right: 0, top: 0, bottom: 0
        };
    }

    return { targetConfig, getUiColor, uiConfig };
}
