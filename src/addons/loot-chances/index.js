import { DEFAULTS } from './data.js';
import { startLootChances } from './runtime.js';

export function createLootChances() {
    return {
        id: 'loot-chances', name: 'Kto złapie?',
        description: 'Pokazuje procentową szansę na zdobycie legendarnego przedmiotu przez Twoją postać.',
        defaultEnabled: true, defaults: DEFAULTS,
        enable: startLootChances,
        onSettingsChange: ctx => ctx.events.emit('lootChancesChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section');
            section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Kto złapie?</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>W oknie łupu pokazuje szansę Twojej postaci na legendę. Obliczenie uwzględnia członków tej samej drużyny i profesje wymagane przez przedmiot. Najedź na procent, aby zobaczyć listę losujących.</p>
                <div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="hideSolo">Ukrywaj podczas walki solo</label>
                    <label class="ln-field">Pozycja<select data-setting="position"><option value="top-right">Prawy górny róg</option><option value="top-left">Lewy górny róg</option><option value="bottom-right">Prawy dolny róg</option><option value="bottom-left">Lewy dolny róg</option></select></label>
                    <label class="ln-field">Czcionka<select data-setting="fontFamily">${['Arial', 'Verdana', 'Tahoma', 'Georgia', 'monospace'].map(value => `<option>${value}</option>`).join('')}</select></label>
                    <label class="ln-field">Rozmiar (8–20 px)<input type="number" min="8" max="20" step="1" data-setting="fontSize"></label>
                    <label class="ln-field">Cień<select data-setting="shadow"><option value="outline">Czarny obrys</option><option value="soft">Miękki cień</option><option value="none">Brak</option></select></label>
                    <label class="ln-switch"><input type="checkbox" data-setting="bold">Pogrubienie</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="customColors">Kolory zależne od szansy</label>
                </div><h2>Kolory</h2><div class="ln-grid">
                    <label class="ln-field">0%<input type="color" data-setting="colorNone"></label>
                    <label class="ln-field">1–33%<input type="color" data-setting="colorLow"></label>
                    <label class="ln-field">50%<input type="color" data-setting="colorMid"></label>
                    <label class="ln-field">Powyżej 50%<input type="color" data-setting="colorHigh"></label>
                </div><p>Przy podziale z przypisanymi właścicielami procent nie jest wyświetlany, ponieważ wynik jest już ustalony przez grę.</p>
                <button type="button" class="mtk-action" data-test-loot>TESTUJ OKNO Z LEGENDĄ</button>`;
            const enabled = section.querySelector('[data-enabled]');
            const test = section.querySelector('[data-test-loot]');
            const sync = () => {
                enabled.checked = ctx.enabled;
                test.disabled = !ctx.enabled;
                for (const input of section.querySelectorAll('[data-setting]')) {
                    const value = ctx.settings[input.dataset.setting];
                    if (input.type === 'checkbox') input.checked = value !== false;
                    else input.value = value;
                }
            };
            sync();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            ctx.scheduler.listen(test, 'click', () => ctx.events.emit('lootChancesTest'));
            for (const input of section.querySelectorAll('[data-setting]')) {
                ctx.scheduler.listen(input, 'change', () => ctx.changeSettings({
                    [input.dataset.setting]: input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value
                }));
            }
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.container.append(section);
        }
    };
}
