
export function createAnimations(state, ctx, runtime) {
    /* ==========================================================
       SHAPES
    ========================================================== */

    function shapeEdges(shape) {
        switch (shape) {
            case 'topBottom': return [ 'top', 'bottom' ];

            case 'top': return ['top'];

            case 'bottom': return ['bottom'];

            case 'leftRight': return [ 'left', 'right' ];

            case 'left': return ['left'];

            case 'right': return ['right'];

            case 'topLeftRight': return [ 'top', 'left', 'right' ];

            default: return [ 'top', 'right', 'bottom', 'left' ];
        }
    }

    function isMotionEffect(effect) {
        return [ 'orbit', 'dual', 'comet', 'scannerH', 'scannerV', 'scannerCross' ].includes(effect);
    }

    /* ==========================================================
       BASE RECTANGLE
    ========================================================== */

    function addCheapRect( overlay, config, factor ) {
        const line = document.createElement('div');

        line.className = 'ln-base-rect';

        line.style.borderWidth = config.width + 'px';

        const palette = runtime.getNeonPalette(config);

        let core = config.color;

        if (state.settings.multiLayerEnabled) {
            core = palette.core;
        } else if ( config.coreMode === 'white' ) {
            core = '#ffffff';
        }

        const coreAlpha = config.coreMode === 'original' && !state.settings.multiLayerEnabled ? 0 : ( state.settings.multiLayerEnabled ? runtime.clamp( state.settings.neonCoreOpacity *
                            factor, 0, 1
                        ) : config.coreOpacity * factor
                );

        line.style.borderColor = runtime.rgba( core, coreAlpha );

        /*
         * Bez twardego outline. Ciasny kolorowy płaszcz jest teraz
         * częścią box-shadow, więc rdzeń nie wygląda jak zwykły CSS border.
         */
        line.style.outline = 'none';

        if (config.glow) {
            line.style.boxShadow = runtime.buildMultilayerBoxShadow( config, factor, true );
        }

        overlay.appendChild(line);
    }

    /* ==========================================================
       PARTIAL LINE
    ========================================================== */

    function addCheapEdge( overlay, edge, config, factor ) {
        const line = document.createElement('div');

        line.className = `ln-edge ln-edge-${edge}`;

        const palette = runtime.getNeonPalette(config);

        let core = config.color;

        if (state.settings.multiLayerEnabled) {
            core = palette.core;
        } else if ( config.coreMode === 'white' ) {
            core = '#ffffff';
        }

        const alpha = state.settings.multiLayerEnabled ? runtime.clamp( state.settings.neonCoreOpacity * factor, 0, 1 ) : ( config.coreMode === 'original' ? 0.001 : config.coreOpacity * factor
                );

        if ( edge === 'top' || edge === 'bottom' ) {
            line.style.height = config.width + 'px';
        } else {
            line.style.width = config.width + 'px';
        }

        if (state.settings.multiLayerEnabled) {
            /*
             * Jednolity jasny rdzeń + glow z box-shadow.
             * Gradient wzdłuż całej krawędzi dawał płaski, "sztywny" efekt.
             */
            line.style.background = runtime.rgba( palette.core, alpha );
        } else {
            line.style.background = runtime.rgba( core, alpha );
        }

        if (config.glow) {
            line.style.boxShadow = runtime.buildMultilayerBoxShadow( config, factor, false );
        }

        overlay.appendChild(line);
    }

    function addCheapBase( overlay, config, shape, factor ) {
        if (factor <= 0) {
            return;
        }

        if (shape === 'rect') {
            addCheapRect( overlay, config, factor );

            return;
        }

        shapeEdges(shape) .forEach( edge => {
                    addCheapEdge( overlay, edge, config, factor );
                }
            );
    }

    /* ==========================================================
       AMBIENT
    ========================================================== */

    function addAmbient( overlay, config ) {
        if ( !config.ambient || state.settings.ambientPower <= 0 ) {
            return;
        }

        const performanceFactor = state.settings.performanceMode === 'eco' ? 0.55 : 1;

        const power = runtime.clamp( state.settings.ambientPower, 0, 0.6 ) * config.intensity * performanceFactor;

        const ambient = document.createElement( 'div' );

        ambient.className = 'ln-ambient';

        const palette = runtime.getNeonPalette(config);

        const ambientColor = state.settings.multiLayerEnabled ? palette.layer2 : config.color;

        overlay.style.setProperty( '--ln-ambient-a', runtime.rgba( ambientColor, power * 0.12 ) );

        overlay.style.setProperty( '--ln-ambient-b', runtime.rgba( ambientColor, power * 0.05 ) );

        overlay.style.setProperty( '--ln-ambient-opacity', runtime.clamp( 0.35 + power, 0.1, 0.85 ) );

        if ( state.settings.ambientMode === 'breathe' ) {
            ambient.classList.add( 'ln-breathe' );
        }

        if ( state.settings.ambientMode === 'pulse' ) {
            ambient.classList.add( 'ln-pulse' );
        }

        overlay.appendChild( ambient );
    }

    /* ==========================================================
       SVG MOTION
    ========================================================== */

    function svgElement(name) {
        return document.createElementNS( 'http://www.w3.org/2000/svg', name );
    }

    function motionEdges( shape, effect ) {
        if ( effect === 'orbit' || effect === 'dual' || effect === 'comet' ) {
            if (shape === 'rect') {
                return ['perimeter'];
            }

            return shapeEdges(shape);
        }

        if (effect === 'scannerH') {
            const edges = shapeEdges(shape);

            const horizontal = edges.filter( edge => edge === 'top' || edge === 'bottom' );

            return horizontal.length ? horizontal : edges;
        }

        if (effect === 'scannerV') {
            const edges = shapeEdges(shape);

            const vertical = edges.filter( edge => edge === 'left' || edge === 'right' );

            return vertical.length ? vertical : edges;
        }

        return shapeEdges(shape);
    }

    function addMotionStroke( svg, edge, requestedColor, dashLength, startOffset, config, direction, secondary = false ) {
        const element = edge === 'perimeter' ? svgElement('rect') : svgElement('line');

        const palette = runtime.getNeonPalette(config);

        let strokeColor = requestedColor;

        if (state.settings.multiLayerEnabled) {
            strokeColor = secondary ? palette.layer1 : palette.core;
        }

        element.dataset.edge = edge;

        element.setAttribute( 'pathLength', '100' );

        element.setAttribute( 'stroke', strokeColor );

        element.setAttribute( 'stroke-width', String( config.width ) );

        element.setAttribute( 'stroke-dasharray', `${dashLength} ${100 - dashLength}` );

        element.setAttribute( 'stroke-dashoffset', String(startOffset) );

        if (config.glow) {
            const filter = runtime.buildMotionFilter( config, secondary ? palette.layer1 : palette.core );

            if ( filter && filter !== 'none' ) {
                element.style.filter = filter;
            }
        }

        svg.appendChild(element);

        const dir = direction === 'ccw' ? 1 : -1;

        try {
            const animation = element.animate( [ {
                            strokeDashoffset: String( startOffset )
                        }, {
                            strokeDashoffset: String( startOffset + dir * 100 )
                        }
                    ], {
                        duration: Math.max( 300, config.speed * 1000 ),

                        iterations: Infinity,

                        easing: 'linear'
                    }
                );

            svg._animations.push( animation );
        } catch {}
    }

    function buildMotionSvg( overlay, config, shape ) {
        const svg = svgElement('svg');

        svg.classList.add( 'ln-motion-svg' );

        svg._animations = [];

        overlay.appendChild(svg);

        overlay._motionSvg = svg;

        let dash = 15;

        if ( config.effect === 'comet' ) {
            dash = 28;
        }

        if ( config.effect.startsWith( 'scanner' ) ) {
            dash = 20;
        }

        const edges = motionEdges( shape, config.effect );

        edges.forEach( ( edge, index ) => {
                addMotionStroke( svg, edge, config.color, dash, index * 17, config, index % 2 ? ( config.direction === 'cw' ? 'ccw' : 'cw' )
                        : config.direction,
                    false
                );
            }
        );

        if ( config.effect === 'dual' ) {
            edges.forEach( ( edge, index ) => {
                    addMotionStroke( svg, edge, config.accent, 13, 50 + index * 13, config, config.direction === 'cw' ? 'ccw' : 'cw', true
                    );
                }
            );
        }
    }

    function updateSvgGeometry( overlay, width, height, radius, lineWidth ) {
        const svg = overlay._motionSvg;

        if (!svg) {
            return;
        }

        svg.setAttribute( 'viewBox', `0 0 ${width} ${height}` );

        const inset = Math.max( 0.5, lineWidth / 2 );

        svg.querySelectorAll( '[data-edge]' ).forEach( element => {
                const edge = element.dataset.edge;

                if ( edge === 'perimeter' ) {
                    element.setAttribute( 'x', inset );

                    element.setAttribute( 'y', inset );

                    element.setAttribute( 'width', Math.max( 1, width - inset * 2 ) );

                    element.setAttribute( 'height', Math.max( 1, height - inset * 2 ) );

                    element.setAttribute( 'rx', radius );

                    element.setAttribute( 'ry', radius );

                    return;
                }

                if (edge === 'top') {
                    element.setAttribute( 'x1', inset );

                    element.setAttribute( 'y1', inset );

                    element.setAttribute( 'x2', width - inset );

                    element.setAttribute( 'y2', inset );
                }

                if (edge === 'bottom') {
                    element.setAttribute( 'x1', inset );

                    element.setAttribute( 'y1', height - inset );

                    element.setAttribute( 'x2', width - inset );

                    element.setAttribute( 'y2', height - inset );
                }

                if (edge === 'left') {
                    element.setAttribute( 'x1', inset );

                    element.setAttribute( 'y1', inset );

                    element.setAttribute( 'x2', inset );

                    element.setAttribute( 'y2', height - inset );
                }

                if (edge === 'right') {
                    element.setAttribute( 'x1', width - inset );

                    element.setAttribute( 'y1', inset );

                    element.setAttribute( 'x2', width - inset );

                    element.setAttribute( 'y2', height - inset );
                }
            }
        );
    }

    return { shapeEdges, isMotionEffect, addCheapRect, addCheapEdge, addCheapBase, addAmbient, svgElement, motionEdges, addMotionStroke, buildMotionSvg, updateSvgGeometry };
}
