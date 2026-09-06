export const IDS = {
    panel: 'mtk-legendary-settings',
    status: 'ln580-status', world: 'ln580-world'
};

export const SELECTORS = {
    lootRoot: '.loot-wnd', loot: '.c-window.loot-wnd .loot-window', card: '.c-window.loot-wnd .loot-item-wrapper',
    item: '.c-window.loot-wnd .item[data-item-type="t-leg"]', confirm: '.c-window.loot-wnd .accept-button > .button',
    canvas: '#GAME_CANVAS'
};

// Margonem / dodatki mogą oznaczyć legendę na dwa sposoby.
// Zostawiamy oba, żeby wariant okna kolosa nie wypadł z detekcji DOM.
export const LEGENDARY_DOM_SELECTOR = '.item[data-item-type="t-leg"], ' + '.item[data-frame-mania-rarity="legendary"]';
