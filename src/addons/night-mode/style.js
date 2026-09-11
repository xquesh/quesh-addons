function number(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function color(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#000000';
}

export function normalizeNightSettings(settings = {}) {
    return {
        strength: number(settings.strength, 45, 0, 85),
        color: color(settings.color),
        vignette: settings.vignette !== false
    };
}

export function createMapBrightnessDrawable(page, getSettings) {
    let active = true;
    return {
        get rx() { return Number(page.Engine?.hero?.d?.x ?? page.Engine?.hero?.x) || 0; },
        get ry() { return Number(page.Engine?.hero?.d?.y ?? page.Engine?.hero?.y) || 0; },
        disable() { active = false; },
        draw(context) {
            if (!active) return;
            const settings = normalizeNightSettings(getSettings());
            if (settings.strength <= 0) return;
            const size = page.Engine?.getCanvasViewSize?.() || {};
            const width = Number(size.width) || Number(context.canvas?.width) || 0;
            const height = Number(size.height) || Number(context.canvas?.height) || 0;
            if (width <= 0 || height <= 0) return;
            context.save();
            context.globalAlpha = settings.strength / 100;
            context.fillStyle = settings.color;
            context.fillRect(0, 0, width, height);
            if (settings.vignette && typeof context.createRadialGradient === 'function') {
                const radius = Math.max(width, height) * 0.7;
                const gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, radius);
                gradient.addColorStop(0, 'rgba(0,0,0,0)');
                gradient.addColorStop(1, 'rgba(0,0,0,.45)');
                context.fillStyle = gradient;
                context.fillRect(0, 0, width, height);
            }
            context.restore();
        },
        getOrder() { return 1; }
    };
}
