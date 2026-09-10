export const BONUS_FONTS = { Arial: 'Arial, sans-serif', Verdana: 'Verdana, sans-serif', Tahoma: 'Tahoma, sans-serif', Georgia: 'Georgia, serif', monospace: 'monospace' };
export const bonusDefaults = { bonusFont: 'Arial', bonusSize: 9, bonusColor: '#ffffff', bonusBold: true, bonusItalic: false, bonusShadow: 'soft' };
const SHADOWS = { none: 'none', soft: '0 1px 3px #000', outline: '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000' };
export function bonusStyle(settings) {
    const size = Number(settings.bonusSize ?? 9);
    return {
        family: BONUS_FONTS[settings.bonusFont] && Object.hasOwn(BONUS_FONTS, settings.bonusFont) ? BONUS_FONTS[settings.bonusFont] : BONUS_FONTS.Arial,
        size: Number.isFinite(size) ? Math.min(18, Math.max(7, Math.round(size))) : 9,
        color: /^#[0-9a-f]{6}$/i.test(settings.bonusColor || '') ? settings.bonusColor : '#ffffff',
        weight: (settings.bonusBold ?? true) ? 'bold' : 'normal', italic: settings.bonusItalic === true ? 'italic' : 'normal',
        shadow: Object.hasOwn(SHADOWS, settings.bonusShadow) ? settings.bonusShadow : 'soft'
    };
}
export function bonusFont(style) { return `${style.italic} ${style.weight} ${style.size}px ${style.family}`; }
export function bonusCss(style) { return `font:${style.italic} ${style.weight} ${style.size}px/${style.size + 2}px ${style.family}!important;color:${style.color}!important;text-shadow:${SHADOWS[style.shadow]}!important;`; }
