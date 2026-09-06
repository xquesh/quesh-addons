import { SELECTORS, LEGENDARY_DOM_SELECTOR } from './constants.js';

export function createObservers(state, ctx, runtime) {
    /* ==========================================================
       EVENT-DRIVEN LAYOUT OBSERVERS
    ========================================================== */


    function nodeTouchesLoot(node) {
        if (!(node instanceof Element)) {
            return false;
        }

        return Boolean( node.matches?.( SELECTORS.lootRoot ) || node.matches?.( LEGENDARY_DOM_SELECTOR ) || node.querySelector?.( SELECTORS.lootRoot ) || node.querySelector?.( LEGENDARY_DOM_SELECTOR ) || node.closest?.( SELECTORS.lootRoot )
        );
    }

    function markLayoutDirty( forceTargets = false, affectUiLayout = false ) {
        if (!state.active) {
            return;
        }

        state.geometryDirty = true;

        if (affectUiLayout) {
            state.layoutDirty = true; state.uiDirty = true; state.nextUiRefresh = 0;
        }

        if (forceTargets) {
            state.cachedTargets = null; state.nextTargetRefresh = 0;
        }

        runtime.requestSync( forceTargets );
    }

    function syncActiveLootObserver(root) {
        if ( state.observedLootRoot === root ) {
            return;
        }

        state.activeLootObserver?.disconnect(); state.activeLootObserver = null; state.observedLootRoot = root || null;

        if (!root) {
            return;
        }

        state.activeLootObserver = ctx.scheduler.observer(MutationObserver, () => {
                    markLayoutDirty(false);
                }
            );

        state.activeLootObserver.observe( root, {
                attributes: true, attributeFilter: [ 'style', 'class' ], subtree: false
            }
        );
    }

    function clearObservedElements() {
        if (state.resizeObserver) {
            state.observedElements.forEach( element => {
                    try {
                        state.resizeObserver.unobserve( element );
                    } catch {}
                }
            );
        }

        state.observedElements.clear();
    }

    function syncObservedElements(targets) {
        if (!state.resizeObserver) {
            return;
        }

        const next = new Set();

        const add = element => {
                if ( element instanceof Element && element.isConnected ) {
                    next.add(element);
                }
            };

        add(targets.root); add(targets.loot);

        [ targets.outer, targets.card, targets.item, targets.confirm, targets.canvas ].forEach( list => list?.forEach(add) );

        state.uiTargets.forEach( target => add(target.element) );

        [ '.game-window-positioner .interface-layer .left-column.main-column', '.game-window-positioner .game-layer',
            '.game-window-positioner .interface-layer .right-column.main-column',
            '.game-window-positioner .interface-layer .positioner.bottom',
            '.game-window-positioner .interface-layer .bottom-panel-of-bottom-positioner .hp-indicator-wrapper'
        ].forEach( selector => add( document.querySelector( selector ) ) );

        state.observedElements.forEach( element => {
                if (!next.has(element)) {
                    try {
                        state.resizeObserver.unobserve( element );
                    } catch {}
                }
            }
        );

        next.forEach( element => {
                if (!state.observedElements.has(element)) {
                    try {
                        state.resizeObserver.observe( element );
                    } catch {}
                }
            }
        );

        state.observedElements.clear();

        next.forEach( element => state.observedElements.add(element) );
    }

    function startObservers() {
        if ( typeof ResizeObserver === 'function' ) {
            state.resizeObserver = ctx.scheduler.observer(ResizeObserver, entries => {
                        const affectsUiLayout = entries.some( entry => !entry.target.closest?.( SELECTORS.lootRoot ) );

                        markLayoutDirty( false, affectsUiLayout );
                    }
                );
        }

        if ( typeof MutationObserver === 'function' && document.body ) {
            state.domObserver = ctx.scheduler.observer(MutationObserver, mutations => {
                        if (!state.active) {
                            return;
                        }

                        let relevant = false;

                        for ( const mutation of mutations ) {
                            if ( mutation.type === 'attributes' ) {
                                const target = mutation.target;

                                if ( target instanceof Element && target.closest?.( SELECTORS.lootRoot ) ) {
                                    relevant = true; break;
                                }
                            }

                            for ( const node of [ ...mutation.addedNodes, ...mutation.removedNodes ] ) {
                                if ( nodeTouchesLoot(node) ) {
                                    relevant = true; break;
                                }
                            }

                            if (relevant) {
                                break;
                            }
                        }

                        if (relevant) {
                            markLayoutDirty(true);
                        }
                    }
                );

            state.domObserver.observe( document.body, {
                    childList: true, subtree: true, attributes: true, attributeFilter: [ 'data-item-type', 'data-frame-mania-rarity' ]
                }
            );
        }
    }

    function stopObservers() {
        state.resizeObserver?.disconnect(); state.domObserver?.disconnect(); state.activeLootObserver?.disconnect();

        state.resizeObserver = null; state.domObserver = null; state.activeLootObserver = null; state.observedLootRoot = null;

        state.observedElements.clear();
    }

    function setVisualPlaybackPaused(paused) {
        document.documentElement .classList.toggle( 'ln580-fx-paused', Boolean(paused) );

        for ( const entry of state.overlays.values() ) {
            const animations = entry.overlay ?._motionSvg ?._animations || [];

            animations.forEach( animation => {
                    try {
                        if (paused) {
                            animation.pause();
                        } else {
                            animation.play();
                        }
                    } catch {}
                }
            );
        }
    }
    function bindLayoutEvents() {
        ctx.events.on('layoutChanged', () => markLayoutDirty(true, true));
        ctx.events.on('lootScrolled', () => markLayoutDirty(false));
        ctx.events.on('visibilityChanged', () => {
            setVisualPlaybackPaused(state.settings.pauseWhenHidden && document.hidden);
            if (!document.hidden) markLayoutDirty(true, true);
        });
    }


    return { nodeTouchesLoot, markLayoutDirty, syncActiveLootObserver, clearObservedElements, syncObservedElements, startObservers, stopObservers, setVisualPlaybackPaused, bindLayoutEvents };
}
