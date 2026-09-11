import { exportSkillSet, heroData, learningQueue, parseSkillList, validateSkillSet } from './data.js';
import { SKILL_SET_CSS } from './style.js';

function packets(packet) { return Array.isArray(packet) ? packet.flat(Infinity).filter(Boolean) : [packet].filter(Boolean); }
async function copyText(value) {
    try { await navigator.clipboard.writeText(value); return true; }
    catch {
        const area = document.createElement('textarea'); area.value = value; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.append(area); area.select();
        const copied = document.execCommand?.('copy') === true; area.remove(); return copied;
    }
}

export function startSkillSet(ctx) {
    const page = ctx.game.page;
    const state = { skillData: null, skills: null, mastery: null, selected: 0, legacy: false };
    let running = false;
    ctx.styles.set('runtime', SKILL_SET_CSS);
    const button = document.createElement('button'); button.id = 'qaddons-skill-set-button'; button.type = 'button'; button.textContent = 'UM'; button.title = 'Zapisz zestaw UM';
    const panel = document.createElement('section'); panel.id = 'qaddons-skill-set'; panel.hidden = ctx.settings.windowOpen !== true;
    panel.innerHTML = '<header><span>ZAPISZ ZESTAW UM</span><button type="button" data-close aria-label="Zamknij">×</button></header><div class="qss-body"><div class="qss-actions"><button type="button" data-export>KOPIUJ AKTUALNY</button><button type="button" data-import>IMPORTUJ ZESTAW</button></div><textarea data-text spellcheck="false" placeholder="Wklej tutaj zestaw do importowania…"></textarea><div class="qss-actions"><button type="button" data-world>OTWÓRZ NA MARGOWORLD</button><button type="button" data-cancel disabled>ANULUJ IMPORT</button></div><div class="qss-status" data-status>Otwórz w grze umiejętności i mistrzostwo walk, aby pobrać aktualne dane.</div></div>';
    document.body.append(button, panel);
    const text = panel.querySelector('[data-text]');
    const cancel = panel.querySelector('[data-cancel]');
    function report(message) { panel.querySelector('[data-status]').textContent = message; }
    function setOpen(open) { panel.hidden = !open; if (ctx.settings.windowOpen !== open) ctx.changeSettings({ windowOpen: open }); }
    function update(packet) {
        for (const data of packets(packet)) {
            if (data.skill_data) state.skillData = data.skill_data;
            if (data.skill_list && data.skill_set !== undefined) {
                const parsed = parseSkillList(data.skill_list, state.skillData || {});
                state.skills = parsed.skills; state.legacy = parsed.legacy; state.selected = Number(data.skill_set);
            }
            if (data.battleskills) state.mastery = data.battleskills;
            if (data.skills_learnt !== undefined) state.skillsLearnt = Number(data.skills_learnt);
        }
    }
    async function save() {
        if (!state.skills) return report('Najpierw otwórz okno umiejętności w grze.');
        if (!state.mastery) return report('Otwórz także mistrzostwo walk, aby zapisać pełny zestaw.');
        const value = JSON.stringify(exportSkillSet({ skills: state.skills, mastery: state.mastery, hero: heroData(page) }));
        text.value = value;
        report(await copyText(value) ? 'Skopiowano aktualny zestaw do schowka.' : 'Zestaw przygotowany w polu tekstowym.');
    }
    function parsedInput() {
        try { const value = JSON.parse(text.value); return validateSkillSet(value) ? value : null; } catch { return null; }
    }
    async function importSet() {
        if (running) return;
        if (!state.skills) return report('Najpierw otwórz okno umiejętności w grze.');
        const saved = parsedInput(); if (!saved) return report('Zapisany zestaw jest uszkodzony lub ma zły format.');
        const hero = heroData(page);
        if (hero.level < Math.min(Number(saved.level), 300)) return report('Poziom postaci jest niższy niż poziom zapisanego zestawu.');
        if (hero.profession !== saved.prof) return report('Zestaw zapisano dla innej profesji.');
        running = true; cancel.disabled = false; panel.querySelector('[data-import]').disabled = true;
        try {
            let queue = learningQueue(saved, state.skills);
            while (queue.length && ctx.enabled && running) {
                const next = queue[0];
                const current = state.skills.find(skill => skill.id === next.id);
                if (!current) throw new Error(`Brak umiejętności #${next.id} na aktualnej postaci.`);
                const level = state.legacy ? current.level + 1 : next.target;
                report(`${current.name}: ${level}/${current.maxLevel || next.target}`);
                const response = await ctx.game.request(`skills&learn=${next.id}&lvl=${level}`, packet => Boolean(packet?.skill_list) || packet?.e !== undefined && packet.e !== 'ok', { timeout: 3500, signal: ctx.scheduler.signal });
                update(response);
                if (response?.e && response.e !== 'ok') throw new Error('Gra odrzuciła rozdanie punktu umiejętności.');
                queue = learningQueue(saved, state.skills);
            }
            if (!running) return report('Import anulowany.');
            const mastery = saved.mastery;
            if (mastery?.skills?.length) {
                report('Ustawianie mistrzostwa walk…');
                if (!state.mastery) {
                    const response = await ctx.game.request('skills&battleaction=show', packet => Boolean(packet?.battleskills), { timeout: 3500, signal: ctx.scheduler.signal });
                    update(response);
                }
                const limit = Number(state.mastery?.cur) || mastery.skills.length;
                const selected = mastery.skills.slice(0, limit);
                await ctx.game.request(`skills&battleaction=set&battleskills=${selected.join(',')}&rpt=${mastery.repeat ? 1 : -1}`, packet => Boolean(packet?.battleskills) || packet?.e !== undefined && packet.e !== 'ok', { timeout: 3500, signal: ctx.scheduler.signal });
            }
            report('Zakończono rozdawanie umiejętności.');
        } catch (error) { if (error?.name !== 'AbortError') report(error?.message || 'Nie udało się zaimportować zestawu.'); }
        finally { running = false; cancel.disabled = true; panel.querySelector('[data-import]').disabled = false; }
    }

    ctx.scheduler.listen(button, 'click', () => setOpen(panel.hidden));
    ctx.scheduler.listen(panel.querySelector('[data-close]'), 'click', () => setOpen(false));
    ctx.scheduler.listen(panel.querySelector('[data-export]'), 'click', save);
    ctx.scheduler.listen(panel.querySelector('[data-import]'), 'click', importSet);
    ctx.scheduler.listen(cancel, 'click', () => { running = false; });
    ctx.scheduler.listen(panel.querySelector('[data-world]'), 'click', () => { const value = parsedInput(); if (value) window.open(`https://margoworld.pl/tools/skills#import:${encodeURIComponent(text.value)}`, '_blank', 'noopener'); else report('Najpierw wklej poprawny zestaw.'); });
    ctx.events.on('gamePacket', update);
    ctx.events.on('skillSetChanged', () => {
        button.hidden = ctx.settings.showOnBar === false;
        panel.hidden = ctx.settings.windowOpen !== true;
    });
    ctx.scheduler.cleanup(() => { running = false; button.remove(); panel.remove(); });
    button.hidden = ctx.settings.showOnBar === false;
}
