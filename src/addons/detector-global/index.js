import { startDetectorGlobal } from './runtime.js';
import { CHANNELS, defaults, selectedChannels, channelLabel } from './channels.js';

export function createDetectorGlobal() {
    const lastResult = { text: 'Nie wykonano jeszcze próby wysyłania.', kind: 'idle' };
    return {
        id: 'detector-global',
        name: 'Wykrywacz → czat',
        description: 'Wysyła dokładny komunikat wykrywacza na wybrane czaty. Domyślnie tylko lokalny.',
        defaultEnabled: true,
        defaults,
        enable: ctx => startDetectorGlobal(ctx, result => {
            Object.assign(lastResult, result);
            ctx.events.emit('detectorChatStatus', lastResult);
        }),
        onSettingsChange: ctx => ctx.events.emit('detectorChannelsChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section');
            section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Wykrywacz → czat</h2><label class="mtk-enabled"><input type="checkbox" data-detector-enabled> Dodatek aktywny</label>
                <h2>Kanały docelowe</h2><p>Do testów zostaw zaznaczony tylko <strong>Lokalny</strong>. Każde kliknięcie przycisku w wykrywaczu wysyła wiadomość na wszystkie zaznaczone kanały.</p>
                <div class="ln-grid">${Object.entries(CHANNELS).map(([key, value]) => `<label class="ln-switch"><input type="checkbox" data-detector-channel="${key}"> ${value.label}</label>`).join('')}</div>
                <p data-selected-channels></p>
                <h2>Ostatnia próba</h2><p data-detector-result role="status" aria-live="polite"></p>
                <p>Treść jest kopiowana z natywnej ikony przy nazwie mapy w wykrywaczu. Dodatek nie zmienia wiadomości i przywraca poprzedni kanał czatu.</p>
                <p>Nic nie jest wysyłane automatycznie ani po zmianie ustawień. Bez odczytanego komunikatu wysyłka zostaje przerwana.</p>
                <p>Wyłącz osobny skrypt „Wykrywacz → GLOBAL”, jeśli był wcześniej zainstalowany.</p>`;
            const enabled = section.querySelector('input');
            enabled.checked = ctx.enabled;
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            ctx.events.on('addonChanged', event => {
                if (event.id === ctx.id) enabled.checked = event.enabled;
            });
            function updateChannels() {
                const selected = selectedChannels(ctx.settings);
                for (const input of section.querySelectorAll('[data-detector-channel]')) input.checked = selected.includes(input.dataset.detectorChannel);
                section.querySelector('[data-selected-channels]').textContent = selected.length
                    ? `Cel: ${channelLabel(selected)}.` : 'Wybierz przynajmniej jeden kanał. Wysyłanie jest wyłączone.';
            }
            for (const input of section.querySelectorAll('[data-detector-channel]')) {
                ctx.scheduler.listen(input, 'change', () => {
                    const channels = [...section.querySelectorAll('[data-detector-channel]:checked')].map(item => item.dataset.detectorChannel);
                    ctx.changeSettings({ channels });
                    updateChannels();
                });
            }
            const result = section.querySelector('[data-detector-result]');
            const showResult = () => { result.textContent = lastResult.text; };
            ctx.events.on('detectorChatStatus', showResult);
            updateChannels();
            showResult();
            ctx.container.append(section);
        }
    };
}
