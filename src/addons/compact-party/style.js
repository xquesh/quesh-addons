function number(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

export function compactPartyCss(settings) {
    const rowHeight = number(settings.rowHeight, 18, 16, 28);
    const fontSize = number(settings.fontSize, 9, 8, 12);
    const summaryLeft = settings.hideAvatars === false ? 34 : 4;
    const avatar = settings.hideAvatars === false ? `
.party .party__list .party-member .avatar{display:flex!important;position:absolute!important;left:1px!important;top:0!important;width:32px!important;height:${rowHeight}px!important;overflow:hidden!important;z-index:3!important}
.party .party__list .party-member .img-avatar-correct{transform:translateY(-4px) scale(.72);transform-origin:top left}` : `
.party .party__list .party-member .avatar{display:none!important}`;
    return `
.party .party__list .party-member{position:relative!important;box-sizing:border-box!important;height:${rowHeight}px!important;min-height:${rowHeight}px!important;margin:1px 0!important;padding:0!important;font-size:${fontSize}px!important;line-height:${rowHeight}px!important;overflow:hidden!important}
.party .party__list .party-member>.table-wrapper{display:block!important;width:100%!important;height:100%!important;min-height:0!important}
${avatar}
.party .party__list .party-member .info-wrapper{position:static!important;width:100%!important;height:100%!important;padding:0!important;margin:0!important}
.party .party__list .party-member .top-row{display:none!important}
.party .party__list .party-member .bottom-row{position:absolute!important;inset:0 2px 0 auto!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;width:auto!important;height:${rowHeight}px!important;margin:0!important;padding:0!important;z-index:5!important;line-height:${rowHeight}px!important}
.party .party__list .party-member .bottom-row>.hp-percent,.party .party__list .party-member .bottom-row>.hp-points{display:none!important}
.party .party__list .party-member .info-icons{position:static!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;width:auto!important;height:${Math.min(16, rowHeight)}px!important;margin:0!important;padding:0!important}
.party .party__list .party-member .info-icons>div{margin:0!important;transform:scale(.72);transform-origin:center!important}
.party .party__list .party-member .qaddons-party-summary{position:absolute!important;left:${summaryLeft}px!important;right:34px!important;top:0!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important;align-items:center!important;height:${rowHeight}px!important;gap:3px!important;z-index:4!important;font-size:${fontSize}px!important;line-height:${rowHeight}px!important;pointer-events:none!important;white-space:nowrap!important}
.party .party__list .party-member .qaddons-party-left{grid-column:1!important;display:flex!important;align-items:center!important;min-width:0!important;gap:3px!important;overflow:hidden!important}
.party .party__list .party-member .qaddons-party-nick{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;text-align:left!important}
.party .party__list .party-member .qaddons-party-info{flex:none!important;text-align:left!important}
.party .party__list .party-member .qaddons-party-hp{grid-column:2!important;text-align:center!important;font-weight:700!important}
.party .party__list .party-member .member-hp-bar,.party .party__list .party-member .border-blink{height:100%!important}
.party .party__list{padding:0 2px!important}
.party .party__professions{margin-top:2px!important;font-size:9px!important;line-height:12px!important}
.party{height:auto!important;min-height:0!important}
.party .party__container,.party .party__container .tabs-content-option.active,.party .party__content{flex:0 0 auto!important;height:auto!important;min-height:0!important}
.party .party__content .scroll-wrapper{flex:0 0 auto!important;height:auto!important;max-height:${10 * (rowHeight + 1)}px!important}
.party .party__content .scroll-wrapper .scroll-pane{height:auto!important;max-height:${10 * (rowHeight + 1)}px!important}
`;
}
