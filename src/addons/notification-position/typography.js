import { defaults } from './defaults.js';

export const FONTS = {
    game: { label: 'Czcionka gry', css: '' },
    arial: { label: 'Arial', css: 'Arial, sans-serif' },
    verdana: { label: 'Verdana', css: 'Verdana, sans-serif' },
    tahoma: { label: 'Tahoma', css: 'Tahoma, sans-serif' },
    trebuchet: { label: 'Trebuchet MS', css: '"Trebuchet MS", sans-serif' },
    georgia: { label: 'Georgia', css: 'Georgia, serif' },
    courier: { label: 'Courier New', css: '"Courier New", monospace' }
};
const SHADOWS = { game: '', none: 'none', soft: '0 1px 4px #000', outline: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' };

export function normalize(settings) {
    const number = (key, min, max) => {
        const value = Number(settings[key] ?? defaults[key]);
        return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : defaults[key];
    };
    return {
        bottom: number('bottom', 0, 300),
        customTypography: settings.customTypography === true,
        fontFamily: Object.hasOwn(FONTS, settings.fontFamily) ? settings.fontFamily : 'game',
        fontSize: number('fontSize', 10, 40),
        fontWeight: ['game', '400', '600', '700', '900'].includes(settings.fontWeight) ? settings.fontWeight : 'game',
        italic: settings.italic === true,
        letterSpacing: number('letterSpacing', -1, 5),
        lineHeight: number('lineHeight', 1, 2),
        customColor: settings.customColor === true,
        color: /^#[0-9a-f]{6}$/i.test(settings.color) ? settings.color : defaults.color,
        shadow: Object.hasOwn(SHADOWS, settings.shadow) ? settings.shadow : 'game'
    };
}

export function typographyCss(settings) {
    const value = normalize(settings);
    if (!value.customTypography) return '';
    return [
        FONTS[value.fontFamily].css && `font-family: ${FONTS[value.fontFamily].css}`,
        `font-size: ${value.fontSize}px`,
        value.fontWeight !== 'game' && `font-weight: ${value.fontWeight}`,
        `font-style: ${value.italic ? 'italic' : 'normal'}`,
        `letter-spacing: ${value.letterSpacing}px`,
        `line-height: ${value.lineHeight}`,
        value.customColor && `color: ${value.color}`,
        SHADOWS[value.shadow] && `text-shadow: ${SHADOWS[value.shadow]}`
    ].filter(Boolean).map(property => `${property} !important;`).join('\n');
}
