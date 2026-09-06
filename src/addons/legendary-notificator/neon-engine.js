
export function createNeonEngine(state, ctx, runtime) {
    /* ==========================================================
       MULTILAYER NEON
    ========================================================== */

    function getNeonPalette(config) {
        if (!state.settings.multiLayerEnabled) {
            return {
                core: config.coreMode === 'white' ? '#ffffff' : config.color,

                layer1: config.color, layer2: config.color, layer3: config.color
            };
        }

        return {
            core: state.settings.neonCoreColor,

            layer1: state.settings.neonLayer1Color,

            layer2: state.settings.neonLayer2Color,

            layer3: state.settings.neonLayer3Color
        };
    }

    const NEON_OPACITY_TABLE = [ 0.00, 0.06, 0.10, 0.16, 0.24, 0.34, 0.47, 0.62, 0.77, 0.90, 1.00 ];

    const NEON_SPATIAL_TABLE = [ 0.00, 0.35, 0.55, 0.80, 1.10, 1.50, 2.00, 2.65, 3.45, 4.40, 5.50 ];

    function neonLevel(value) {
        return Math.max( 0, Math.min( 5, Math.round( Number(value) || 0 ) ) );
    }

    function neonInternalLevel(value) {
        return neonLevel(value) * 2;
    }

    function neonOpacityLevel(value) {
        const level = neonInternalLevel(value);

        if (level === 0) {
            return 0;
        }

        return ( NEON_OPACITY_TABLE[level] || 0 );
    }

    function neonSpatialLevel(value) {
        return ( NEON_SPATIAL_TABLE[ neonInternalLevel(value) ] || 0 );
    }

    function getNeonLayerRuntime( index, config ) {
        const palette = getNeonPalette(config);

        const source = [ {
                color: palette.layer1, strength: state.settings.neonLayer1Strength, opacity: state.settings.neonLayer1Opacity, width: state.settings.neonLayer1Width
            }, {
                color: palette.layer2, strength: state.settings.neonLayer2Strength, opacity: state.settings.neonLayer2Opacity, width: state.settings.neonLayer2Width
            }, {
                color: palette.layer3, strength: state.settings.neonLayer3Strength, opacity: state.settings.neonLayer3Opacity, width: state.settings.neonLayer3Width
            }
        ][index];

        const strength = neonLevel( source.strength );

        const opacity = neonOpacityLevel( source.opacity );

        const width = neonLevel( source.width );

        if ( strength <= 0 || opacity <= 0 || width <= 0 ) {
            return null;
        }

        return {
            index,

            color: source.color,

            strength,

            opacity,

            width,

            internal: neonInternalLevel( strength ),

            widthSpread: neonSpatialLevel( width ),

            intensity: runtime.clamp( Number( config.intensity ) || 1, 0.05, 2 )
        };
    }

    /*
     * PROFIL "BLOOM"
     *
     * Pełna, daleka poświata. Używamy jej tylko na głównym
     * zewnętrznym oknie łupu. To tutaj warstwa 3 może zrobić
     * naprawdę ogromny rozbłysk bez zalewania całego HUD-u.
     */
    function getBloomLayerPasses( layer, multiplier = 1 ) {
        if (!layer) {
            return [];
        }

        const ws = layer.widthSpread;

        const ls = NEON_SPATIAL_TABLE[ Math.max( 0, Math.min( 10, layer.internal ) ) ] || 0;

        const strengthBoost = layer.index === 2 ? ( 0.65 + ( ls / 5.5 ) * 0.75 ) : ( 0.60 + ( ls / 5.5 ) * 0.70 );

        const alpha = Math.min( 1, layer.opacity * strengthBoost * layer.intensity );

        if (layer.index === 0) {
            return [ {
                    blur: Math.round( ( 2 + ls * 2 ) * multiplier ),

                    spread: 0,

                    alpha: Math.min( 1, alpha * 1.15 )
                },

                {
                    blur: Math.round( ( 8 + ws * 5 ) * multiplier ),

                    spread: Math.round( ( 2 + ws * 3 ) * multiplier ),

                    alpha
                },

                {
                    blur: Math.round( ( 15 + ws * 7 ) * multiplier ),

                    spread: Math.round( ( 5 + ws * 5 ) * multiplier ),

                    alpha: Math.min( 1, alpha * 0.72 )
                }
            ];
        }

        if (layer.index === 1) {
            return [ {
                    blur: Math.round( ( 13 + ws * 7 ) * multiplier ),

                    spread: Math.round( ( 12 + ws * 10 ) * multiplier ),

                    alpha
                },

                {
                    blur: Math.round( ( 22 + ws * 10 ) * multiplier ),

                    spread: Math.round( ( 18 + ws * 15 ) * multiplier ),

                    alpha: Math.min( 1, alpha * 0.76 )
                },

                {
                    blur: Math.round( ( 32 + ws * 12 ) * multiplier ),

                    spread: Math.round( ( 24 + ws * 19 ) * multiplier ),

                    alpha: Math.min( 1, alpha * 0.52 )
                }
            ];
        }

        return [ {
                blur: Math.round( ( 16 + ws * 8 ) * multiplier ),

                spread: Math.round( ( 30 + ws * 21 ) * multiplier ),

                alpha
            },

            {
                blur: Math.round( ( 28 + ws * 11 ) * multiplier ),

                spread: Math.round( ( 42 + ws * 27 ) * multiplier ),

                alpha: Math.min( 1, alpha * 0.82 )
            },

            {
                blur: Math.round( ( 42 + ws * 15 ) * multiplier ),

                spread: Math.round( ( 55 + ws * 34 ) * multiplier ),

                alpha: Math.min( 1, alpha * 0.58 )
            }
        ];
    }

    /*
     * PROFIL "FRAME"
     *
     * Ta sama logika 3 warstw i te same skale 0-5, ale z
     * kontrolowanym spreadem. Ten profil jest przeznaczony dla
     * obrysów mapy i HUD-u, gdzie wiele ramek nakłada się na siebie.
     */
    function getFrameLayerPasses( layer, multiplier = 1 ) {
        if (!layer) {
            return [];
        }

        const level = layer.internal;

        const width = layer.widthSpread;

        /*
         * Dla ramek HUD-u siła elementu nie może liniowo "zgasić"
         * poświaty, bo zostaje wtedy sama ostra kreska. Przy wartości
         * np. 0.4 nadal chcemy miękki neon, tylko mniej dominujący.
         */
        const rawIntensity = runtime.clamp( Number(layer.intensity) || 1, 0.05, 2 );

        const visualIntensity = rawIntensity <= 1 ? ( 0.56 + 0.44 * Math.sqrt(rawIntensity) ) : ( 1 + Math.min( 0.36, (rawIntensity - 1) * 0.36 )
                );

        const strength = Math.min( 1, layer.opacity * ( 0.72 + level * 0.035 ) * visualIntensity );

        const layerScale = 1 + layer.index * 0.42;

        /*
         * Profil "rurka": trzy miękkie pasy na każdą warstwę.
         * Zasięgi są celowo większe niż w 5.9.5, ale nadal mocno
         * ograniczone względem pełnego bloom okna łupu.
         */
        const tightBlur = ( 5 + level * 0.58 + width * 1.15 ) * layerScale * multiplier;

        const mediumBlur = ( 12 + level * 0.82 + width * 2.25 ) * layerScale * multiplier;

        const softBlur = ( 23 + level * 1.02 + width * 3.75 ) * layerScale * multiplier;

        const tightSpread = Math.min( 4.0, ( 0.35 + width * 0.30 ) * layerScale * multiplier );

        const mediumSpread = Math.min( 7.0, ( 0.70 + width * 0.46 ) * layerScale * multiplier );

        const softSpread = Math.min( 11.0, ( 1.05 + width * 0.68 ) * layerScale * multiplier );

        return [ {
                blur: Math.round( tightBlur ),

                spread: Number( tightSpread .toFixed(1) ),

                alpha: Math.min( 1, strength * 0.98 )
            },

            {
                blur: Math.round( mediumBlur ),

                spread: Number( mediumSpread .toFixed(1) ),

                alpha: Math.min( 0.74, strength * 0.58 )
            },

            {
                blur: Math.round( softBlur ),

                spread: Number( softSpread .toFixed(1) ),

                alpha: Math.min( 0.34, strength * 0.24 )
            }
        ];
    }

    /*
     * PROFIL "ITEM"
     *
     * Najciaśniejsza wersja warstw. Dzięki temu karta i sam
     * legendarny przedmiot są czytelnie obrysowane zamiast zalane
     * tym samym bloomem co całe okno.
     */
    function getItemLayerPasses( layer, multiplier = 1 ) {
        if (!layer) {
            return [];
        }

        const level = layer.internal;

        const width = layer.widthSpread;

        const strength = Math.min( 1, layer.opacity * ( 0.68 + level * 0.025 ) * layer.intensity );

        const layerScale = 1 + layer.index * 0.18;

        const tightBlur = ( 3 + level * 0.28 + width * 0.45 ) * layerScale * multiplier;

        const mediumBlur = ( 6 + level * 0.38 + width * 0.85 ) * layerScale * multiplier;

        const softBlur = ( 10 + level * 0.48 + width * 1.25 ) * layerScale * multiplier;

        const tightSpread = Math.min( 1.8, ( 0.2 + width * 0.12 ) * multiplier );

        const mediumSpread = Math.min( 2.6, ( 0.4 + width * 0.18 ) * multiplier );

        const softSpread = Math.min( 3.4, ( 0.7 + width * 0.24 ) * multiplier );

        return [ {
                blur: Math.round( tightBlur ),

                spread: Number( tightSpread .toFixed(1) ),

                alpha: Math.min( 0.82, strength * 0.72 )
            },

            {
                blur: Math.round( mediumBlur ),

                spread: Number( mediumSpread .toFixed(1) ),

                alpha: Math.min( 0.46, strength * 0.34 )
            },

            {
                blur: Math.round( softBlur ),

                spread: Number( softSpread .toFixed(1) ),

                alpha: Math.min( 0.20, strength * 0.14 )
            }
        ];
    }

    function getNeonLayerPasses( layer, multiplier = 1, profile = 'frame' ) {
        switch (profile) {
            case 'bloom': return getBloomLayerPasses( layer, multiplier );

            case 'item': return getItemLayerPasses( layer, multiplier );

            default: return getFrameLayerPasses( layer, multiplier );
        }
    }

    function buildLayeredNeonShadow( config, multiplier = 1, allowInset = true ) {
        if (!config.glow) {
            return 'none';
        }

        const profile = config.glowProfile || 'frame';

        const palette = getNeonPalette(config);

        const shadows = [];

        const insetEnabled = allowInset && (
            config.insetEnabled !== undefined
                ? Boolean(config.insetEnabled)
                : Boolean(state.settings.neonInside)
        );

        const insetPower = runtime.clamp(
            config.insetPower !== undefined ? config.insetPower : 1,
            0,
            2
        );

        const runtimeLayers = [0, 1, 2] .map( index => getNeonLayerRuntime( index, config ) );

        const firstActiveLayer = runtimeLayers.find(Boolean) || null;

        /*
         * RURKA / CORE
         *
         * 5.9.5 miało bardzo ostrą ramkę + outline. To dawało efekt
         * "sztywnej kreski". Teraz rdzeń ma własny ciasny halo.
         * Dla zwykłych ramek dochodzi też delikatny wewnętrzny rdzeń,
         * niezależny od opcji pełnego świecenia do środka.
         */
        if ( profile === 'frame' && state.settings.neonOutside ) {
            const coreAlpha = runtime.clamp( state.settings.neonCoreOpacity * 0.98, 0, 1 );

            shadows.push( `0 0 ${Math.max( 2, Math.round( 3 * multiplier ) )}px 0 ${runtime.rgba( palette.core, coreAlpha )}` );

            if (insetEnabled) {
                shadows.push( `inset 0 0 ${Math.max( 2, Math.round( 3 * multiplier ) )}px 0 ${runtime.rgba( palette.core, runtime.clamp(coreAlpha * 0.78 * insetPower, 0, 1) )}` );
            }

            if (firstActiveLayer) {
                const tubeAlpha = Math.min( 0.82, firstActiveLayer.opacity * ( 0.66 + firstActiveLayer.internal * 0.025 ) * ( 0.72 + Math.min(
                                0.28, firstActiveLayer.intensity * 0.18
                            )
                        )
                    );

                shadows.push( `0 0 ${Math.max( 4, Math.round( 5 * multiplier ) )}px 0 ${runtime.rgba( firstActiveLayer.color, tubeAlpha )}` );

                if (insetEnabled) {
                    shadows.push( `inset 0 0 ${Math.max( 3, Math.round( 4 * multiplier ) )}px 0 ${runtime.rgba( firstActiveLayer.color, runtime.clamp(tubeAlpha * 0.30 * insetPower, 0, 1) )}`
                    );
                }
            }
        } else if ( profile === 'item' && state.settings.neonOutside ) {
            shadows.push( `0 0 ${Math.max( 1, Math.round( 2 * multiplier ) )}px 0 ${runtime.rgba( palette.core, runtime.clamp( state.settings.neonCoreOpacity * 0.92, 0, 1 ) )}`
            );

            if (firstActiveLayer) {
                shadows.push( `0 0 ${Math.max( 3, Math.round( 4 * multiplier ) )}px 0 ${runtime.rgba( firstActiveLayer.color, Math.min( 0.58, firstActiveLayer.opacity * 0.58 ) )}`
                );
            }
        }

        runtimeLayers.forEach(layer => {
            if (!layer) {
                return;
            }

            const allPasses = getNeonLayerPasses( layer, multiplier, profile );

            const performance = runtime.getPerformanceProfile();

            const animated = ![ 'none', 'static' ].includes( config.effect );

            const passLimit = animated ? ( profile === 'bloom' ? performance.animatedBloomPasses : ( profile === 'item' ? performance.animatedItemPasses : performance.animatedFramePasses ) )
                    : 3;

            const passes = allPasses.slice( 0, Math.max( 1, passLimit ) );

            passes.forEach( (pass, passIndex) => {
                    if (state.settings.neonOutside) {
                        shadows.push( `0 0 ${pass.blur}px ${pass.spread}px ${runtime.rgba( layer.color, pass.alpha )}` );
                    }

                    if ( insetEnabled && profile !== 'item' ) {
                        /*
                         * Pełne lustrzane bloom wewnątrz wyglądało jak
                         * kolorowa folia. Inset ma tę samą logikę kolorów,
                         * ale mniejszy spread i malejącą moc.
                         */
                        const insetScale = profile === 'bloom' ? 0.20 : ( [0.48, 0.38, 0.28][passIndex] || 0.28 );

                        const insetBlur = profile === 'bloom' ? Math.max( 4, pass.blur * 0.42 ) : Math.max( 3, pass.blur * 0.68 );

                        const insetSpread = profile === 'bloom' ? Math.min( 8, pass.spread * 0.12 ) : Math.min( 5.5, pass.spread * 0.45 );

                        shadows.push( `inset 0 0 ${Number( insetBlur.toFixed(1) )}px ${Number( insetSpread.toFixed(1) )}px ${runtime.rgba( layer.color, runtime.clamp(pass.alpha * insetScale * insetPower, 0, 1) )}`
                        );
                    }
                }
            );
        });

        return shadows.length ? shadows.join(', ') : 'none';
    }

    function buildMultilayerBoxShadow( config, factor = 1, allowInset = true ) {
        if (!config.glow) {
            return 'none';
        }

        if (!state.settings.multiLayerEnabled) {
            const near = config.near ?? runtime.effectiveBlur( state.settings.glowNear );

            const far = config.far ?? runtime.effectiveBlur( state.settings.glowFar );

            return [ `0 0 ${near}px ${runtime.rgba( config.color, runtime.clamp( config.intensity * factor * 0.55, 0, 0.8 ) )}`,

                `0 0 ${far}px ${runtime.rgba( config.color, runtime.clamp( config.intensity * factor * 0.18, 0, 0.35 ) )}`
            ].join(',');
        }

        return buildLayeredNeonShadow( config, factor, allowInset );
    }

    function buildMotionFilter( config, colorOverride = null ) {
        if ( !config.glow || !state.settings.multiLayerEnabled || !state.settings.neonOutside ) {
            return 'none';
        }

        const palette = getNeonPalette(config);

        const performance = runtime.getPerformanceProfile();

        const maxPasses = Math.max( 0, performance.motionFilterPasses );

        if (maxPasses === 0) {
            return 'none';
        }

        /*
         * Ruchome SVG było największym kosztem GPU w 5.9.x.
         * Każda kreska potrafiła dostać 7-10 drop-shadowów, a następnie
         * była animowana przez stroke-dashoffset. To zmuszało przeglądarkę
         * do ciągłego rasteryzowania dużych filtrów.
         *
         * Statyczna baza pod animacją nadal posiada pełny wielowarstwowy
         * neon. Ruchoma kreska dostaje tylko najważniejsze 1-3 passy.
         */
        const filters = [ `drop-shadow(0 0 3px ${runtime.rgba( colorOverride || palette.core, 0.94 )})` ];

        if (filters.length >= maxPasses) {
            return filters.join(' ');
        }

        const glowProfile = config.glowProfile || 'frame';

        for ( let layerIndex = 0; layerIndex < 3 && filters.length < maxPasses; layerIndex++ ) {
            const layer = getNeonLayerRuntime( layerIndex, config );

            if (!layer) {
                continue;
            }

            const passes = getNeonLayerPasses( layer, 1, glowProfile );

            if (!passes.length) {
                continue;
            }

            /*
             * Bierzemy kolejno ciasny, a potem średni pass.
             * Daleki spread pozostaje w statycznym obrysie - wizualnie
             * nadal jest obecny, ale nie jest liczony na każdej klatce.
             */
            const selectedPass = passes[ filters.length === 1 ? 0 : Math.min( 1, passes.length - 1 ) ];

            const blur = Math.max( 2, Math.min( 22, Math.round( selectedPass.blur + selectedPass.spread * 0.10 ) ) );

            filters.push( `drop-shadow(0 0 ${blur}px ${runtime.rgba( layer.color, Math.min( 0.78, selectedPass.alpha * 0.72 ) )})` );
        }

        return filters.join(' ');
    }

    return { getNeonPalette, neonLevel, neonInternalLevel, neonOpacityLevel, neonSpatialLevel, getNeonLayerRuntime, getBloomLayerPasses, getFrameLayerPasses, getItemLayerPasses, getNeonLayerPasses, buildLayeredNeonShadow, buildMultilayerBoxShadow, buildMotionFilter };
}
