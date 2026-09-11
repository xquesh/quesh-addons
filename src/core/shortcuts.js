export const SHORTCUTS = Object.freeze([
    { id: 'legendary-notificator', label: 'LEG' },
    { id: 'notification-position', label: 'POW' },
    { id: 'detector-global', label: 'WYK' },
    { id: 'item-tools', label: 'ITEM' },
    { id: 'relogger', label: 'REL' },
    { id: 'quick-seller', label: 'SPR', buttonId: 'qaddons-quick-seller', defaultVisible: true },
    { id: 'enhancer', label: 'UL', buttonId: 'qaddons-enhancer-toggle', defaultVisible: true },
    { id: 'loot-chances', label: '%' },
    { id: 'reminder', label: 'PRZ', buttonId: 'qaddons-reminder-button' },
    { id: 'compact-party', label: 'GR' },
    { id: 'night-mode', label: 'NOC' },
    { id: 'chat-autoscroll', label: 'CHAT' },
    { id: 'auto-abyss', label: 'OTCH' },
    { id: 'clan-online', label: 'KL', buttonId: 'qaddons-clan-online-button', defaultVisible: true },
    { id: 'pocket-berserk', label: 'BR', buttonId: 'qaddons-pocket-berserk', defaultVisible: true },
    { id: 'quick-group', label: 'SG', buttonId: 'qaddons-quick-group', defaultVisible: true },
    { id: 'teleport-labels', label: 'POD' },
    { id: 'garbage-truck', label: 'ŚM', buttonId: 'qaddons-garbage-truck-button' },
    { id: 'skill-set', label: 'UM', buttonId: 'qaddons-skill-set-button' },
    { id: 'build-switcher', label: 'ZES', buttonId: 'qaddons-build-switcher-button', defaultVisible: true }
]);

const BY_ID = new Map(SHORTCUTS.map(shortcut => [shortcut.id, shortcut]));
export function shortcutFor(id) { return BY_ID.get(id) || null; }
