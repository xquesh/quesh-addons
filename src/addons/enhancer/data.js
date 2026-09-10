export const TYPE_GROUPS = {
    armor: [8, 9, 10, 11, 14],
    jewelry: [12, 13],
    weapon: [1, 2, 3, 4, 5, 6, 7, 29]
};

export const ITEM_TYPES = {
    oneHand: [1], twoHand: [2], oneHalf: [3], distance: [4], help: [5], wand: [6], orb: [7],
    armor: [8], helmet: [9], boots: [10], gloves: [11], ring: [12], necklace: [13], shield: [14], arrows: [29]
};

export const DEFAULTS = {
    showWindowButton: true, rememberActive: false, active: false, mode: 'regular', bufferSize: 25,
    highlight: false, messages: true, hotkey: 'F9',
    rarity: { enabled: true, common: true, unique: false, heroic: false },
    types: Object.fromEntries(['oneHand','twoHand','oneHalf','distance','help','wand','orb','armor','helmet','boots','gloves','ring','necklace','shield','arrows'].map(key => [key, true])),
    targets: {}
};

export function parseStats(item) {
    if (item?._cachedStats) return item._cachedStats;
    const result = {};
    for (const part of String(item?.stat || '').split(';')) {
        const [key, ...rest] = part.split('=');
        if (key) result[key] = rest.length ? rest.join('=') : true;
    }
    return result;
}

export function itemEligible(item, settings, excluded = new Set()) {
    const stats = parseStats(item);
    if (!item || excluded.has(Number(item.id)) || Number(item.st) !== 0) return false;
    if (stats.binds != null || stats.soulbound != null || stats.permbound != null || 'artisan_worthless' in stats) return false;
    const allowedRarity = settings.rarity?.enabled === false ? ['common'] : ['common','unique','heroic'].filter(key => settings.rarity?.[key]);
    if (!allowedRarity.includes(stats.rarity || 'common')) return false;
    const allowedTypes = Object.entries(ITEM_TYPES).flatMap(([key, values]) => settings.types?.[key] === false ? [] : values);
    return allowedTypes.includes(Number(item.cl));
}
