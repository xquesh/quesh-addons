import { IDS } from './constants.js';

export function createHud(state, ctx, runtime) {
    /* ==========================================================
       UI TARGETS
    ========================================================== */

    const UI_TARGETS = [ {
            setting: 'uiTopFrame',

            selector: '.game-window-positioner .interface-layer .positioner.top',

            /*
             * W light-interface natywny .bg jest display:none.
             * Ramkę rysujemy więc po geometrii positionera, a nie po
             * niewidocznym tle.
             */
            shape: 'topBottom'
        },

        {
            setting: 'uiGameFrame',

            selector: '.game-window-positioner .game-layer',

            shape: 'rect'
        },

        {
            setting: 'uiChatFrame',

            selector: '.game-window-positioner .interface-layer .left-column.main-column',

            shape: 'rect'
        },

        {
            setting: 'uiChatInnerLines',

            selector: '.game-window-positioner .new-chat-window .chat-message-wrapper',

            shape: 'topBottom'
        },

        {
            setting: 'uiChatInnerLines',

            selector: '.game-window-positioner .chat-input-wrapper .magic-input-wrapper',

            shape: 'topBottom'
        },

        {
            setting: 'uiRightFrame',

            selector: '.game-window-positioner .interface-layer .right-column.main-column',

            shape: 'rect'
        },

        {
            setting: 'uiEquipmentFrame',

            selector: '.game-window-positioner .right-column.main-column .character_wrapper .equipment-wrapper',

            shape: 'rect',

            padding: -3
        },

        {
            setting: 'uiInventoryFrame',

            selector: '.game-window-positioner .inventory_wrapper .bags-navigation-bg',

            shape: 'rect'
        },

        {
            setting: 'uiInventoryFrame',

            selector: '.game-window-positioner .inventory_wrapper .inventory-grid',

            shape: 'rect'
        },

        {
            setting: 'uiBattleFrame',

            selector: '.game-window-positioner .bottom.positioner .battle-controller .graphics .battle-border',

            shape: 'rect'
        }
    ];


    /* ==========================================================
       SHELL
    ========================================================== */

    function getUiShellRect() {
        const candidates = [ document.querySelector( '.game-window-positioner .interface-layer .left-column.main-column' ),

            document.querySelector( '.game-window-positioner .game-layer' ),

            document.querySelector( '.game-window-positioner .interface-layer .right-column.main-column' )
        ].filter( element => element && element.isConnected );

        if ( candidates.length < 2 ) {
            return null;
        }

        const rects = candidates.map( element => element .getBoundingClientRect() );

        const left = Math.min( ...rects.map( rect => rect.left ) );

        const top = Math.min( ...rects.map( rect => rect.top ) );

        const right = Math.max( ...rects.map( rect => rect.right ) );

        const bottom = Math.max( ...rects.map( rect => rect.bottom ) );

        return {
            left, top, right, bottom,

            width: right - left,

            height: bottom - top
        };
    }

    /* ==========================================================
       AUTO HUD DETECTOR
    ========================================================== */

    function parseCssColor(value) {
        const text = String( value || '' );

        const match = text.match( /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i );

        if (!match) {
            return null;
        }

        return {
            r: Number( match[1] ),

            g: Number( match[2] ),

            b: Number( match[3] ),

            a: match[4] === undefined ? 1 : Number( match[4] )
        };
    }

    function brightNeutral(color) {
        if ( !color || color.a === 0 ) {
            return false;
        }

        const brightness = ( color.r + color.g + color.b ) / 3;

        const neutrality = Math.max( color.r, color.g, color.b ) - Math.min( color.r, color.g, color.b );

        return ( brightness >= state.settings.uiAutoThreshold && neutrality <= state.settings.uiAutoNeutrality );
    }

    function forbiddenStructuralElement( element ) {
        if ( !(element instanceof Element) ) {
            return true;
        }

        if ( !element.closest( '.game-window-positioner' ) ) {
            return true;
        }

        if ( element.closest( '.c-window,.window-on-peak' ) ) {
            return true;
        }

        if ( element.closest( `#${IDS.panel},#${IDS.button},.ln-fx` ) ) {
            return true;
        }

        if ( element.closest( [ 'button', '.button', '.widget-button', '.widget-hamburger', '.usable-slot', '.skill-usable-slot', '.slot',
                    '.eq-slot', '.item', '.bag-slot-wrapper', '.chat-channel-card', '.main-buttons-container', '[role="button"]'
                ].join(',')
            )
        ) {
            return true;
        }

        return false;
    }

    function structuralShape(style) {
        const sides = [];

        if (state.settings.uiAutoBorder) {
            [ [ 'top', style.borderTopWidth, style.borderTopColor ],

                [ 'right', style.borderRightWidth, style.borderRightColor ],

                [ 'bottom', style.borderBottomWidth, style.borderBottomColor ],

                [ 'left', style.borderLeftWidth, style.borderLeftColor ]
            ].forEach( ( [ side, width, color ] ) => {
                    if ( ( parseFloat( width ) || 0 ) >= 0.5 && brightNeutral( parseCssColor( color ) ) ) {
                        sides.push(side);
                    }
                }
            );
        }

        if ( state.settings.uiAutoOutline && ( parseFloat( style.outlineWidth ) || 0 ) >= 0.5 && brightNeutral( parseCssColor( style.outlineColor ) ) ) {
            return 'rect';
        }

        if (sides.length >= 3) {
            return 'rect';
        }

        if ( sides.includes('top') && sides.includes('bottom') ) {
            return 'topBottom';
        }

        if ( sides.includes('left') && sides.includes('right') ) {
            return 'leftRight';
        }

        if (sides.includes('top')) {
            return 'top';
        }

        if (sides.includes('bottom')) {
            return 'bottom';
        }

        if (sides.includes('left')) {
            return 'left';
        }

        if (sides.includes('right')) {
            return 'right';
        }

        return null;
    }

    /* ==========================================================
       COLLECT UI TARGETS
    ========================================================== */

    function collectUiTargets() {
        const result = [];

        const seen = new Set();

        function add( element, shape, padding = 0, auto = false ) {
            if ( !element || !element.isConnected || !element.getClientRects().length || forbiddenStructuralElement( element ) ) {
                return;
            }

            const id = runtime.getElementId(element);

            if (seen.has(id)) {
                return;
            }

            seen.add(id);

            result.push({
                id, element, shape, padding, auto
            });
        }

        UI_TARGETS.forEach( definition => {
                if ( !state.settings[ definition.setting ] ) {
                    return;
                }

                let elements = [];

                if ( typeof definition.resolve === 'function' ) {
                    try {
                        elements = definition.resolve() || [];
                    } catch {
                        elements = [];
                    }
                } else if ( definition.selector ) {
                    elements = document.querySelectorAll( definition.selector );
                }

                for ( const element of elements ) {
                    add( element, definition.shape, definition.padding || 0, false );
                }
            }
        );

        if ( state.settings.uiStructuralAuto ) {
            const root = document.querySelector( '.game-window-positioner .interface-layer' );

            if (root) {
                const profile = runtime.getPerformanceProfile();

                const max = Math.min( Number( state.settings.uiAutoMaxTargets ) || 20,

                        profile.maxAutoTargets
                    );

                const budget = profile.autoScanBudget;

                const walker = document.createTreeWalker( root, NodeFilter.SHOW_ELEMENT );

                let found = 0; let scanned = 0; let element = null;

                while ( scanned < budget && found < max && ( element = walker.nextNode() ) ) {
                    scanned++;

                    if ( forbiddenStructuralElement( element ) ) {
                        continue;
                    }

                    if ( Math.max( element.clientWidth, element.clientHeight ) < state.settings.uiAutoMinLength ) {
                        continue;
                    }

                    const style = getComputedStyle( element );

                    const shape = structuralShape( style );

                    if (!shape) {
                        continue;
                    }

                    const before = result.length;

                    add( element, shape, 0, true );

                    if ( result.length > before ) {
                        found++;
                    }
                }
            }
        }

        return result;
    }

    /* ==========================================================
       FOREGROUND / BOTTOM HUD OCCLUSION
    ========================================================== */

    function getHpForegroundRect(extra = 0) {
        const hp = document.querySelector( '.game-window-positioner .interface-layer ' + '.bottom-panel-of-bottom-positioner .hp-indicator-wrapper'
            );

        if ( !hp || !hp.isConnected ) {
            return null;
        }

        const rect = hp.getBoundingClientRect();

        if ( rect.width <= 0 || rect.height <= 0 ) {
            return null;
        }

        const pad = Math.max( 0, Number(extra) || 0 );

        return {
            left: rect.left - pad,

            top: rect.top - pad,

            right: rect.right + pad,

            bottom: rect.bottom + pad,

            width: rect.width + pad * 2,

            height: rect.height + pad * 2
        };
    }

    function addVirtualEdge( wanted, key, rect, config, shape ) {
        if ( !rect || rect.width <= 0 || rect.height <= 0 ) {
            return;
        }

        wanted.add(key);

        runtime.ensureVirtualOverlay( key, rect, config, shape );
    }

    function syncSegmentedShell( wanted, rect, config ) {
        if (!rect) {
            return;
        }

        const hp = getHpForegroundRect( Math.max( 18, Number(state.settings.uiFarBlur) * 0.55 ) );

        /*
         * Nie dublujemy tych samych pikseli światła.
         * Jeśli osobna górna belka jest aktywna, shell rysuje tylko
         * boki. Jeżeli jest wyłączona, shell przejmuje również górę.
         */
        addVirtualEdge( wanted, 'ui:shell:tlr', rect, config, state.settings.uiTopFrame ? 'leftRight' : 'topLeftRight' );

        /*
         * Osobna dolna belka rysuje już własną dolną krawędź.
         * Shell nie nakłada wtedy drugiego identycznego glow.
         */
        if (state.settings.uiBottomFrame) {
            return;
        }

        const bottomBand = {
            left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom
        };

        if ( !hp || hp.right <= rect.left || hp.left >= rect.right || hp.top >= rect.bottom || hp.bottom <= rect.top ) {
            addVirtualEdge( wanted, 'ui:shell:bottom', bottomBand, config, 'bottom' );

            return;
        }

        const gapLeft = runtime.clamp( hp.left, rect.left, rect.right );

        const gapRight = runtime.clamp( hp.right, rect.left, rect.right );

        if ( gapLeft - rect.left > 2 ) {
            addVirtualEdge( wanted, 'ui:shell:bottom-left', {
                    left: rect.left, top: rect.top, width: gapLeft - rect.left, height: rect.height, right: gapLeft, bottom: rect.bottom
                }, config, 'bottom'
            );
        }

        if ( rect.right - gapRight > 2 ) {
            addVirtualEdge( wanted, 'ui:shell:bottom-right', {
                    left: gapRight, top: rect.top, width: rect.right - gapRight, height: rect.height, right: rect.right,
                    bottom: rect.bottom
                }, config, 'bottom'
            );
        }
    }

    function syncSegmentedBottomFrame( wanted, config ) {
        if (!state.settings.uiBottomFrame) {
            return;
        }

        const positioner = document.querySelector( '.game-window-positioner .interface-layer .positioner.bottom' );

        if ( !positioner || !positioner.isConnected ) {
            return;
        }

        const rect = positioner.getBoundingClientRect();

        if ( rect.width <= 0 || rect.height <= 0 ) {
            return;
        }

        const hp = getHpForegroundRect( Math.max( 18, Number(state.settings.uiFarBlur) * 0.55 ) );

        /*
         * Dolna krawędź positionera może być pełna.
         * Górna krawędź przecina w Margonem środkową kulę HP,
         * dlatego dzielimy ją na lewy i prawy segment.
         */
        addVirtualEdge( wanted, 'ui:bottom:edge-bottom', {
                left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom
            }, config, 'bottom'
        );

        if ( !hp || hp.right <= rect.left || hp.left >= rect.right || hp.top >= rect.bottom || hp.bottom <= rect.top ) {
            addVirtualEdge( wanted, 'ui:bottom:edge-top', {
                    left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom
                }, config, 'top'
            );

            return;
        }

        const gapLeft = runtime.clamp( hp.left, rect.left, rect.right );

        const gapRight = runtime.clamp( hp.right, rect.left, rect.right );

        if ( gapLeft - rect.left > 2 ) {
            addVirtualEdge( wanted, 'ui:bottom:edge-top-left', {
                    left: rect.left, top: rect.top, width: gapLeft - rect.left, height: rect.height, right: gapLeft, bottom: rect.bottom
                }, config, 'top'
            );
        }

        if ( rect.right - gapRight > 2 ) {
            addVirtualEdge( wanted, 'ui:bottom:edge-top-right', {
                    left: gapRight, top: rect.top, width: rect.right - gapRight, height: rect.height, right: rect.right,
                    bottom: rect.bottom
                }, config, 'top'
            );
        }
    }

    /* ==========================================================
       UI DELAY
    ========================================================== */

    function uiDelay( target, lootRect ) {
        const span = runtime.clamp( state.settings.uiWaveSpan, 0.1, 3 );

        if ( state.settings.uiEffect === 'cascade' ) {
            return ( ( target.id % 11 ) / 10 * span );
        }

        if ( state.settings.uiEffect === 'lootWave' && lootRect ) {
            const rect = target.element .getBoundingClientRect();

            const x = rect.left + rect.width / 2;

            const y = rect.top + rect.height / 2;

            const lx = lootRect.left + lootRect.width / 2;

            const ly = lootRect.top + lootRect.height / 2;

            return ( Math.hypot( x - lx, y - ly ) / Math.hypot( innerWidth, innerHeight ) * span );
        }

        return 0;
    }

    /* ==========================================================
       SYNC HUD
    ========================================================== */

    function syncUi( wanted, lootRoot, force = false ) {
        if ( !state.settings.uiEnabled || state.settings.uiEffect === 'none' ) {
            return;
        }

        const now = performance.now();

        const profile = runtime.getPerformanceProfile();

        if ( !force && !state.uiDirty && !state.layoutDirty && now < state.nextUiRefresh ) {
            state.uiTargets.forEach( target => {
                    wanted.add( 'ui:' + target.id );
                }
            );

            if ( state.settings.uiShellFrame ) {
                [ 'ui:shell:tlr', 'ui:shell:bottom', 'ui:shell:bottom-left', 'ui:shell:bottom-right' ].forEach( key => {
                        if (state.overlays.has(key)) {
                            wanted.add(key);
                        }
                    }
                );
            }

            if ( state.settings.uiBottomFrame ) {
                [ 'ui:bottom:edge-bottom', 'ui:bottom:edge-top', 'ui:bottom:edge-top-left', 'ui:bottom:edge-top-right' ].forEach( key => {
                        if (state.overlays.has(key)) {
                            wanted.add(key);
                        }
                    }
                );
            }

            return;
        }

        state.nextUiRefresh = now + profile.uiRefreshMs;

        state.uiDirty = false;

        state.uiTargets = collectUiTargets();

        const config = runtime.uiConfig();

        if ( state.settings.uiShellFrame ) {
            const baseRect = getUiShellRect();

            if (baseRect) {
                const shellPadding = Number( state.settings.uiShellPadding ) || 0;

                const shellLeft = shellPadding + ( Number( state.settings.uiShellLeft ) || 0 );

                const shellRight = shellPadding + ( Number( state.settings.uiShellRight ) || 0 );

                const shellTop = shellPadding + ( Number( state.settings.uiShellTop ) || 0 );

                const shellBottom = shellPadding + ( Number( state.settings.uiShellBottom ) || 0 );

                const rect = {
                    left: baseRect.left - shellLeft,

                    top: baseRect.top - shellTop,

                    right: baseRect.right + shellRight,

                    bottom: baseRect.bottom + shellBottom,

                    width: baseRect.width + shellLeft + shellRight,

                    height: baseRect.height + shellTop + shellBottom
                };

                syncSegmentedShell( wanted, rect, {
                        ...config, padding: 0, left: 0, right: 0, top: 0, bottom: 0
                    }
                );
            }
        }

        syncSegmentedBottomFrame( wanted, {
                ...config, padding: Number( state.settings.uiPadding ) || 0
            }
        );

        const lootRect = lootRoot ? lootRoot .getBoundingClientRect() : null;

        state.uiTargets.forEach( target => {
                const key = 'ui:' + target.id;

                wanted.add(key);

                runtime.ensureOverlay( key, target.element, {
                        ...config,

                        padding: config.padding + ( Number( target.padding ) || 0 )
                    }, target.shape, uiDelay( target, lootRect ), true
                );
            }
        );
    }

    return { getUiShellRect, parseCssColor, brightNeutral, forbiddenStructuralElement, structuralShape, collectUiTargets, getHpForegroundRect, addVirtualEdge, syncSegmentedShell, syncSegmentedBottomFrame, uiDelay, syncUi };
}
