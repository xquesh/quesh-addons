function safeNumber(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function safeColor(value, fallback) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
}

export function chanceCss(settings) {
    const positions = {
        'top-right': 'top:1px;right:1px;', 'top-left': 'top:1px;left:1px;',
        'bottom-right': 'bottom:1px;right:1px;', 'bottom-left': 'bottom:1px;left:1px;'
    };
    const shadows = {
        none: 'none', soft: '0 1px 2px #000,0 0 3px #000',
        outline: '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 3px #000'
    };
    const colors = settings.customColors === false
        ? { none: '#ffffff', low: '#ffffff', mid: '#ffffff', high: '#ffffff' }
        : {
            none: safeColor(settings.colorNone, '#b30000'), low: safeColor(settings.colorLow, '#c25a00'),
            mid: safeColor(settings.colorMid, '#bd9700'), high: safeColor(settings.colorHigh, '#0ba800')
        };
    const family = ['Arial', 'Verdana', 'Tahoma', 'Georgia', 'monospace'].includes(settings.fontFamily) ? settings.fontFamily : 'Arial';
    return `
.qaddons-loot-chance-anchor{position:relative!important}
.qaddons-loot-chance{position:absolute;${positions[settings.position] || positions['top-right']}z-index:40;padding:0;border:0;background:transparent;pointer-events:auto;color:#fff;font-family:${family};font-size:${safeNumber(settings.fontSize, 12, 8, 20)}px;line-height:1;font-weight:${settings.bold === false ? 400 : 700};text-shadow:${shadows[settings.shadow] || shadows.outline};cursor:help;white-space:nowrap}
.qaddons-loot-chance[data-level="none"]{color:${colors.none}}
.qaddons-loot-chance[data-level="low"]{color:${colors.low}}
.qaddons-loot-chance[data-level="mid"]{color:${colors.mid}}
.qaddons-loot-chance[data-level="high"]{color:${colors.high}}
`;
}
