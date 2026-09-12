export function teleportLabelsCss(settings) {
    const size = Math.max(7, Math.min(14, Math.round(Number(settings.fontSize) || 9)));
    const color = /^#[0-9a-f]{6}$/i.test(settings.color || '') ? settings.color : '#ffffff';
    const shadowColor = /^#[0-9a-f]{6}$/i.test(settings.shadowColor || '') ? settings.shadowColor : '#000000';
    const strength = Math.max(0, Math.min(12, Math.round(Number(settings.shadowStrength) || 0)));
    const shadow = settings.shadow === 'none' ? 'none' : settings.shadow === 'soft' ? `0 1px ${Math.max(1, strength)}px ${shadowColor}`
        : settings.shadow === 'glow' ? `0 0 ${Math.max(1, strength)}px ${shadowColor},0 0 ${Math.max(2, strength * 2)}px ${shadowColor}`
            : `-1px -1px 0 ${shadowColor},1px -1px 0 ${shadowColor},-1px 1px 0 ${shadowColor},1px 1px 0 ${shadowColor}`;
    return `
.qaddons-teleport-label{position:absolute!important;top:0!important;bottom:auto!important;left:50%;z-index:24;max-width:64px;transform:translateX(-50%);overflow:visible;pointer-events:none!important;color:${color}!important;background:transparent!important;border:0!important;padding:0!important;font:${settings.bold === false ? 'normal' : 'bold'} ${size}px/${size + 1}px Arial,sans-serif!important;text-align:center!important;white-space:nowrap;text-shadow:${shadow}!important;}
`;
}
