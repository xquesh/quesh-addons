import { PERFORMANCE_PROFILES } from './performance.js';

export function createHelpers(state, ctx, runtime) {
    function getPerformanceProfile() {
        return ( PERFORMANCE_PROFILES[ state.settings.performanceMode ] || PERFORMANCE_PROFILES.balanced );
    }

    function clamp(value, min, max) {
        value = Number(value);

        if (!Number.isFinite(value)) {
            return min;
        }

        return Math.max( min, Math.min(max, value) );
    }

    function isVisible(element) {
        if ( !element || !element.isConnected ) {
            return false;
        }

        const rect = element.getBoundingClientRect();

        if ( rect.width <= 1 || rect.height <= 0 ) {
            return false;
        }

        const style = getComputedStyle(element);

        return ( style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 );
    }

    function getElementId(element) {
        let id = state.elementIds.get(element);

        if (!id) {
            id = state.nextElementId++;

            state.elementIds.set( element, id );
        }

        return id;
    }

    function hexToRgb(hex) {
        let value = String(hex || '') .replace('#', '') .trim();

        if (value.length === 3) {
            value = value .split('') .map(c => c + c) .join('');
        }

        if ( !/^[0-9a-f]{6}$/i.test(value) ) {
            return {
                r: 66, g: 238, b: 231
            };
        }

        return {
            r: parseInt( value.slice(0, 2), 16 ),

            g: parseInt( value.slice(2, 4), 16 ),

            b: parseInt( value.slice(4, 6), 16 )
        };
    }

    function rgba(hex, alpha) {
        const c = hexToRgb(hex);

        return ( `rgba(${c.r},${c.g},${c.b},${clamp(alpha, 0, 1)})` );
    }

    function effectiveBlur(value) {
        return Math.max( 1, Math.round( Number(value) * getPerformanceProfile() .blurScale ) );
    }

    return { getPerformanceProfile, clamp, isVisible, getElementId, hexToRgb, rgba, effectiveBlur };
}
