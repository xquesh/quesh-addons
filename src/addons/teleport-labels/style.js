export function teleportLabelsCss(settings) {
    const size = Math.max(7, Math.min(14, Math.round(Number(settings.fontSize) || 9)));
    const color = /^#[0-9a-f]{6}$/i.test(settings.color || '') ? settings.color : '#ffffff';
    const shadow = settings.shadow === 'none' ? 'none' : settings.shadow === 'soft' ? '0 1px 3px #000' : '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000';
    const vertical = settings.position === 'top' ? 'top:0' : 'bottom:0';
    return `
.qaddons-teleport-label{position:absolute!important;${vertical};left:50%;z-index:24;max-width:64px;transform:translateX(-50%);overflow:visible;pointer-events:none!important;color:${color}!important;background:transparent!important;border:0!important;padding:0!important;font:${settings.bold === false ? 'normal' : 'bold'} ${size}px/${size + 1}px Arial,sans-serif!important;text-align:center!important;white-space:nowrap;text-shadow:${shadow}!important;}
`;
}
