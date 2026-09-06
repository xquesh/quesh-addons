import { migrateLayerSettings } from '../addons/legendary-notificator/migration.js';

export const LEGACY_STORAGE_KEYS = [
    'legendary_notificator_v595_settings',
    'legendary_notificator_v594_settings',
    'legendary_notificator_v593_settings',
    'legendary_notificator_v580_settings',
    'legendary_notificator_v572_settings',
    'legendary_notificator_v571_settings',
    'legendary_notificator_v570_settings'
];

function readObject(storage, key) {
    try {
        const value = JSON.parse(storage.getItem(key));
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    } catch { return null; }
}

export function importLegacy(storage) {
    const core = {};
    const panel = readObject(storage, 'legendary_notificator_v580_panel_pos');
    const button = readObject(storage, 'legendary_notificator_v580_button_pos');
    if (Number.isFinite(panel?.x)) core.panelX = panel.x;
    if (Number.isFinite(panel?.y)) core.panelY = panel.y;
    if (Number.isFinite(button?.right)) core.buttonRight = button.right;
    if (Number.isFinite(button?.top)) core.buttonTop = button.top;
    core.legendaryTab = storage.getItem('legendary_notificator_panel_tab') || 'general';

    const addons = {};
    for (const [index, key] of LEGACY_STORAGE_KEYS.entries()) {
        const raw = readObject(storage, key);
        if (!raw) continue;
        const migrated = migrateLayerSettings(raw, index > 0);
        if (index > 0) migrated.multiLayerEnabled = true;
        const { enabled, notificationBottomEnabled, notificationBottomOffset, ...settings } = migrated;
        const bottom = Number(notificationBottomOffset ?? 75);
        addons['legendary-notificator'] = { enabled: enabled !== false, settings };
        addons['notification-position'] = {
            enabled: Boolean(notificationBottomEnabled),
            settings: { bottom: Number.isFinite(bottom) ? Math.max(0, Math.min(300, bottom)) : 75 }
        };
        break;
    }
    return { version: 1, core, addons };
}
