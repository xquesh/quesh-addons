import { SELECTORS, LEGENDARY_DOM_SELECTOR } from './constants.js';

export function createTargets(state, ctx, runtime) {
    /* ==========================================================
       POSITIONER BACKGROUNDS
    ========================================================== */

    function findPositionerBackground(position) {
        const positioner = document.querySelector( `.game-window-positioner .interface-layer .positioner.${position}` );

        if (!positioner) {
            return null;
        }

        for (const child of positioner.children) {
            if ( child.classList && child.classList.contains('bg') ) {
                return child;
            }
        }

        const parentRect = positioner.getBoundingClientRect();

        if ( parentRect.width <= 0 || parentRect.height <= 0 ) {
            return null;
        }

        const candidates = positioner.querySelectorAll('.bg');

        let best = null; let bestScore = 0;

        for (const candidate of candidates) {
            if ( candidate.closest( 'button,.button,.widget-button,.usable-slot,.skill-usable-slot,.slot,.item' ) ) {
                continue;
            }

            const rect = candidate.getBoundingClientRect();

            if ( rect.width <= 0 || rect.height <= 0 ) {
                continue;
            }

            const widthRatio = rect.width / parentRect.width;

            const heightRatio = rect.height / parentRect.height;

            const areaRatio = ( rect.width * rect.height ) / ( parentRect.width * parentRect.height );

            if ( widthRatio < 0.70 || heightRatio < 0.55 ) {
                continue;
            }

            const score = widthRatio + heightRatio + areaRatio;

            if (score > bestScore) {
                bestScore = score; best = candidate;
            }
        }

        return best;
    }

    /* ==========================================================


       LOOT TARGETS
    ========================================================== */

    function resolveStandardTargets( force = false ) {
        const now = performance.now();

        const profile = runtime.getPerformanceProfile();

        if ( !force && state.cachedTargets && now < state.nextTargetRefresh ) {
            return state.cachedTargets;
        }

        state.nextTargetRefresh = now + profile.targetRefreshMs;

        const visibleLootRoots = Array.from( document.querySelectorAll( SELECTORS.lootRoot ) ) .filter(runtime.isVisible);

        // Przy kilku wariantach okna łupów (m.in. kolos) wybieramy przede
        // wszystkim to okno, które faktycznie zawiera legendarny przedmiot.
        const root = visibleLootRoots.find( element => element.querySelector( LEGENDARY_DOM_SELECTOR ) ) || null;

        if (!root) {
            state.cachedTargets = {
                root: null, loot: null, outer: [], card: [], item: [], confirm: [], canvas: []
            };

            return state.cachedTargets;
        }

        const loot = root.querySelector( '.loot-window' ) || root.querySelector( '.inner-content' ) || root.querySelector( '.content' ) ||
            root;

        const confirm = root.querySelector( '.accept-button > .button' );

        const cards = Array.from( root.querySelectorAll( '.loot-item-wrapper' ) ) .filter( element => element.querySelector( LEGENDARY_DOM_SELECTOR )
                );

        const items = Array.from( root.querySelectorAll( LEGENDARY_DOM_SELECTOR ) );

        /*
         * Canvas FX jest teraz osadzany w .game-layer, a nie jako
         * globalny fixed-overlay nad całym HUD-em.
         *
         * To odpowiada sposobowi, w jaki referencyjny dodatek
         * rysuje efekt mapy przez .game-layer:after.
         */
        const canvas = document.querySelector( '.game-window-positioner .game-layer' ) || document.querySelector( SELECTORS.canvas )?.parentElement ||
            null;

        state.cachedTargets = {
            root,

            loot,

            outer: root ? [root] : [],

            card: cards,

            item: items,

            confirm: confirm ? [confirm] : [],

            canvas: canvas ? [canvas] : []
        };

        return state.cachedTargets;
    }

    return { findPositionerBackground, resolveStandardTargets };
}
