import { DEFAULTS, PROFESSIONS, stateLabel } from './data.js';
import { readBuilds, startAutoAbyss, updateAbyssTracker } from './runtime.js';
import { autoAbyssSettingsCss } from './style.js';

function buildOptions(builds) {
    return `<option value="auto">Automatycznie według nazwy</option><option value="current">Nie zmieniaj zestawu</option>${builds.map(build => `<option value="${build.id}">${build.id}. ${build.name.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])}</option>`).join('')}`;
}

export function createAutoAbyss() {
    const tracker = { state: null, confirmation: null, preparation: null, progress: null };
    return {
        id: 'auto-abyss',
        name: 'Auto Otchłań',
        description: 'Automatycznie obsługuje kolejkę Otchłani, dobiera zestaw pod profesję przeciwnika i może włączyć autoatak.',
        defaultEnabled: false,
        defaults: DEFAULTS,
        init: ctx => ctx.events.on('gamePacket', packet => updateAbyssTracker(tracker, packet)),
        enable: ctx => startAutoAbyss(ctx, tracker),
        onSettingsChange: ctx => ctx.events.emit('autoAbyssChanged'),
        renderSettings(ctx) {
            ctx.styles.set('settings', autoAbyssSettingsCss);
            const section = document.createElement('section');
            section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Auto Otchłań</h2>
                <label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Po włączeniu dodatek zapisuje postać do kolejki, akceptuje znalezionego przeciwnika, potwierdza przygotowanie i przechodzi do następnej walki.</p>
                <div class="qaddons-abyss-status" data-status data-tone="normal"><strong>Oczekiwanie na dane gry</strong><small data-progress>Postęp pojawi się po zakończeniu walki.</small></div>
                <h2>Walka</h2><div class="ln-grid"><label class="ln-switch"><input type="checkbox" data-setting="autoFight">Włączaj automatyczną walkę (Auto F)</label></div>
                <h2>Zestawy pod profesje</h2><p>Tryb automatyczny szuka skrótu lub nazwy profesji w nazwie zestawu. Możesz przypisać każdy zestaw ręcznie.</p>
                <div class="qaddons-abyss-builds" data-builds></div>
                <div class="ln-grid"><button class="ln-btn" type="button" data-refresh>Odśwież listę zestawów</button><button class="ln-btn" type="button" data-collect>Odbierz skrzynki</button></div>
                <p>Automatyzacja działa tylko, gdy ten dodatek jest włączony. Wyłączenie natychmiast zatrzymuje zaplanowane akcje.</p>`;
            const enabled = section.querySelector('[data-enabled]');
            const autoFight = section.querySelector('[data-setting="autoFight"]');
            const buildsRoot = section.querySelector('[data-builds]');
            const status = section.querySelector('[data-status]');
            let builds = [];

            function renderBuilds() {
                builds = readBuilds(ctx.game.page);
                buildsRoot.innerHTML = PROFESSIONS.map(([prof, label]) => `<label class="ln-field">${label}<select data-prof="${prof}" data-key="build${prof.toUpperCase()}">${buildOptions(builds)}</select></label>`).join('');
                for (const select of buildsRoot.querySelectorAll('select')) {
                    const value = String(ctx.settings[select.dataset.key] || 'auto');
                    select.value = [...select.options].some(option => option.value === value) ? value : 'auto';
                    ctx.scheduler.listen(select, 'change', () => ctx.changeSettings({ [select.dataset.key]: select.value }));
                }
            }

            function sync() {
                enabled.checked = ctx.enabled;
                autoFight.checked = Boolean(ctx.settings.autoFight);
            }

            function showStatus(event) {
                status.dataset.tone = event.tone || 'normal';
                status.querySelector('strong').textContent = event.text;
                status.querySelector('[data-progress]').textContent = event.progress
                    ? `Etap ${event.progress.stage}/4 · ${event.progress.current}/${event.progress.max} pkt`
                    : 'Postęp pojawi się po zakończeniu walki.';
            }

            sync();
            renderBuilds();
            showStatus(tracker.status || { text: stateLabel(tracker.state), tone: 'normal', progress: tracker.progress });
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            ctx.scheduler.listen(autoFight, 'change', () => ctx.changeSettings({ autoFight: autoFight.checked }));
            ctx.scheduler.listen(section.querySelector('[data-refresh]'), 'click', renderBuilds);
            ctx.scheduler.listen(section.querySelector('[data-collect]'), 'click', () => {
                if (typeof ctx.game.page._g === 'function') ctx.game.page._g('match&a=collect');
            });
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.events.on('autoAbyssStatus', showStatus);
            ctx.container.append(section);
        }
    };
}
