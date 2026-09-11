import { startChatAutoscroll } from './runtime.js';

const DEFAULTS = { interval: 250 };

export function createChatAutoscroll() {
    return {
        id: 'chat-autoscroll', name: 'Czat zawsze na dole',
        description: 'Stale przewija czat do najnowszej wiadomości i naprawia zatrzymany pasek przewijania.',
        defaultEnabled: true, defaults: DEFAULTS,
        enable: startChatAutoscroll,
        onSettingsChange: ctx => ctx.events.emit('chatAutoscrollChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section');
            section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Czat zawsze na dole</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Dodatek używa natywnego przewijania czatu Margonem i dodatkowo pilnuje położenia paska. Ręczne przewinięcie w górę zostanie cofnięte przy następnym sprawdzeniu.</p>
                <div class="ln-grid"><label class="ln-field">Częstotliwość sprawdzania<select data-setting="interval">
                    <option value="100">Bardzo często — 0,1 s</option><option value="250">Często — 0,25 s</option>
                    <option value="500">Normalnie — 0,5 s</option><option value="1000">Rzadziej — 1 s</option>
                </select></label></div>`;
            const enabled = section.querySelector('[data-enabled]');
            const frequency = section.querySelector('[data-setting="interval"]');
            const sync = () => {
                enabled.checked = ctx.enabled;
                frequency.value = String([100, 250, 500, 1000].includes(Number(ctx.settings.interval)) ? ctx.settings.interval : 250);
            };
            sync();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            ctx.scheduler.listen(frequency, 'change', () => ctx.changeSettings({ interval: Number(frequency.value) }));
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.container.append(section);
        }
    };
}
