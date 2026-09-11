import { ABYSS_STATES, configuredBuild, normalizeBuilds, packetList, stateLabel } from './data.js';

function engine(page) {
    try { return page.getEngine?.() || page.Engine; } catch { return page.Engine; }
}

export function readBuilds(page) {
    try {
        const commons = engine(page)?.buildsManager?.getBuildsCommons?.();
        const detailed = commons?.getCrazyDataToMatchmaking?.();
        const names = commons?.getBuildsName?.();
        return normalizeBuilds(detailed && Object.keys(detailed).length ? detailed : names);
    } catch { return []; }
}

export function currentBuildId(page) {
    try { return Number(engine(page)?.buildsManager?.getBuildsCommons?.()?.getCurrentId?.()) || 0; }
    catch { return 0; }
}

export function updateAbyssTracker(tracker, packet) {
    for (const data of packetList(packet)) {
        if (data.matchmaking_state !== undefined) {
            tracker.state = Number(data.matchmaking_state);
            if (tracker.state !== ABYSS_STATES.FOUND) tracker.confirmation = null;
            if (tracker.state !== ABYSS_STATES.PREPARATION) tracker.preparation = null;
        }
        if (data.matchmaking_confirmation) tracker.confirmation = data.matchmaking_confirmation;
        if (data.matchmaking_preparation) tracker.preparation = data.matchmaking_preparation;
        if (data.match_summary?.daily_stage) {
            const daily = data.match_summary.daily_stage;
            tracker.progress = { stage: Number(daily.id) + 1, current: Number(daily.points_cur), max: Number(daily.points_max) };
        }
    }
    return tracker;
}

export function startAutoAbyss(ctx, tracker = {}) {
    const page = ctx.game.page;
    let state = tracker.state ?? null;
    let confirmation = tracker.confirmation ?? null;
    let preparation = tracker.preparation ?? null;
    let actionKey = '';
    let actionAt = 0;
    let generation = 0;
    let summaryPending = false;
    let holdQueueUntil = 0;
    let lastProgress = tracker.progress ?? null;

    function report(text, tone = 'normal') {
        tracker.status = { text, tone, state, progress: lastProgress };
        ctx.events.emit('autoAbyssStatus', tracker.status);
    }

    function send(command) {
        if (engine(page)?.allInit !== true || typeof page._g !== 'function') throw new Error('Gra nie jest jeszcze gotowa.');
        page._g(command);
    }

    function reserve(key, cooldown = 2200) {
        const now = Date.now();
        if (actionKey === key && now - actionAt < cooldown) return false;
        actionKey = key;
        actionAt = now;
        return true;
    }

    function schedule(key, callback, delay = 550, cooldown = 2200) {
        if (!reserve(key, cooldown)) return;
        const token = generation;
        ctx.scheduler.timeout(async () => {
            if (token !== generation || ctx.scheduler.disposed) return;
            try { await callback(); }
            catch (error) {
                if (error?.name !== 'AbortError') report(error?.message || 'Akcja Otchłani nie powiodła się.', 'error');
            }
        }, delay);
    }

    async function selectBuildAndPrepare() {
        if (state !== ABYSS_STATES.PREPARATION || !preparation) return;
        const profession = String(preparation.opponent_prof || '').toLowerCase();
        const key = `build${profession.toUpperCase()}`;
        const builds = readBuilds(page);
        const selected = configuredBuild(builds, profession, ctx.settings[key], currentBuildId(page));
        if (selected) {
            report(`Zmiana zestawu na „${selected.name}” (${profession || '?'}).`);
            const skillshop = engine(page)?.skills ? '&skillshop=1' : '';
            try {
                await ctx.game.request(
                    `builds&action=updateCurrent&id=${selected.id}${skillshop}`,
                    data => Number(data?.builds?.currentId ?? data?.builds?.current_id) === selected.id,
                    { timeout: 3500, signal: ctx.scheduler.signal }
                );
            } catch (error) {
                if (error?.name === 'AbortError') throw error;
                report(`Nie potwierdzono zestawu „${selected.name}”; rozpoczynam z aktualnym.`, 'warning');
            }
        }
        if (state === ABYSS_STATES.PREPARATION) {
            send('match&a=prepared');
            report('Potwierdzono przygotowanie do walki.');
        }
    }

    function act() {
        if (ctx.scheduler.disposed || engine(page)?.allInit !== true || typeof page._g !== 'function') return;
        if (summaryPending) {
            schedule('nextmatch', () => {
                send('fight&a=nextmatch');
                summaryPending = false;
                holdQueueUntil = Date.now() + 1800;
                report('Przechodzę do następnej walki.');
            }, 750, 5000);
            return;
        }
        if (state === null) return;
        if (state === ABYSS_STATES.NONE && Date.now() >= holdQueueUntil) {
            schedule('signin', () => { send('match&a=signin'); report('Zapisano do kolejki Otchłani.'); });
        } else if (state === ABYSS_STATES.FOUND && Number(confirmation?.accept) === 0) {
            schedule('accept', () => { send('match&a=accept_opp&ans=1'); report('Zaakceptowano przeciwnika.'); });
        } else if (state === ABYSS_STATES.PREPARATION && preparation) {
            schedule('prepare', selectBuildAndPrepare, 550, 5000);
        } else if (state === ABYSS_STATES.BATTLING && ctx.settings.autoFight) {
            schedule('autofight', () => { send('fight&a=f&enabled=1'); report('Włączono automatyczną walkę.'); }, 450, 10000);
        }
    }

    function onPacket(packet) {
        for (const data of packetList(packet)) {
            if (data.matchmaking_state !== undefined) {
                const next = Number(data.matchmaking_state);
                if (next !== state) {
                    state = next;
                    generation += 1;
                    actionKey = '';
                    if (state !== ABYSS_STATES.FOUND) confirmation = null;
                    if (state !== ABYSS_STATES.PREPARATION) preparation = null;
                    report(stateLabel(state));
                }
            }
            if (data.matchmaking_confirmation) confirmation = data.matchmaking_confirmation;
            if (data.matchmaking_preparation) preparation = data.matchmaking_preparation;
            if (data.match_summary) {
                summaryPending = true;
                const daily = data.match_summary.daily_stage;
                if (daily) lastProgress = { stage: Number(daily.id) + 1, current: Number(daily.points_cur), max: Number(daily.points_max) };
                report('Walka zakończona.');
            }
            const messages = Array.isArray(data.msg) ? data.msg : [];
            if (messages.some(message => String(message).includes('Możesz zapisać się od '))) {
                report('Serwer zablokował kolejne zapisy do Otchłani.', 'error');
                ctx.setEnabled(false);
                return;
            }
        }
        act();
    }

    function tick() {
        act();
        ctx.scheduler.timeout(tick, 700);
    }

    ctx.events.on('gamePacket', onPacket);
    ctx.events.on('autoAbyssChanged', act);
    ctx.scheduler.timeout(() => {
        if (state === null) {
            state = ABYSS_STATES.NONE;
            report(stateLabel(state));
        }
        act();
    }, 1600);
    tick();
    ctx.scheduler.cleanup(() => { generation += 1; });
    report('Oczekiwanie na dane gry');
}
