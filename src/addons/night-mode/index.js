import { createMapBrightnessDrawable } from './style.js';

const DEFAULTS = { strength: 45, color: '#000000', vignette: true };

function startNightMode(ctx) {
    const page = ctx.game.page;
    const drawable = createMapBrightnessDrawable(page, () => ctx.settings);
    const addDrawable = () => page.Engine?.renderer?.add?.(drawable);
    const api = page.API;
    addDrawable();
    api?.addCallbackToEvent?.('call_draw_add_to_renderer', addDrawable);
    ctx.scheduler.cleanup(() => {
        drawable.disable();
        api?.removeCallbackFromEvent?.('call_draw_add_to_renderer', addDrawable);
    });
}

export function createNightMode() {
    return {
        id: 'night-mode', name: 'Tryb nocny',
        description: 'Przyciemnia samą mapę, pozostawiając interfejs gry czytelny.',
        defaultEnabled: false, defaults: DEFAULTS,
        enable: startNightMode,
        onSettingsChange: ctx => ctx.events.emit('nightModeChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section');
            section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Tryb nocny</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Warstwa znajduje się wyłącznie nad mapą. Nie zasłania okien, czatu ani przycisków gry.</p>
                <div class="ln-grid">
                    <label class="ln-field">Przyciemnienie (0–85%)<input type="range" min="0" max="85" step="1" data-setting="strength"><output data-strength></output></label>
                    <label class="ln-field">Kolor nocy<input type="color" data-setting="color"></label>
                    <label class="ln-switch"><input type="checkbox" data-setting="vignette">Delikatna winieta na krawędziach</label>
                </div>`;
            const enabled = section.querySelector('[data-enabled]');
            const sync = () => {
                enabled.checked = ctx.enabled;
                for (const input of section.querySelectorAll('[data-setting]')) {
                    const current = ctx.settings[input.dataset.setting];
                    if (input.type === 'checkbox') input.checked = current !== false; else input.value = current;
                }
                section.querySelector('[data-strength]').textContent = `${ctx.settings.strength}%`;
            };
            sync();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            for (const input of section.querySelectorAll('[data-setting]')) {
                ctx.scheduler.listen(input, input.type === 'range' ? 'input' : 'change', () => {
                    ctx.changeSettings({ [input.dataset.setting]: input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value });
                    sync();
                });
            }
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.container.append(section);
        }
    };
}
