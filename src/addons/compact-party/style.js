function number(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export function compactPartyCss(settings) {
    const rowHeight = number(settings.rowHeight, 23, 20, 32);
    const fontSize = number(settings.fontSize, 11, 9, 14);
    const avatar = settings.hideAvatars === false ? `
.party .party__list .party-member .avatar{display:flex!important;flex:0 0 32px!important;width:32px!important;height:${rowHeight}px!important;overflow:hidden!important}
.party .party__list .party-member .img-avatar-correct{transform:translateY(-2px) scale(.82);transform-origin:top left}` : `
.party .party__list .party-member .avatar{display:none!important}`;
    const hpPoints = settings.showHpPoints ? `
.party .party__list .party-member .hp-points{display:block!important;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}` : `
.party .party__list .party-member .hp-points{display:none!important}`;
    return `
.party .party__list .party-member{box-sizing:border-box!important;height:${rowHeight}px!important;min-height:${rowHeight}px!important;margin:1px 0!important;padding:0 3px!important;font-size:${fontSize}px!important;line-height:${rowHeight - 2}px!important;overflow:hidden!important}
.party .party__list .party-member>.table-wrapper{display:flex!important;align-items:center!important;width:100%!important;height:100%!important;min-height:0!important}
${avatar}
.party .party__list .party-member .info-wrapper{position:relative!important;inset:auto!important;display:flex!important;align-items:center!important;flex:1 1 auto!important;width:auto!important;min-width:0!important;height:100%!important;padding:0!important;margin:0!important}
.party .party__list .party-member .top-row,.party .party__list .party-member .bottom-row{position:static!important;inset:auto!important;display:flex!important;align-items:center!important;width:auto!important;height:100%!important;min-width:0!important;margin:0!important;padding:0!important;line-height:inherit!important}
.party .party__list .party-member .top-row{flex:1 1 auto!important;gap:5px!important}
.party .party__list .party-member .bottom-row{flex:0 0 auto!important;gap:4px!important}
.party .party__list .party-member .nickname{position:static!important;flex:1 1 auto!important;min-width:0!important;width:auto!important;margin:0!important;padding:0!important}
.party .party__list .party-member .nickname-text{display:block!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;line-height:inherit!important}
.party .party__list .party-member .character-info,.party .party__list .party-member .hp-percent{position:static!important;display:block!important;flex:none!important;width:auto!important;margin:0!important;padding:0!important;white-space:nowrap!important;line-height:inherit!important}
${hpPoints}
.party .party__list .party-member .info-icons{position:static!important;display:flex!important;align-items:center!important;flex:none!important;width:auto!important;height:${Math.min(18, rowHeight - 2)}px!important;margin:0!important;padding:0!important}
.party .party__list .party-member .info-icons>div{margin:0 1px!important;transform:scale(.82);transform-origin:center!important}
.party .party__list .party-member .member-hp-bar,.party .party__list .party-member .border-blink{height:100%!important}
.party .party__list{padding:0 2px!important}
.party .party__professions{margin-top:3px!important}
`;
}
