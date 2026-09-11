import { DEFAULTS } from './data.js';
import { startReminder } from './runtime.js';

export function createReminder() {
    return {
        id: 'reminder', name: 'Przypominajka',
        description: 'Przypomina o kalendarzu eventowym, darmowych ofertach i nieaktywnych przedmiotach.',
        defaultEnabled: true, defaults: DEFAULTS,
        enable: startReminder,
        onSettingsChange: ctx => ctx.events.emit('reminderChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Przypominajka</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Dodatek sprawdza kalendarz eventowy, bezpłatne oferty w aktualnościach oraz przedmioty, które stały się bezpowrotnie nieaktywne. Gdy jest nagroda do odebrania, wyróżnione okno pozostaje na środku ekranu aż do jej odebrania.</p>
                <h2>Kalendarz eventowy</h2><div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="calendarEnabled">Powiadamiaj o nieodebranym dniu</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="calendarAutoClaim">Odbieraj automatycznie</label>
                </div><h2>Darmowe przedmioty</h2><div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="promotionsEnabled">Powiadamiaj o darmowych ofertach</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="promotionsAutoClaim">Odbieraj automatycznie</label>
                </div><h2>Nieaktywne przedmioty</h2><div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="expiredEnabled">Powiadamiaj o nieaktywnych przedmiotach</label>
                </div><p>Usuwanie jest zawsze ręczne i wymaga drugiego kliknięcia. Przedmiotu usuniętego w ten sposób nie można odzyskać.</p>
                <h2>Sprawdzanie</h2><div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="showButton">Pokaż mały przycisk PRZ</label>
                    <label class="ln-field">Odstęp automatycznego sprawdzania<select data-setting="checkInterval"><option value="60">1 minuta</option><option value="300">5 minut</option><option value="600">10 minut</option><option value="1800">30 minut</option></select></label>
                    <button class="ln-btn" type="button" data-check>Sprawdź teraz</button>
                </div><p data-status role="status">Gotowa.</p>`;
            const enabled = section.querySelector('[data-enabled]');
            const status = section.querySelector('[data-status]');
            const sync = () => {
                enabled.checked = ctx.enabled;
                for (const input of section.querySelectorAll('[data-setting]')) {
                    const value = ctx.settings[input.dataset.setting];
                    if (input.type === 'checkbox') input.checked = Boolean(value); else input.value = String(value);
                }
                section.querySelector('[data-check]').disabled = !ctx.enabled;
            };
            sync();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            for (const input of section.querySelectorAll('[data-setting]')) ctx.scheduler.listen(input, 'change', () => ctx.changeSettings({
                [input.dataset.setting]: input.type === 'checkbox' ? input.checked : Number(input.value)
            }));
            ctx.scheduler.listen(section.querySelector('[data-check]'), 'click', () => ctx.events.emit('reminderCheck'));
            ctx.events.on('reminderStatus', event => { status.textContent = event.text; });
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.container.append(section);
        }
    };
}
