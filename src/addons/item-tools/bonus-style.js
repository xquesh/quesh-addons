export const BONUS_FONTS = { Arial: 'Arial, sans-serif', Verdana: 'Verdana, sans-serif', Tahoma: 'Tahoma, sans-serif', Georgia: 'Georgia, serif', monospace: 'monospace' };
export const bonusDefaults = { bonusFont: 'Arial', bonusSize: 9, bonusColor: '#ffffff', bonusBold: true, bonusItalic: false, bonusShadow: 'soft', bonusShadowColor: '#000000', bonusShadowStrength: 3 };
const SHADOW_TYPES = new Set(['none', 'soft', 'outline', 'glow']);
export function bonusStyle(settings) {
    const size = Number(settings.bonusSize ?? 9);
    return {
        family: BONUS_FONTS[settings.bonusFont] && Object.hasOwn(BONUS_FONTS, settings.bonusFont) ? BONUS_FONTS[settings.bonusFont] : BONUS_FONTS.Arial,
        size: Number.isFinite(size) ? Math.min(18, Math.max(7, Math.round(size))) : 9,
        color: /^#[0-9a-f]{6}$/i.test(settings.bonusColor || '') ? settings.bonusColor : '#ffffff',
        weight: (settings.bonusBold ?? true) ? 'bold' : 'normal', italic: settings.bonusItalic === true ? 'italic' : 'normal',
        shadow: SHADOW_TYPES.has(settings.bonusShadow) ? settings.bonusShadow : 'soft',
        shadowColor: /^#[0-9a-f]{6}$/i.test(settings.bonusShadowColor || '') ? settings.bonusShadowColor : '#000000',
        shadowStrength: Number.isFinite(Number(settings.bonusShadowStrength)) ? Math.min(12, Math.max(0, Math.round(Number(settings.bonusShadowStrength)))) : 3
    };
}
export function bonusFont(style) { return `${style.italic} ${style.weight} ${style.size}px ${style.family}`; }
export function bonusShadow(style) {
    const strength = Math.max(0, style.shadowStrength);
    if (style.shadow === 'none') return 'none';
    if (style.shadow === 'soft') return `0 1px ${Math.max(1, strength)}px ${style.shadowColor}`;
    if (style.shadow === 'glow') return `0 0 ${Math.max(1, strength)}px ${style.shadowColor},0 0 ${Math.max(2, strength * 2)}px ${style.shadowColor}`;
    return `-1px -1px 0 ${style.shadowColor},1px -1px 0 ${style.shadowColor},-1px 1px 0 ${style.shadowColor},1px 1px 0 ${style.shadowColor}`;
}
export function bonusCss(style) { return `font:${style.italic} ${style.weight} ${style.size}px/${style.size + 2}px ${style.family}!important;color:${style.color}!important;text-shadow:${bonusShadow(style)}!important;`; }
