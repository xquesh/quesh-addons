import { startDetectorGlobal } from './runtime.js';

export function createDetectorGlobal() {
    return {
        id: 'detector-global',
        name: 'Wykrywacz → GLOBAL',
        description: 'Dodaje do wykrywacza przycisk wysyłający jego dokładny komunikat na GLOBAL.',
        defaultEnabled: true,
        defaults: {},
        enable: startDetectorGlobal,
        renderSettings(ctx) {
            const section = document.createElement('section');
            section.className = 'mtk-addon-settings';
            section.innerHTML = '<h2>Wykrywacz → GLOBAL</h2><label class="mtk-enabled"><input type="checkbox"> Dodatek aktywny</label><p>Otwórz okno wykrywacza i kliknij <strong>GLOBAL</strong> obok jego przycisków.</p><p>Wiadomość pochodzi bezpośrednio z wykrywacza. Dodatek nie zmienia jej treści i po wysłaniu przywraca poprzedni kanał czatu.</p><p>Jeśli nie da się odczytać komunikatu, wiadomość nie zostanie wysłana. Najedź na przycisk z napisem „BŁĄD”, żeby zobaczyć przyczynę.</p><p>Wyłącz osobny skrypt „Wykrywacz → GLOBAL”, jeśli był wcześniej zainstalowany.</p>';
            const enabled = section.querySelector('input');
            enabled.checked = ctx.enabled;
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            ctx.events.on('addonChanged', event => {
                if (event.id === ctx.id) enabled.checked = event.enabled;
            });
            ctx.container.append(section);
        }
    };
}
