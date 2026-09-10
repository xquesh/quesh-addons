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
.qaddons-loot-test{position:fixed!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:230px!important;height:118px!important;z-index:10020!important;box-sizing:border-box!important;padding:8px!important;border:1px solid #fff!important;background:#050505!important;color:#fff!important;font:11px Arial,sans-serif!important;box-shadow:0 0 0 1px #333,0 6px 25px #000!important}
.qaddons-loot-test-title{height:18px!important;border-bottom:1px solid #555!important;font-weight:700!important;line-height:15px!important;text-align:left!important}
.qaddons-loot-test-close{position:absolute!important;right:5px!important;top:3px!important;width:20px!important;height:20px!important;padding:0!important;border:0!important;background:transparent!important;color:#fff!important;font-size:18px!important;line-height:18px!important;cursor:pointer!important}
.qaddons-loot-test .loot-window{width:auto!important;height:auto!important;margin:8px 0 0!important;text-align:center!important}
.qaddons-loot-test .loot-item-wrapper{display:inline-flex!important;align-items:center!important;gap:8px!important;width:auto!important;height:48px!important;margin:0!important}
.qaddons-loot-test .item{position:relative!important;display:block!important;width:32px!important;height:32px!important;flex:none!important;border:2px solid #d5a526!important;background:radial-gradient(circle,#6a5218,#171105)!important;box-shadow:0 0 6px #c99218!important}
.qaddons-loot-test-label{color:#ddd!important;white-space:nowrap!important}
`;
}
