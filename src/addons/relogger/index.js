import { defaults } from './data.js';
import { startRelogger } from './runtime.js';

export function createRelogger() {
    return {
        id: 'relogger', name: 'Przelogawka',
        description: 'Belka postaci i światów z podglądem timerów oraz szybkim przelogowaniem.',
        defaults, defaultEnabled: true,
        enable: startRelogger,
        onSettingsChange: ctx => ctx.events.emit('reloggerChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Przelogawka</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Kliknij portret, aby przejść na postać. Pasek ma maksymalnie 60 px wysokości i dopasowuje się do wybranej belki gry. Widać górną połowę postaci, a pod nią poziom i skrót profesji, np. 190t lub 244w. Dziewięć postaci mieści się w jednym rzędzie; dalsze przewiniesz poziomo.</p>
                <h2>Belka postaci</h2><div class="ln-grid">
                    <label class="ln-field">Sposób zmiany postaci<select data-setting="switchMode"><option value="direct">Szybki — jak stara Przelogawka</option><option value="native">Natywny — odliczanie gry</option></select></label>
                    <label class="ln-field">Kolejność<select data-setting="sort"><option value="level-desc">Poziom malejąco</option><option value="level-asc">Poziom rosnąco</option><option value="name">Nazwa postaci</option></select></label>
                    <label class="ln-field">Miejsce paska<select data-setting="barPosition"><option value="bottom">Dolna belka</option><option value="top">Górna belka</option></select></label>
                    <label class="ln-field">Położenie w poziomie (0% lewo — 100% prawo)<input type="range" min="0" max="100" step="1" data-setting="horizontal"><output data-position-value></output></label>
                    <label class="ln-switch"><input type="checkbox" data-setting="showWorldButton">Pokaż przycisk wyboru świata</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="showTimers">Podświetlenie i podgląd timerów</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="hotkeys">Skróty Alt+1…9</label>
                </div><p>Tryb szybki zapisuje wybraną postać, zamyka bieżącą sesję klienta i natychmiast ładuje właściwy świat bez okna odliczania. Dzięki pełnemu startowi nowej sesji ładuje też ekwipunek postaci. Tryb natywny korzysta z pięciosekundowego okna gry.</p><p>Skróty wybierają postacie w kolejności na belce, na wybranym świecie. Nie działają podczas wpisywania tekstu w polach formularzy i czacie.</p>
                <h2>Podświetlenie timerów</h2><p><span style="color:#6ddb9a">▰ Zielony</span> — czas minął.<br><span style="color:#deb358">▰ Bursztynowy</span> — rozpoczęło się okno możliwego respawnu.<br>Szary — odliczanie trwa albo nie ma aktywnego timera.</p>
                <p>Podświetlenie jest stałe. Nazwy i czasy timerów pokazują się dopiero po najechaniu lub wybraniu postaci klawiaturą. Upłynięcie czasu nie potwierdza pojawienia się potwora.</p>
                <p>Dodatek odczytuje dostępne w grze dane timerów (addon_17). Nie tworzy własnych timerów i nie wymaga całego pakietu Essentials. Bez tych danych nadal możesz zmieniać postacie.</p>
                <div class="ln-grid"><button class="ln-btn" type="button" data-refresh>Odśwież postacie</button><button class="ln-btn" type="button" data-reset>Przywróć pozycję belki</button></div>
                <p data-status role="status"></p>`;
            const enabled = section.querySelector('[data-enabled]');
            const refresh = section.querySelector('[data-refresh]');
            function syncEnabled() { enabled.checked = ctx.enabled; refresh.disabled = !ctx.enabled; }
            syncEnabled();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) syncEnabled(); });
            for (const input of section.querySelectorAll('[data-setting]')) {
                const key = input.dataset.setting;
                if (input.type === 'checkbox') input.checked = ctx.settings[key]; else input.value = ctx.settings[key];
                ctx.scheduler.listen(input, input.type === 'range' ? 'input' : 'change', () => {
                    ctx.changeSettings({ [key]: input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value });
                    section.querySelector('[data-position-value]').textContent = `${ctx.settings.horizontal}%`;
                });
            }
            ctx.scheduler.listen(refresh, 'click', () => ctx.events.emit('reloggerRefresh'));
            section.querySelector('[data-position-value]').textContent = `${ctx.settings.horizontal}%`;
            ctx.scheduler.listen(section.querySelector('[data-reset]'), 'click', () => { ctx.changeSettings({ horizontal: 100 }); section.querySelector('[data-setting="horizontal"]').value = 100; section.querySelector('[data-position-value]').textContent = '100%'; section.querySelector('[data-status]').textContent = 'Przywrócono pozycję po prawej stronie.'; });
            ctx.container.append(section);
        }
    };
}
