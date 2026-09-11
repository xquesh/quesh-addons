import { DEFAULTS, inventoryItems, itemIdentity } from './data.js';
import { startGarbageTruck } from './runtime.js';

function draggedItem(page, target) {
    const node = target?.closest?.('[data-id],[data-item-id],[class*="item-id-"]');
    const id = Number(node?.dataset?.id || node?.dataset?.itemId || String(node?.className || '').match(/(?:^|\s)item-id-(\d+)/)?.[1]);
    return inventoryItems(page).find(item => Number(item.id) === id) || null;
}

export function createGarbageTruck() {
    return {
        id: 'garbage-truck', name: 'Śmieciara',
        description: 'Wykrywa przeterminowane i wskazane przedmioty, pokazuje je do kontroli i niszczy dopiero po potwierdzeniu.',
        defaultEnabled: true, defaults: DEFAULTS, enable: startGarbageTruck,
        onSettingsChange: ctx => ctx.events.emit('garbageTruckChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Śmieciara</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Śmieciara rozpoznaje przeterminowane przedmioty oraz wskazane przez Ciebie typy. Zawsze pokazuje listę przed zniszczeniem.</p>
                <div class="ln-grid"><label class="ln-switch"><input type="checkbox" data-setting="autoCheck">Sprawdzaj automatycznie po zmianie ekwipunku</label>
                <label class="ln-switch"><input type="checkbox" data-setting="disableOnGuest">Wyłącz na koncie zastępowanym</label></div>
                <h2>Dodatkowe śmieci</h2><div class="qgt-drop" data-drop>Przeciągnij tutaj przedmiot z ekwipunku</div><div class="qgt-marked" data-marked></div>`;
            const enabled = section.querySelector('[data-enabled]'); let sourceItem = null;
            function sync() {
                enabled.checked = ctx.enabled;
                section.querySelectorAll('[data-setting]').forEach(input => { input.checked = Boolean(ctx.settings[input.dataset.setting]); input.disabled = !ctx.enabled; });
                const root = section.querySelector('[data-marked]'); root.replaceChildren();
                for (const entry of ctx.settings.additionalGarbage || []) {
                    const row = document.createElement('div'); row.className = 'qgt-marked-row';
                    const name = document.createElement('span'); name.textContent = `${entry.name} (#${entry.tpl})`;
                    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.dataset.removeTpl = String(entry.tpl);
                    row.append(name, remove); root.append(row);
                }
            }
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            section.querySelectorAll('[data-setting]').forEach(input => ctx.scheduler.listen(input, 'change', () => ctx.changeSettings({ [input.dataset.setting]: input.checked })));
            ctx.scheduler.listen(document, 'pointerdown', event => { sourceItem = draggedItem(ctx.game.page, event.target); }, { capture: true });
            ctx.scheduler.listen(section.querySelector('[data-drop]'), 'pointerup', () => {
                if (!sourceItem) return;
                const entry = itemIdentity(sourceItem); const list = [...(ctx.settings.additionalGarbage || [])];
                if (!list.some(item => Number(item.tpl) === entry.tpl)) list.push(entry);
                ctx.changeSettings({ additionalGarbage: list }); sourceItem = null; sync();
            });
            ctx.scheduler.listen(section.querySelector('[data-marked]'), 'click', event => {
                const tpl = Number(event.target.closest('[data-remove-tpl]')?.dataset.removeTpl); if (!tpl) return;
                ctx.changeSettings({ additionalGarbage: (ctx.settings.additionalGarbage || []).filter(entry => Number(entry.tpl) !== tpl) }); sync();
            });
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            sync(); ctx.container.append(section);
        }
    };
}
