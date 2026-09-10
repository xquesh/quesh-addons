import { calendarReminder, expiredItems, freePromotions, resultSignature } from './data.js';
import { REMINDER_CSS } from './style.js';

function countLabel(count, one, few, many) {
    if (count === 1) return `${count} ${one}`;
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)) return `${count} ${few}`;
    return `${count} ${many}`;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function calendarAvailable() {
    const icon = document.querySelector('.widget-rewards-calendar-icon');
    return Boolean(icon && !icon.classList.contains('disabled'));
}

async function safely(callback) {
    try { return await callback(); }
    catch { return null; }
}

export function startReminder(ctx) {
    const page = ctx.game.page;
    let checking = false;
    let current = { calendar: null, promotions: [], expired: [] };
    let dismissed = '';
    let intervalTimer = 0;
    let confirmationTimer = 0;

    ctx.styles.set('runtime', REMINDER_CSS);
    const button = document.createElement('button');
    button.id = 'qaddons-reminder-button';
    button.type = 'button';
    button.textContent = 'PRZ';
    button.title = 'Przypominajka — sprawdź teraz';
    const panel = document.createElement('section');
    panel.id = 'qaddons-reminder';
    panel.hidden = true;
    panel.innerHTML = '<div class="qrp-head"><span>PRZYPOMINAJKA</span><button type="button" class="qrp-close" aria-label="Zamknij">×</button></div><div class="qrp-body"></div>';
    document.body.append(button, panel);

    function showButton() {
        button.hidden = ctx.settings.showButton !== true;
        button.dataset.alert = String(Boolean(current.calendar || current.promotions.length || current.expired.length));
    }

    function removeType(type) {
        current = { ...current, [type]: type === 'calendar' ? null : [] };
        render(true);
    }

    async function claimCalendar() {
        if (!current.calendar) return false;
        const dayNo = current.calendar.dayNo;
        const response = await ctx.game.request(`rewards_calendar&action=open&day_no=${dayNo}`,
            packet => Boolean(packet?.rewards_calendar) || Object.hasOwn(packet || {}, 'e'), { strip: ['rewards_calendar'], signal: ctx.scheduler.signal });
        if (!ctx.enabled) return false;
        const success = response?.e === 'ok';
        if (!success) throw new Error('Nie udało się odebrać nagrody z kalendarza.');
        removeType('calendar');
        return true;
    }

    async function claimPromotions() {
        const items = [...current.promotions];
        for (const item of items) {
            if (!ctx.enabled) return false;
            const response = await ctx.game.request(`promotions&a=use&id=${encodeURIComponent(item.id)}`,
                packet => Object.hasOwn(packet || {}, 'e'), { strip: ['promotions'], signal: ctx.scheduler.signal });
            if (response?.e !== 'ok') throw new Error('Nie udało się odebrać darmowej oferty.');
        }
        if (!ctx.enabled) return false;
        removeType('promotions');
        return true;
    }

    function destroyExpired() {
        const items = [...current.expired];
        let index = 0;
        const next = () => {
            if (!ctx.enabled || index >= items.length) {
                removeType('expired');
                return;
            }
            if (typeof page._g === 'function') page._g(`moveitem&st=-2&id=${encodeURIComponent(items[index].id)}`);
            index++;
            ctx.scheduler.timeout(next, 1000);
        };
        next();
    }

    async function action(name, element) {
        element.disabled = true;
        try {
            if (name === 'calendar') await claimCalendar();
            if (name === 'promotions') await claimPromotions();
        } catch (error) {
            if (ctx.enabled) {
                element.disabled = false;
                element.textContent = 'Nie udało się — spróbuj ponownie';
            }
        }
    }

    function render(force = false) {
        const body = panel.querySelector('.qrp-body');
        const rows = [];
        if (current.calendar) rows.push(`<div class="qrp-row"><strong>Kalendarz eventowy</strong><p>Dzień ${current.calendar.dayNo} czeka na odebranie.</p><div class="qrp-actions"><button type="button" data-action="calendar">Odbierz</button></div></div>`);
        if (current.promotions.length) rows.push(`<div class="qrp-row"><strong>Darmowe przedmioty</strong><p>${countLabel(current.promotions.length, 'oferta czeka', 'oferty czekają', 'ofert czeka')} w aktualnościach.</p><div class="qrp-actions"><button type="button" data-action="promotions">Odbierz wszystkie</button></div></div>`);
        if (current.expired.length) {
            const names = current.expired.slice(0, 4).map(item => escapeHtml(item.name || `Przedmiot ${item.id}`)).join(', ');
            rows.push(`<div class="qrp-row"><strong>Nieaktywne przedmioty</strong><p>${countLabel(current.expired.length, 'przedmiot', 'przedmioty', 'przedmiotów')}: ${names}${current.expired.length > 4 ? '…' : ''}</p><div class="qrp-actions"><button type="button" data-action="expired" data-danger="true">Zniszcz bezpowrotnie</button></div></div>`);
        }
        body.innerHTML = rows.join('');
        const signature = resultSignature(current);
        panel.hidden = !rows.length || (!force && signature === dismissed);
        showButton();
    }

    async function check(force = false) {
        if (checking || !ctx.enabled) return;
        checking = true;
        ctx.events.emit('reminderStatus', { state: 'checking', text: 'Sprawdzanie…' });
        const next = { calendar: null, promotions: [], expired: [] };
        let unavailable = 0;
        try {
            if (ctx.settings.calendarEnabled && calendarAvailable()) {
                const response = await safely(() => ctx.game.request('rewards_calendar&action=show', packet => Boolean(packet?.rewards_calendar), { strip: ['rewards_calendar'], signal: ctx.scheduler.signal }));
                if (!ctx.enabled) return;
                if (!response) unavailable++;
                next.calendar = calendarReminder(response?.rewards_calendar);
            }
            if (ctx.settings.promotionsEnabled) {
                const response = await safely(() => ctx.game.request('promotions&a=show', packet => Boolean(packet?.promotions), { strip: ['promotions'], signal: ctx.scheduler.signal }));
                if (!ctx.enabled) return;
                if (!response) unavailable++;
                next.promotions = freePromotions(response?.promotions);
            }
            if (ctx.settings.expiredEnabled) next.expired = expiredItems(page);
            current = next;
            if (current.calendar && ctx.settings.calendarAutoClaim) await safely(claimCalendar);
            if (current.promotions.length && ctx.settings.promotionsAutoClaim) await safely(claimPromotions);
            render(force);
            const count = Number(Boolean(current.calendar)) + current.promotions.length + current.expired.length;
            const text = unavailable
                ? count ? `Znaleziono: ${count}. Część danych jest niedostępna.` : 'Nie udało się sprawdzić danych gry.'
                : count ? `Znaleziono: ${count}` : 'Brak oczekujących rzeczy.';
            ctx.events.emit('reminderStatus', { state: unavailable ? 'error' : 'ready', text });
        } finally { checking = false; }
    }

    function scheduleInterval() {
        ctx.scheduler.clearTimeout(intervalTimer);
        const seconds = Math.max(60, Math.min(1800, Number(ctx.settings.checkInterval) || 300));
        intervalTimer = ctx.scheduler.timeout(() => { check(); scheduleInterval(); }, seconds * 1000);
    }

    ctx.scheduler.listen(panel.querySelector('.qrp-close'), 'click', () => { dismissed = resultSignature(current); panel.hidden = true; });
    ctx.scheduler.listen(button, 'click', () => check(true));
    ctx.scheduler.listen(panel, 'click', event => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        if (target.dataset.action !== 'expired') { action(target.dataset.action, target); return; }
        if (target.dataset.confirmed !== 'true') {
            target.dataset.confirmed = 'true';
            target.textContent = 'Kliknij ponownie, aby potwierdzić';
            ctx.scheduler.clearTimeout(confirmationTimer);
            confirmationTimer = ctx.scheduler.timeout(() => { target.dataset.confirmed = 'false'; target.textContent = 'Zniszcz bezpowrotnie'; }, 5000);
            return;
        }
        target.disabled = true;
        destroyExpired();
    });
    ctx.events.on('reminderChanged', () => { showButton(); scheduleInterval(); check(true); });
    ctx.events.on('reminderCheck', () => check(true));
    ctx.events.on('gameReady', () => ctx.scheduler.timeout(() => check(), 250));
    showButton();
    scheduleInterval();
    ctx.scheduler.timeout(() => check(), 1200);
    ctx.scheduler.cleanup(() => { button.remove(); panel.remove(); });
}
