import { DEFAULTS } from './data.js';
import { startBuildSwitcher } from './runtime.js';

export function createBuildSwitcher() {
    return {
        id: 'build-switcher', name: 'Zmieniacz zestawów',
        description: 'Kompaktowe okno do przełączania zestawów ekwipunku, ich podglądu, nazywania i ukrywania.',
        defaultEnabled: true, defaults: DEFAULTS, enable: startBuildSwitcher,
        onSettingsChange: ctx => ctx.events.emit('buildSwitcherChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Zmieniacz zestawów</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Kliknij zestaw, aby go włączyć. PPM otwiera zmianę nazwy, podgląd i ukrywanie zestawu.</p><div class="ln-grid">
                <label class="ln-switch"><input type="checkbox" data-setting="windowOpen">Okno widoczne po uruchomieniu</label>
                <label class="ln-switch"><input type="checkbox" data-setting="minimalist">Tryb minimalistyczny</label>
                <label class="ln-switch"><input type="checkbox" data-setting="disableTips">Wyłącz podpowiedzi</label>
                <label class="ln-switch"><input type="checkbox" data-setting="grayHidden">Wyszarz zamiast ukrywać</label>
                <label class="ln-field">Liczba kolumn<select data-setting="columns">${[1,2,3,4,5].map(value => `<option value="${value}">${value}</option>`).join('')}</select></label></div>`;
            const enabled = section.querySelector('[data-enabled]');
            function sync() {
                enabled.checked = ctx.enabled;
                section.querySelectorAll('[data-setting]').forEach(input => { const value = ctx.settings[input.dataset.setting]; if (input.type === 'checkbox') input.checked = Boolean(value); else input.value = value; input.disabled = !ctx.enabled; });
            }
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            section.querySelectorAll('[data-setting]').forEach(input => ctx.scheduler.listen(input, 'change', () => ctx.changeSettings({ [input.dataset.setting]: input.type === 'checkbox' ? input.checked : Number(input.value) })));
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            sync(); ctx.container.append(section);
        }
    };
}
