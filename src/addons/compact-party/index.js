import { compactPartyCss } from './style.js';

const DEFAULTS = { hideAvatars: true, showHpPoints: false, hpPosition: 'right', rowHeight: 18, fontSize: 9 };

function value(node) {
    return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function createSummary() {
    const summary = document.createElement('div');
    summary.className = 'qaddons-party-summary';
    const left = document.createElement('span'); left.className = 'qaddons-party-left';
    const nick = document.createElement('span'); nick.className = 'qaddons-party-nick';
    const info = document.createElement('span'); info.className = 'qaddons-party-info';
    const hp = document.createElement('span'); hp.className = 'qaddons-party-hp';
    left.append(nick, info); summary.append(left, hp);
    return summary;
}

function startCompactParty(ctx) {
    let frame = 0;

    function applyStyles() {
        ctx.styles.set('layout', compactPartyCss(ctx.settings));
    }

    function syncMember(member) {
        const sourceNick = member.querySelector('.nickname-text');
        const sourceInfo = member.querySelector('.character-info');
        const sourcePercent = member.querySelector('.hp-percent');
        const sourcePoints = member.querySelector('.hp-points');
        if (!sourceNick && !sourceInfo && !sourcePercent) return;
        let summary = member.querySelector('.qaddons-party-summary');
        if (!summary) {
            summary = createSummary();
            member.append(summary);
        }
        const nick = value(sourceNick);
        const info = value(sourceInfo);
        const percent = value(sourcePercent);
        const points = value(sourcePoints);
        const displayedHp = ctx.settings.showHpPoints && points ? points : percent;
        const nickNode = summary.querySelector('.qaddons-party-nick');
        const infoNode = summary.querySelector('.qaddons-party-info');
        const hpNode = summary.querySelector('.qaddons-party-hp');
        if (nickNode.textContent !== nick) nickNode.textContent = nick;
        if (infoNode.textContent !== info) infoNode.textContent = info;
        if (hpNode.textContent !== displayedHp) hpNode.textContent = displayedHp;
        const color = sourceNick ? getComputedStyle(sourceNick).color : '';
        if (color && nickNode.style.color !== color) nickNode.style.color = color;
        const title = [nick, info, percent, points].filter(Boolean).join(' ');
        if (summary.title !== title) summary.title = title;
        const visibleIcons = [...member.querySelectorAll('.info-icons > *')]
            .filter(node => getComputedStyle(node).display !== 'none');
        const iconWidth = visibleIcons.reduce((sum, node) => {
            const rectWidth = node.getBoundingClientRect().width;
            const cssWidth = Number.parseFloat(getComputedStyle(node).width);
            return sum + Math.ceil(rectWidth || cssWidth || node.offsetWidth || 14);
        }, 0);
        const actionsWidth = `${visibleIcons.length ? iconWidth + 6 : 4}px`;
        if (member.style.getPropertyValue('--qaddons-party-actions-width') !== actionsWidth) {
            member.style.setProperty('--qaddons-party-actions-width', actionsWidth);
        }
    }

    function sync() {
        frame = 0;
        document.querySelectorAll('.party .party__list .party-member').forEach(syncMember);
    }

    function requestSync(records = []) {
        if (records.length && records.every(record => record.target.parentElement?.closest?.('.qaddons-party-summary'))) return;
        if (!frame) frame = ctx.scheduler.frame(sync);
    }

    applyStyles();
    sync();
    ctx.scheduler.observer(MutationObserver, requestSync).observe(document.body, {
        childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ['class', 'style', 'bar-percent']
    });
    ctx.events.on('compactPartyChanged', () => { applyStyles(); requestSync(); });
    ctx.scheduler.cleanup(() => document.querySelectorAll('.qaddons-party-summary').forEach(node => {
        node.parentElement?.style.removeProperty('--qaddons-party-actions-width');
        node.remove();
    }));
}

export function createCompactParty() {
    return {
        id: 'compact-party', name: 'Kompaktowa grupa',
        description: 'Układa każdego członka grupy w jednym niskim wierszu.',
        defaultEnabled: true, defaults: DEFAULTS,
        init(ctx) {
            if (ctx.settings.compactLayoutVersion === 3) return;
            Object.assign(ctx.settings, { hpPosition: 'right', compactLayoutVersion: 3 });
            ctx.storage.save();
        },
        enable: startCompactParty,
        onSettingsChange: ctx => ctx.events.emit('compactPartyChanged'),
        renderSettings(ctx) {
            const section = document.createElement('section'); section.className = 'mtk-addon-settings';
            section.innerHTML = `<h2>Kompaktowa grupa</h2><label class="mtk-enabled"><input type="checkbox" data-enabled> Dodatek aktywny</label>
                <p>Poziom i profesja są obok nicku. Ustawienie HP po prawej daje długim nickom więcej miejsca.</p>
                <div class="ln-grid">
                    <label class="ln-switch"><input type="checkbox" data-setting="hideAvatars">Ukryj grafiki postaci</label>
                    <label class="ln-switch"><input type="checkbox" data-setting="showHpPoints">Pokaż dokładne punkty życia</label>
                    <label class="ln-field">Pozycja HP<select data-setting="hpPosition"><option value="right">Po prawej</option><option value="center">Na środku</option></select></label>
                    <label class="ln-field">Wysokość wiersza (16–28 px)<input type="range" min="16" max="28" step="1" data-setting="rowHeight"><output data-row-height></output></label>
                    <label class="ln-field">Rozmiar tekstu (8–12 px)<input type="range" min="8" max="12" step="1" data-setting="fontSize"><output data-font-size></output></label>
                </div><p>Podsumowanie profesji pod listą pozostaje widoczne.</p>`;
            const enabled = section.querySelector('[data-enabled]');
            const sync = () => {
                enabled.checked = ctx.enabled;
                for (const input of section.querySelectorAll('[data-setting]')) {
                    const current = ctx.settings[input.dataset.setting];
                    if (input.type === 'checkbox') input.checked = Boolean(current); else input.value = current;
                }
                section.querySelector('[data-row-height]').textContent = `${ctx.settings.rowHeight}px`;
                section.querySelector('[data-font-size]').textContent = `${ctx.settings.fontSize}px`;
            };
            sync();
            ctx.scheduler.listen(enabled, 'change', () => ctx.setEnabled(enabled.checked));
            for (const input of section.querySelectorAll('[data-setting]')) ctx.scheduler.listen(input, input.type === 'range' ? 'input' : 'change', () => {
                const next = input.type === 'checkbox' ? input.checked : input.type === 'range' ? Number(input.value) : input.value;
                ctx.changeSettings({ [input.dataset.setting]: next }); sync();
            });
            ctx.events.on('addonChanged', event => { if (event.id === ctx.id) sync(); });
            ctx.container.append(section);
        }
    };
}
