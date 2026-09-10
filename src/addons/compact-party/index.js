import { compactPartyCss } from './style.js';

const DEFAULTS = { hideAvatars: true, showHpPoints: false, rowHeight: 23, fontSize: 11 };

function apply(ctx) {
    ctx.styles.set('layout', compactPartyCss(ctx.settings));
}

export function createCompactParty() {
    return {
        id: 'compact-party', name: 'Kompaktowa grupa',
        description: 'Układa każdego członka grupy w jednym wierszu i zmniejsza wysokość okna drużyny.',
        defaultEnabled: true, defaults: DEFAULTS,
        enable: apply, onSettingsChange: apply,
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Kompaktowa grupa</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Nick, poziom i profesja, procent życia oraz ikony akcji mieszczą się w jednym wierszu. Kolory i pasek życia pozostają z gry.</p>
                <div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="hideAvatars">Ukryj grafiki postaci</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="showHpPoints">Pokaż dokładne punkty życia</label>
                    <label class="ln-field">Wysokość wiersza (20–32 px)<input type="range" min="20" max="32" step="1" data-setting="rowHeight"><output data-row-height></output></label>
                    <label class="ln-field">Rozmiar tekstu (9–14 px)<input type="range" min="9" max="14" step="1" data-setting="fontSize"><output data-font-size></output></label>
                </div><p>Podsumowanie profesji pod listą pozostaje widoczne.</p>`;
            const enabled = section.querySelector('[data-enabled]');
            const sync = () => {
                enabled.checked = ctx.enabled;
                for (const input of section.querySelectorAll('[data-setting]')) {
                    const value = ctx.settings[input.dataset.setting];
                    if (input.type === 'checkbox') input.checked = Boolean(value); else input.value = value;
                }
                section.querySelector('[data-row-height]').textContent = `${ctx.settings.rowHeight}px`;
                section.querySelector('[data-font-size]').textContent = `${ctx.settings.fontSize}px`;
            };
            sync();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            for (const input of section.querySelectorAll('[data-setting]')) ctx.scheduler.listen(input, input.type === 'range' ? 'input' : 'change', () => {
                ctx.changeSettings({ [input.dataset.setting]: input.type === 'checkbox' ? input.checked : Number(input.value) }); sync();
            });
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.container.append(section);
        }
    };
}
