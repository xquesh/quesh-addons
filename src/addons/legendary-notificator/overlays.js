
export function createOverlays(state, ctx, runtime) {
    /* ==========================================================
       LOCAL OVERLAY LAYERING

       v5.8.6:
       - lokalny overlay zostaje tylko dla canvasu / .game-layer,
       - UI wraca do pełnych overlayów 5.8.x, żeby żadna strukturalna
         ramka nie znikała pod własnym tłem,
       - środkowa kula HP jest omijana przez segmentowane dolne krawędzie.
    ========================================================== */

    function useLocalOverlayForKey(key) {
        /*
         * Canvas zostaje w lokalnym stacking contexcie .game-layer,
         * dzięki czemu nigdy nie wyskakuje ponad HUD.
         *
         * UI wraca do pełnego renderera overlay 5.8.x. Próba osadzania
         * każdej ramki UI wewnątrz jej elementu powodowała, że część
         * struktur z nieprzezroczystym tłem zasłaniała własny neon.
         */
        return key.startsWith('canvas:');
    }

    function retainLocalOverlayOwner(element) {
        if ( !element || !(element instanceof HTMLElement) ) {
            return false;
        }

        let ownerState = state.localOverlayOwners.get( element );

        if (!ownerState) {
            ownerState = {
                count: 0,

                position: element.style.position,

                isolation: element.style.isolation
            };

            state.localOverlayOwners.set( element, ownerState );
        }

        ownerState.count++;

        const computed = getComputedStyle( element );

        /*
         * Absolute overlay potrzebuje lokalnego containing block.
         * relative nie zmienia layoutu elementu.
         */
        if ( computed.position === 'static' ) {
            element.style.position = 'relative';
        }

        /*
         * Tworzy lokalny stacking context.
         * Dzięki temu z-index:-1 pozostaje POD zawartością tego elementu,
         * ale nie wpada pod całą stronę / canvas.
         */
        element.style.isolation = 'isolate';

        return true;
    }

    function releaseLocalOverlayOwner(element) {
        if ( !element || !(element instanceof HTMLElement) ) {
            return;
        }

        const ownerState = state.localOverlayOwners.get( element );

        if (!ownerState) {
            return;
        }

        ownerState.count--;

        if ( ownerState.count > 0 ) {
            return;
        }

        element.style.position = ownerState.position;

        element.style.isolation = ownerState.isolation;

        state.localOverlayOwners.delete( element );
    }

    function mountOverlayLocally( overlay, element ) {
        if ( !overlay || !retainLocalOverlayOwner( element ) ) {
            return false;
        }

        overlay.classList.add( 'ln-local-fx' );

        overlay.style.position = 'absolute';

        overlay.style.zIndex = '2';

        /*
         * Canvas FX musi być NAD samą mapą, żeby inset box-shadow był
         * widoczny do środka. Nadal siedzi jednak w izolowanym
         * stacking contexcie .game-layer, więc nie przebija HUD-u,
         * tooltipów ani okien interfejsu.
         */
        element.appendChild(overlay);

        return true;
    }

    /* ==========================================================
       OVERLAY CREATION
    ========================================================== */

    function buildOverlay( kind, config, shape = 'rect' ) {
        const overlay = document.createElement('div');

        overlay.className = 'ln-fx';

        overlay.dataset.kind = kind;

        overlay.dataset.shape = shape;

        overlay.style.setProperty( '--ln-speed', config.speed + 's' );

        overlay.style.setProperty( '--ln-delay', '0s' );

        if ( config.effect === 'none' ) {
            document.body.appendChild( overlay );

            return overlay;
        }

        runtime.addAmbient( overlay, config );

        const motion = runtime.isMotionEffect( config.effect );

        const baseFactor = motion ? ( state.settings.animationBaseLine ? runtime.clamp( state.settings.animationBaseOpacity, 0, 0.8 ) : 0 ) : 1;

        runtime.addCheapBase( overlay, config, shape, baseFactor );

        if (!motion) {
            switch (config.effect) {
                case 'breathe': overlay.classList.add( 'ln-breathe' ); break;

                case 'pulse': overlay.classList.add( 'ln-pulse' ); break;

                case 'heartbeat': overlay.classList.add( 'ln-heartbeat' ); break;

                case 'cascade': overlay.classList.add( 'ln-cascade' ); break;

                case 'lootWave': overlay.classList.add( 'ln-loot-wave' ); break;
            }
        } else {
            runtime.buildMotionSvg( overlay, config, shape );
        }

        document.body.appendChild( overlay );

        return overlay;
    }

    function overlaySignature( config, shape ) {
        return JSON.stringify({
            ...config,

            shape,

            performanceMode: state.settings.performanceMode,

            multiLayerEnabled: state.settings.multiLayerEnabled,

            neonCoreColor: state.settings.neonCoreColor,

            neonCoreOpacity: state.settings.neonCoreOpacity,

            neonLayer1Color: state.settings.neonLayer1Color,

            neonLayer1Strength: state.settings.neonLayer1Strength,

            neonLayer1Opacity: state.settings.neonLayer1Opacity,

            neonLayer1Width: state.settings.neonLayer1Width,

            neonLayer2Color: state.settings.neonLayer2Color,

            neonLayer2Strength: state.settings.neonLayer2Strength,

            neonLayer2Opacity: state.settings.neonLayer2Opacity,

            neonLayer2Width: state.settings.neonLayer2Width,

            neonLayer3Color: state.settings.neonLayer3Color,

            neonLayer3Strength: state.settings.neonLayer3Strength,

            neonLayer3Opacity: state.settings.neonLayer3Opacity,

            neonLayer3Width: state.settings.neonLayer3Width,

            neonInside: state.settings.neonInside,

            neonOutside: state.settings.neonOutside,

            animationBaseLine: state.settings.animationBaseLine,

            animationBaseOpacity: state.settings.animationBaseOpacity,

            ambientPower: state.settings.ambientPower,

            ambientMode: state.settings.ambientMode
        });
    }

    /* ==========================================================
       POSITION OVERLAY
    ========================================================== */

    function positionOverlay(entry) {
        if (!entry?.overlay) {
            return;
        }

        /*
         * Pozycjonowanie jest teraz wykonywane tylko po zdarzeniu layoutu
         * lub podczas wolnego maintenance ticka. Dodatkowo nie zapisujemy
         * ponownie tych samych wartości CSS - to ogranicza style/layout
         * thrashing przy otwartym oknie łupu.
         */

        if ( entry.local && !entry.virtual ) {
            const element = entry.element;

            if ( !element || !element.isConnected ) {
                if ( entry.overlay.style.display !== 'none' ) {
                    entry.overlay.style.display = 'none';
                }

                return;
            }

            const baseWidth = element.offsetWidth;

            const baseHeight = element.offsetHeight;

            if ( baseWidth <= 0 || baseHeight <= 0 ) {
                if ( entry.overlay.style.display !== 'none' ) {
                    entry.overlay.style.display = 'none';
                }

                return;
            }

            const config = entry.config;

            const padding = Number(config.padding) || 0;

            const left = padding + (Number(config.left) || 0);

            const right = padding + (Number(config.right) || 0);

            const top = padding + (Number(config.top) || 0);

            const bottom = padding + (Number(config.bottom) || 0);

            const borderLeft = element.clientLeft || 0;

            const borderTop = element.clientTop || 0;

            const width = Math.max( 1, baseWidth + left + right );

            const height = Math.max( 1, baseHeight + top + bottom );

            if ( entry._radius === undefined ) {
                entry._radius = parseFloat( getComputedStyle( element ).borderRadius ) || 0;
            }

            const radius = entry._radius;

            const geometry = [ -left - borderLeft, -top - borderTop, width, height, radius, config.width ].join('|');

            if ( entry._geometry === geometry && entry.overlay.style.display === 'block' ) {
                return;
            }

            entry._geometry = geometry;

            entry.overlay.style.display = 'block';

            entry.overlay.style.left = (-left - borderLeft) + 'px';

            entry.overlay.style.top = (-top - borderTop) + 'px';

            entry.overlay.style.width = width + 'px';

            entry.overlay.style.height = height + 'px';

            entry.overlay.style.borderRadius = radius + 'px';

            runtime.updateSvgGeometry( entry.overlay, width, height, radius, config.width );

            return;
        }

        let rect;

        if (entry.virtual) {
            rect = entry.rect;
        } else {
            const element = entry.element;

            if ( !element || !element.isConnected ) {
                if ( entry.overlay.style.display !== 'none' ) {
                    entry.overlay.style.display = 'none';
                }

                return;
            }

            rect = element.getBoundingClientRect();

            if ( rect.width <= 0 || rect.height <= 0 ) {
                if ( entry.overlay.style.display !== 'none' ) {
                    entry.overlay.style.display = 'none';
                }

                return;
            }
        }

        const config = entry.config;

        const padding = Number(config.padding) || 0;

        const leftPad = padding + (Number(config.left) || 0);

        const rightPad = padding + (Number(config.right) || 0);

        const topPad = padding + (Number(config.top) || 0);

        const bottomPad = padding + (Number(config.bottom) || 0);

        const left = rect.left - leftPad;

        const top = rect.top - topPad;

        const width = Math.max( 1, rect.width + leftPad + rightPad );

        const height = Math.max( 1, rect.height + topPad + bottomPad );

        let radius = 0;

        if ( !entry.virtual && entry.element ) {
            if ( entry._radius === undefined ) {
                entry._radius = parseFloat( getComputedStyle( entry.element ).borderRadius ) || 0;
            }

            radius = entry._radius;
        }

        const round = value => Math.round( Number(value) * 10 ) / 10;

        const geometry = [ round(left), round(top), round(width), round(height), round(radius), config.width ].join('|');

        if ( entry._geometry === geometry && entry.overlay.style.display === 'block' ) {
            return;
        }

        entry._geometry = geometry;

        entry.overlay.style.display = 'block';

        entry.overlay.style.left = left + 'px';

        entry.overlay.style.top = top + 'px';

        entry.overlay.style.width = width + 'px';

        entry.overlay.style.height = height + 'px';

        entry.overlay.style.borderRadius = radius + 'px';

        runtime.updateSvgGeometry( entry.overlay, width, height, radius, config.width );
    }

    /* ==========================================================
       LOOT STACKING

       Zewnętrzny bloom siedzi za prawdziwym oknem łupu.
       Wewnętrzne obrysy pozostają nad oknem, żeby były czytelne.
       Dzięki temu daleka warstwa nie robi kolorowej folii na tekście
       i ikonach w oknie.
    ========================================================== */

    function getNumericZIndex(element) {
        if (!(element instanceof Element)) {
            return null;
        }

        const computed = Number.parseInt( getComputedStyle( element ).zIndex, 10 );

        if (Number.isFinite(computed)) {
            return computed;
        }

        const inline = Number.parseInt( element.style.zIndex, 10 );

        return Number.isFinite(inline) ? inline : null;
    }

    function syncOverlayStacking( key, entry ) {
        if ( !entry || entry.virtual || entry.local || !entry.element ) {
            return;
        }

        const root = entry.element.matches?.( '.loot-wnd' ) ? entry.element : entry.element.closest?.( '.loot-wnd' );

        if (!root) {
            return;
        }

        const lootZ = getNumericZIndex( root );

        if (!Number.isFinite(lootZ)) {
            return;
        }

        if (key.startsWith('outer:')) {
            entry.overlay.style.zIndex = String( lootZ - 1 );

            return;
        }

        if (key.startsWith('loot:')) {
            entry.overlay.style.zIndex = String( lootZ + 1 );

            return;
        }

        if (key.startsWith('card:')) {
            entry.overlay.style.zIndex = String( lootZ + 2 );

            return;
        }

        if (key.startsWith('item:')) {
            entry.overlay.style.zIndex = String( lootZ + 3 );

            return;
        }

        if (key.startsWith('confirm:')) {
            entry.overlay.style.zIndex = String( lootZ + 4 );
        }
    }

    /* ==========================================================
       OVERLAY MANAGER
    ========================================================== */

    function cancelAnimations(entry) {
        const svg = entry ?.overlay ?._motionSvg;

        if ( !svg || !svg._animations ) {
            return;
        }

        svg._animations .forEach( animation => {
                    try {
                        animation.cancel();
                    } catch {}
                }
            );

        svg._animations = [];
    }

    function removeOverlayEntry(entry) {
        if (!entry) {
            return;
        }

        cancelAnimations(entry);

        entry.overlay ?.remove();

        if ( entry.localOwner ) {
            releaseLocalOverlayOwner( entry.localOwner );
        }
    }

    function ensureOverlay( key, element, config, shape, delay = 0, reposition = true ) {
        const signature = overlaySignature( config, shape );

        const local = useLocalOverlayForKey( key );

        let entry = state.overlays.get(key);

        if ( !entry || entry.virtual || entry.element !== element || entry.signature !== signature || Boolean(entry.local) !== local ) {
            removeOverlayEntry(entry);

            const kind = key.startsWith('ui:') ? 'ui' : key.split(':')[0];

            const overlay = buildOverlay( kind, config, shape );

            let localOwner = null;

            if ( local && mountOverlayLocally( overlay, element ) ) {
                localOwner = element;
            }

            entry = {
                virtual: false,

                local: Boolean( localOwner ),

                localOwner,

                element,

                config,

                shape,

                signature,

                overlay
            };

            state.overlays.set( key, entry );

            reposition = true;
        }

        entry.config = config;

        entry.overlay.style.setProperty( '--ln-delay', delay + 's' );

        if (reposition) {
            positionOverlay(entry);
        }

        if ( reposition || !entry._stackInitialized ) {
            syncOverlayStacking( key, entry );

            entry._stackInitialized = true;
        }

        return entry;
    }

    function ensureVirtualOverlay( key, rect, config, shape = 'rect', delay = 0 ) {
        const signature = overlaySignature( config, shape );

        let entry = state.overlays.get(key);

        if ( !entry || !entry.virtual || entry.signature !== signature ) {
            removeOverlayEntry(entry);

            entry = {
                virtual: true,

                rect,

                config,

                shape,

                signature,

                overlay: buildOverlay( 'ui', config, shape )
            };

            state.overlays.set( key, entry );
        }

        entry.rect = rect;

        entry.config = config;

        entry.overlay.style.setProperty( '--ln-delay', delay + 's' );

        positionOverlay(entry);

        return entry;
    }

    function removeUnusedOverlays(wanted) {
        for ( const [key, entry] of state.overlays ) {
            if (!wanted.has(key)) {
                removeOverlayEntry(entry);

                state.overlays.delete(key);
            }
        }
    }

    function clearOverlays() {
        for ( const entry of state.overlays.values() ) {
            removeOverlayEntry(entry);
        }

        state.overlays.clear();
    }

    function rebuildEffects() {
        clearOverlays();

        state.uiDirty = true; state.layoutDirty = true; state.geometryDirty = true;

        state.cachedTargets = null;

        state.nextUiRefresh = 0; state.nextTargetRefresh = 0;

        if (state.active) {
            runtime.requestSync(true);
        }
    }

    return { useLocalOverlayForKey, retainLocalOverlayOwner, releaseLocalOverlayOwner, mountOverlayLocally, buildOverlay, overlaySignature, positionOverlay, getNumericZIndex, syncOverlayStacking, cancelAnimations, removeOverlayEntry, ensureOverlay, ensureVirtualOverlay, removeUnusedOverlays, clearOverlays, rebuildEffects };
}
