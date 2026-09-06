import { defaults } from './defaults.js';
import { renderSettings } from './settings-ui.js';

function apply(ctx) {
    const value = Number(ctx.settings.bottom);
    const bottom = Number.isFinite(value) ? Math.max(0, Math.min(300, value)) : defaults.bottom;
    ctx.styles.set('position', `
        .mAlert-layer .big-messages,
        .mAlert-layer .big-messages-light-mode,
        .alerts-layer > .big-messages {
            top: auto !important;
            bottom: ${bottom}px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            text-align: center !important;
        }
    `);
}

export function createNotificationPosition() {
    return {
        id: 'notification-position', name: 'Pozycja powiadomień',
        description: 'Zmienia pozycję komunikatów tekstowych gry.',
        defaultEnabled: true, defaults,
        enable: apply,
        disable: ctx => ctx.styles.remove('position'),
        destroy: ctx => ctx?.styles.clear(),
        onSettingsChange: apply, renderSettings
    };
}
