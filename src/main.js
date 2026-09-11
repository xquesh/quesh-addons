import { createScheduler } from './core/scheduler.js';
import { createEvents } from './core/events.js';
import { createStyles } from './core/styles.js';
import { createSettings } from './core/settings.js';
import { importLegacy } from './core/legacy-migration.js';
import { createGame } from './core/game.js';
import { createAddonManager } from './core/addon-manager.js';
import { createPanel } from './core/ui/panel.js';
import { createLegendaryNotificator } from './addons/legendary-notificator/index.js';
import { createNotificationPosition } from './addons/notification-position/index.js';
import { VERSION } from './version.js';
import { createDetectorGlobal } from './addons/detector-global/index.js';
import { createItemTools } from './addons/item-tools/index.js';
import { createRelogger } from './addons/relogger/index.js';
import { createQuickSeller } from './addons/quick-seller/index.js';
import { createEnhancer } from './addons/enhancer/index.js';
import { createLootChances } from './addons/loot-chances/index.js';
import { createReminder } from './addons/reminder/index.js';
import { createCompactParty } from './addons/compact-party/index.js';
import { createNightMode } from './addons/night-mode/index.js';
import { createChatAutoscroll } from './addons/chat-autoscroll/index.js';
import { createAutoAbyss } from './addons/auto-abyss/index.js';

const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
page.__MARGONEM_TOOLKIT__?.destroy?.();
page.__LegendaryNotificatorRuntime?.destroy?.();

const scheduler = createScheduler();
const events = createEvents();
const styles = createStyles(document);
const game = createGame(page, events, createScheduler());
let manager = null;
let panel = null;
let destroyed = false;

const toolkit = {
    version: VERSION,
    get addons() { return manager; },
    open: () => panel?.open(),
    destroy() {
        if (destroyed) return;
        destroyed = true;
        scheduler.destroy();
        panel?.destroy();
        manager?.destroy();
        game.destroy();
        events.destroy();
        styles.destroy();
        if (page.__MARGONEM_TOOLKIT__ === toolkit) delete page.__MARGONEM_TOOLKIT__;
    }
};
page.__MARGONEM_TOOLKIT__ = toolkit;

function start() {
    if (destroyed) return;
    try {
        const settings = createSettings(window.localStorage, importLegacy);
        panel = createPanel(settings, styles, createScheduler(), events);
        manager = createAddonManager({ settings, events, styles, game, ui: panel });
        manager.register(createLegendaryNotificator());
        manager.register(createNotificationPosition());
        manager.register(createDetectorGlobal());
        manager.register(createItemTools());
        manager.register(createRelogger());
        manager.register(createQuickSeller());
        manager.register(createEnhancer());
        manager.register(createLootChances());
        manager.register(createReminder());
        manager.register(createCompactParty());
        manager.register(createNightMode());
        manager.register(createChatAutoscroll());
        manager.register(createAutoAbyss());
        panel.connect(manager);
        manager.start();
        game.start();
    } catch (error) {
        toolkit.destroy();
        console.error('[QADDONS start]', error);
    }
}

if (document.readyState === 'loading') scheduler.listen(document, 'DOMContentLoaded', start, { once: true });
else start();
