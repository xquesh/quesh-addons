import { defaults } from './defaults.js';
import { renderSettings } from './settings-ui.js';
import { normalize, typographyCss } from './typography.js';

function apply(ctx) {
    const { bottom } = normalize(ctx.settings);
    const selectors = ['.mAlert-layer .big-messages', '.mAlert-layer .big-messages-light-mode', '.alerts-layer > .big-messages'];
    const typography = typographyCss(ctx.settings);
    ctx.styles.set('position', `
        ${selectors.join(',\n')} {
            top: auto !important;
            bottom: ${bottom}px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            text-align: center !important;
        }
        ${typography ? `${selectors.flatMap(selector => [selector, `${selector} *`]).join(',\n')} { ${typography} }` : ''}
    `);
}

export function createNotificationPosition() {
    return {
        id: 'notification-position', name: 'Pozycja powiadomień',
        description: 'Zmienia pozycję, czcionkę, rozmiar i wygląd komunikatów tekstowych gry.',
        defaultEnabled: true, defaults,
        enable: apply,
        disable: ctx => ctx.styles.remove('position'),
        destroy: ctx => ctx?.styles.clear(),
        onSettingsChange: apply, renderSettings
    };
}
