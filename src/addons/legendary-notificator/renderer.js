import { IDS } from './constants.js';

export function createRenderer(state, ctx, runtime) {
    /* ==========================================================
       WORLD
    ========================================================== */

    function syncWorld() {
        let world = document.getElementById( IDS.world );

        if (!state.settings.worldEnabled) {
            world?.remove(); state.worldSignature = ''; return;
        }

        if (!world) {
            world = document.createElement( 'div' );

            world.id = IDS.world;

            document.body.appendChild( world );
        }

        const factor = state.settings.performanceMode === 'eco' ? 0.55 : 1;

        const alpha = runtime.clamp( state.settings.worldPower * factor, 0, 0.4 );

        const signature = `${state.settings.worldColor}|${alpha}`;

        if ( signature === state.worldSignature ) {
            return;
        }

        state.worldSignature = signature;

        world.style.boxShadow = `inset 0 0 80px ${runtime.rgba( state.settings.worldColor, alpha )}`;
    }

    /* ==========================================================
       MAIN SYNC
    ========================================================== */

    function syncEffects( force = false ) {
        if (!state.active) {
            return;
        }

        if ( state.settings.pauseWhenHidden && document.hidden ) {
            return;
        }

        const targets = runtime.resolveStandardTargets( force );

        if ( !targets.root || !targets.loot ) {
            if ( state.windowSeen || performance.now() > state.waitForLootUntil ) {
                clearEffect();
            }

            return;
        }

        state.windowSeen = true;

        runtime.syncActiveLootObserver( targets.root );

        const wanted = new Set();

        const map = {
            outer: targets.outer,

            loot: targets.loot ? [targets.loot] : [],

            card: targets.card,

            item: targets.item,

            confirm: targets.confirm,

            canvas: targets.canvas
        };

        const reposition = force || state.layoutDirty || state.geometryDirty;

        [ 'outer', 'loot', 'card', 'item', 'confirm', 'canvas' ].forEach( prefix => {
                const config = runtime.targetConfig(prefix);

                if ( config.effect === 'none' ) {
                    return;
                }

                const list = map[prefix];

                list.forEach( element => {
                        const key =
                            `${prefix}:${runtime.getElementId(
                                element
                            )}`;

                        wanted.add(key);

                        runtime.ensureOverlay( key, element, config, 'rect', 0, reposition );
                    }
                );
            }
        );

        runtime.syncUi( wanted, targets.root, force );

        syncWorld();

        runtime.removeUnusedOverlays( wanted );

        runtime.syncObservedElements( targets );

        state.layoutDirty = false; state.geometryDirty = false;
    }

    /* ==========================================================
       SCHEDULER

       Animacje CSS / SVG działają samodzielnie w przeglądarce.
       Nie ma już pętli JS odpalanej 8-25 razy na sekundę tylko po to,
       żeby ponownie odczytywać te same recty i style.
    ========================================================== */

    function clearSettleTimers() {
        state.settleTimers.forEach( timer => ctx.scheduler.clearTimeout(timer) );

        state.settleTimers.clear();
    }

    function requestSync( force = false ) {
        if (!state.active) {
            return;
        }

        state.pendingForceSync = state.pendingForceSync || force;

        if (state.syncRaf) {
            return;
        }

        state.syncRaf = ctx.scheduler.frame( () => {
                    state.syncRaf = 0;

                    const doForce = state.pendingForceSync;

                    state.pendingForceSync = false;

                    syncEffects( doForce );
                }
            );
    }

    function stopLoop() {
        if (state.syncRaf) {
            ctx.scheduler.cancelFrame( state.syncRaf );
        }

        state.syncRaf = 0; state.pendingForceSync = false;

        if (state.maintenanceTimer) {
            ctx.scheduler.clearTimeout( state.maintenanceTimer );
        }

        state.maintenanceTimer = 0;

        clearSettleTimers();
    }

    function scheduleMaintenance() {
        if (!state.active) {
            return;
        }

        const profile = runtime.getPerformanceProfile();

        state.maintenanceTimer = ctx.scheduler.timeout( () => {
                    state.maintenanceTimer = 0;

                    if (!state.active) {
                        return;
                    }

                    if ( !document.hidden || !state.settings.pauseWhenHidden ) {
                        /*
                         * Wolny sanity-check. Nie przebudowuje layoutu,
                         * chyba że obserwatory oznaczyły go jako dirty.
                         */
                        syncEffects(false);
                    }

                    scheduleMaintenance();
                }, profile.maintenanceMs
            );
    }

    function startLoop() {
        stopLoop();

        requestSync(true); scheduleMaintenance();
    }

    /* ==========================================================
       ACTIVATE
    ========================================================== */

    function activateEffect(duration) {
        if (!ctx.enabled) {
            return;
        }

        clearEffect();

        state.active = true; state.windowSeen = false;

        state.waitForLootUntil = performance.now() + 1600;

        state.uiDirty = true; state.layoutDirty = true; state.geometryDirty = true;

        state.cachedTargets = null;

        state.nextUiRefresh = 0; state.nextTargetRefresh = 0;

        startLoop();

        [ 40, 120, 280, 600 ].forEach( delay => {
                const timer = ctx.scheduler.timeout( () => {
                            state.settleTimers.delete( timer );

                            if (state.active) {
                                state.cachedTargets = null; state.geometryDirty = true; requestSync(true);
                            }
                        }, delay
                    );

                state.settleTimers.add(timer);
            }
        );

        state.clearTimer = ctx.scheduler.timeout( clearEffect, runtime.clamp( duration, 1, 120 ) * 1000 );
    }

    function clearEffect() {
        state.active = false; state.windowSeen = false;

        state.waitForLootUntil = 0;

        if (state.clearTimer) {
            ctx.scheduler.clearTimeout( state.clearTimer );
        }

        state.clearTimer = 0;

        stopLoop();

        runtime.clearOverlays(); runtime.clearObservedElements(); runtime.syncActiveLootObserver(null);

        document .getElementById( IDS.world ) ?.remove();

        state.worldSignature = ''; state.cachedTargets = null; state.uiTargets = [];

        state.uiDirty = true; state.layoutDirty = true; state.geometryDirty = true;
    }

    return { syncWorld, syncEffects, clearSettleTimers, requestSync, stopLoop, scheduleMaintenance, startLoop, activateEffect, clearEffect };
}
