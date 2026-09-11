import { DEFAULTS } from './data.js';
import { startSkillSet } from './runtime.js';

export function createSkillSet() {
    return {
        id: 'skill-set', name: 'Zapisz zestaw UM',
        description: 'Eksportuje aktualne umiejętności i mistrzostwo, a potem bezpiecznie odtwarza zapisany zestaw na zgodnej postaci.',
        defaultEnabled: true, defaults: DEFAULTS, enable: startSkillSet,
        onSettingsChange: ctx => ctx.events.emit('skillSetChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Zapisz zestaw UM</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Przed eksportem otwórz w grze okno umiejętności oraz mistrzostwo walk. Import sprawdza poziom i profesję, a następnie rozdaje punkty po kolei, czekając na odpowiedź gry.</p>
                <label class="ln-switch"><input type="checkbox" data-setting="windowOpen">Okno widoczne po uruchomieniu</label>`;
            const enabled = section.querySelector('[data-enabled]'); const open = section.querySelector('[data-setting="windowOpen"]');
            function sync() { enabled.checked = ctx.enabled; open.checked = ctx.settings.windowOpen === true; open.disabled = !ctx.enabled; }
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            ctx.scheduler.listen(open, 'change', () => ctx.changeSettings({ windowOpen: open.checked }));
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            sync(); ctx.container.append(section);
        }
    };
}
