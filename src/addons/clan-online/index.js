import { DEFAULTS } from './data.js';
import { startClanOnline } from './runtime.js';

export function createClanOnline() {
    return {
        id: 'clan-online',
        name: 'Klanowicze online',
        description: 'Kompaktowa lista klanowiczów online z lokacją, wyszukiwaniem, sortowaniem i zapraszaniem do grupy.',
        defaultEnabled: true,
        defaults: DEFAULTS,
        enable: startClanOnline,
        onSettingsChange: ctx => ctx.events.emit('clanOnlineChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section');
            section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Klanowicze online</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Przycisk <strong>KL</strong> na górnej belce otwiera kompaktową listę osób online. Plus po prawej wysyła zaproszenie do grupy.</p>
                <h2>Lista</h2><div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="showButton">Pokaż przycisk KL</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="searchEnabled">Pokaż wyszukiwarkę</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="showCoordinates">Pokaż współrzędne</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="wrapLocation">Zawijaj długie nazwy lokacji</label>
                    <label class="ln-field">Rozmiar czcionki<input type="range" min="9" max="14" step="1" data-setting="fontSize"><output data-font-size></output></label>
                    <label class="ln-field">Odświeżanie<select data-setting="refreshInterval"><option value="7">Co 7 sekund</option><option value="10">Co 10 sekund</option><option value="15">Co 15 sekund</option><option value="30">Co 30 sekund</option><option value="60">Co minutę</option></select></label>
                    <label class="ln-field">Domyślne sortowanie<select data-setting="sort"><option value="level-desc">Poziom malejąco</option><option value="level-asc">Poziom rosnąco</option><option value="name">Nick A–Z</option><option value="profession">Profesja</option><option value="location">Lokacja</option></select></label>
                </div><p>Rozmiar okna zmienisz swobodnie, przeciągając jego prawy dolny róg.</p><div class="ln-grid"><button class="ln-btn" type="button" data-open>Otwórz listę</button><button class="ln-btn" type="button" data-refresh>Odśwież teraz</button><button class="ln-btn" type="button" data-reset>Przywróć pozycję i rozmiar</button></div>`;
            const enabled = section.querySelector('[data-enabled]');
            function sync() {
                enabled.checked = ctx.enabled;
                for (const input of section.querySelectorAll('[data-setting]')) {
                    const value = ctx.settings[input.dataset.setting];
                    if (input.type === 'checkbox') input.checked = Boolean(value); else input.value = String(value);
                }
                section.querySelector('[data-font-size]').textContent = `${ctx.settings.fontSize}px`;
                section.querySelectorAll('button').forEach(button => { button.disabled = !ctx.enabled; });
            }
            sync();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            for (const input of section.querySelectorAll('[data-setting]')) ctx.scheduler.listen(input, input.type === 'range' ? 'input' : 'change', () => {
                const value = input.type === 'checkbox' ? input.checked : input.type === 'range' || input.dataset.setting === 'refreshInterval' ? Number(input.value) : input.value;
                ctx.changeSettings({ [input.dataset.setting]: value });
                sync();
            });
            ctx.scheduler.listen(section.querySelector('[data-open]'), 'click', () => document.querySelector('#qaddons-clan-online-button')?.click());
            ctx.scheduler.listen(section.querySelector('[data-refresh]'), 'click', () => ctx.events.emit('clanOnlineRefresh'));
            ctx.scheduler.listen(section.querySelector('[data-reset]'), 'click', () => ctx.changeSettings({ windowX: null, windowY: 70, windowWidth: 370, windowHeight: 310 }));
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.container.append(section);
        }
    };
}
