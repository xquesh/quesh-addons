function number(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function color(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#07101c';
}

export function nightModeCss(settings) {
    const opacity = number(settings.strength, 45, 0, 85) / 100;
    const nightColor = color(settings.color);
    const background = settings.vignette === false
        ? nightColor
        : `radial-gradient(circle at center,transparent 30%,#000 125%),${nightColor}`;
    return `
.game-window-positioner .game-layer{position:relative!important;isolation:isolate!important}
.game-window-positioner .game-layer>.qaddons-night-mode{position:absolute!important;inset:0!important;z-index:1!important;display:block!important;background:${background}!important;opacity:${opacity}!important;pointer-events:none!important;user-select:none!important}
`;
}
