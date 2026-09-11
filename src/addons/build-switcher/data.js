export const DEFAULTS = Object.freeze({
    windowOpen: true,
    minimalist: false,
    disableTips: false,
    grayHidden: true,
    columns: 3,
    hiddenBuilds: {}
});

export function normalizeBuilds(source) {
    if (!source || typeof source !== 'object') return [];
    const entries = source instanceof Map ? [...source.entries()] : Object.entries(source);
    return entries.map(([key, value]) => {
        const build = value && typeof value === 'object' ? value : {};
        const id = Number(build.id ?? key);
        if (!Number.isFinite(id) || id < 1) return null;
        const rawName = String(build.name || `Zestaw ${id}`);
        const name = /^\[SET\.\d+\]$/.test(rawName) ? `Zestaw ${id}` : rawName;
        return { ...build, id, name };
    }).filter(Boolean).sort((a, b) => a.id - b.id);
}

function engine(page) {
    try { return page.getEngine?.() || page.Engine; } catch { return page.Engine; }
}

export function readBuildState(page) {
    try {
        const manager = engine(page)?.buildsManager?.getBuildsCommons?.();
        const detailed = manager?.getCrazyDataToMatchmaking?.();
        const names = manager?.getBuildsName?.();
        return {
            builds: normalizeBuilds(detailed && Object.keys(detailed).length ? detailed : names),
            currentId: Number(manager?.getCurrentId?.()) || 0,
            offers: []
        };
    } catch { return { builds: [], currentId: 0, offers: [] }; }
}

export function mergeBuildPacket(state, packet) {
    const data = packet?.builds;
    if (!data || typeof data !== 'object') return false;
    const action = String(data.action || '').toUpperCase();
    if (action === 'INIT' || Array.isArray(data.list) && !state.builds.length) {
        state.builds = normalizeBuilds(data.list);
        state.offers = Array.isArray(data.listToBuy) ? data.listToBuy.slice() : state.offers;
    } else if (action === 'UPDATE_DATA') {
        const byId = new Map(state.builds.map(build => [build.id, build]));
        for (const patch of data.list || []) {
            const id = Number(patch?.id); if (id) byId.set(id, { ...(byId.get(id) || {}), ...patch, id });
        }
        state.builds = normalizeBuilds(Object.fromEntries(byId));
    } else if (action === 'BUY_BUILD') {
        const byId = new Map(state.builds.map(build => [build.id, build]));
        for (const build of normalizeBuilds(data.list)) byId.set(build.id, build);
        state.builds = normalizeBuilds(Object.fromEntries(byId));
        state.offers = state.offers.slice(1);
    }
    if (data.currentId != null || data.current_id != null) state.currentId = Number(data.currentId ?? data.current_id) || 0;
    return true;
}

export function buildItemIds(build) {
    if (Array.isArray(build?.items)) return build.items.map(Number).filter(Boolean);
    if (build?.items && typeof build.items === 'object') return Object.values(build.items).map(value => Number(value?.id ?? value)).filter(Boolean);
    return [];
}
