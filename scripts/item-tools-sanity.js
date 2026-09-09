window.runItemToolsChecks = async function(manager, assert, wait) {
    const previousItems = Engine.items;
    const previousMap = Engine.map;
    const previousShift = Engine.mapShift;
    const fixture = document.createElement('div');
    fixture.innerHTML = `<div class="item item-id-901" style="position:relative;width:32px;height:32px"><div class="highlight h-exist t-leg"></div></div>
        <div class="item item-id-902" style="position:relative;width:32px;height:32px"><div class="highlight h-exist t-her"></div></div>
        <div class="tip-wrapper"><div class="content"><b class="item-id-901" data-item-type="t-leg">Przedmiot +3</b><div>Typ: Zbroje</div><div>Wymagany poziom: 100</div><div class="tip-item-stat-lvl">Poziom: 100</div></div></div>`;
    const item = { id: 901, stat: 'rarity=legendary;legbon=critred,25;loot=1,2,3,1788955200', salvageItems: 60, itemType: 't-leg', x: 0, y: 0 };
    const hero = { id: 902, stat: 'rarity=heroic;legbon=glare', itemType: 't-her' };
    const icons = fixture.querySelectorAll('.item');
    const groundCalls = [];
    const drawable = { i: item, frames: true, sprite: true, draw() { return 42; } };
    const originalDraw = drawable.draw;
    const ground = { getDrawableItems: () => [drawable], changeFrames: (...args) => groundCalls.push(['frame', ...args]), changeOverlays: (...args) => groundCalls.push(['overlay', ...args]) };
    let dispose;
    const settings = document.createElement('div');
    const badge = () => icons[0].querySelector('.qaddons-item-bonus');
    try {
        Engine.items = { getItemById: id => Number(id) === 901 ? item : hero };
        Engine.map = { groundItems: ground, offset: [0, 0] };
        Engine.mapShift = { getShift: () => [0, 0] };
        document.body.append(fixture);
        await wait(650);
        assert(badge()?.textContent === 'KO', 'KO na legendzie');
        assert(!icons[1].querySelector('.qaddons-item-bonus'), 'Brak etykiety na heroiku');
        assert(getComputedStyle(badge()).pointerEvents === 'none', 'Etykieta przepuszcza kliknięcia i hover');
        const tip = fixture.querySelector('.content');
        assert(tip.querySelectorAll('[data-qaddons-item-extra]').length === 1, 'Jedno rozszerzenie tooltipu');
        assert(tip.textContent.includes('Grupa: 3 graczy') && tip.textContent.includes('Esencja: 60'), 'Dane łupu z przedmiotu');
        assert(tip.textContent.includes('Koszt ulepszeń'), 'Koszty z dostarczonego skryptu');
        assert(getComputedStyle(tip.querySelector('[data-qaddons-item-extra]')).backgroundColor === 'rgb(8, 8, 8)', 'Czarne rozszerzenie tooltipu');
        assert(drawable.draw !== originalDraw, 'Obsługa bonusów na mapie');
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
        const context = canvas.getContext('2d');
        assert(drawable.draw(context) === 42 && context.getImageData(30, 30, 1, 1).data[3] > 0, 'Bonus na canvas z zachowaniem wyniku rysowania');
        item.stat = 'rarity=legendary;legbon=verycrit';
        await wait(650);
        assert(badge()?.textContent === 'CBK', 'Zmiana statystyk bez wymiany ikony');
        item.stat = 'rarity=legendary;legbon=glare';
        await wait(650);
        assert(badge()?.textContent === 'OŚ', 'Polskie znaki w skrócie');
        item.stat = 'rarity=legendary';
        await wait(650);
        assert(!badge(), 'Usunięcie starej etykiety przy braku bonusu');
        item.stat = 'rarity=legendary;legbon=critred';

        document.querySelector('#mtk-content').append(settings);
        dispose = manager.renderSettings('item-tools', settings);
        assert(settings.querySelectorAll('[data-tab]').length === 3, 'Tylko trzy pozostawione zakładki');
        settings.querySelector('[data-tab="bonuses"]').click();
        assert(!settings.querySelector('[data-pane="bonuses"]').hidden && settings.querySelector('[data-pane="appearance"]').hidden, 'Nawigacja ustawień');
        const bonusToggle = settings.querySelector('[data-setting="bonusLabels"]');
        bonusToggle.click();
        await wait(150);
        assert(!badge() && drawable.draw === originalDraw, 'Wyłączenie opcji bonusów usuwa DOM i canvas');
        bonusToggle.click();
        settings.querySelector('[data-tab="appearance"]').click();
        for (const type of ['frame', 'overlay']) {
            const form = settings.querySelector(`[data-add="${type}"]`);
            form.elements.name.value = 'Test <img onerror=alert(1)>';
            form.elements.url.value = `https://example.invalid/${type}.png`;
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            assert(settings.querySelector(`[data-library="${type}"]`).textContent.includes('<img onerror=alert(1)>'), 'Nazwa grafiki jako tekst');
            assert(!settings.querySelector(`[data-library="${type}"] img`), 'Brak HTML z nazwy');
        }
        await wait(150);
        assert(getComputedStyle(icons[0].firstElementChild).backgroundImage.includes('frame.png'), 'Ramka zastosowana w CSS');
        assert(getComputedStyle(icons[0].firstElementChild, '::after').backgroundImage.includes('overlay.png'), 'Nakładka zastosowana w CSS');
        assert(groundCalls.some(call => call[1] === 'https://example.invalid/frame.png'), 'Ramka przekazana mapie');
        settings.querySelector('[data-library="frame"] [data-remove-index]').click();
        settings.querySelector('[data-library="overlay"] input[value=""]').click();
        await wait(150);
        assert(!getComputedStyle(icons[0].firstElementChild).backgroundImage.includes('example.invalid'), 'Usunięcie aktywnej ramki przywraca grę');
        assert(groundCalls.at(-1)[1] === null, 'Przywrócenie nakładki mapy');
        settings.querySelector('[data-tab="tooltips"]').click();
        settings.querySelector('[data-setting="tooltipEnabled"]').click();
        await wait(150);
        assert(!tip.querySelector('[data-qaddons-item-extra]'), 'Wyłączenie tooltipów bez usunięcia opisu gry');
        assert(tip.textContent.includes('Przedmiot +3'), 'Natywny tooltip zachowany');
        settings.querySelector('[data-setting="tooltipEnabled"]').click();
        for (let attempt = 0; attempt < 3; attempt++) {
            manager.setEnabled('item-tools', false);
            assert(!badge() && !tip.querySelector('[data-qaddons-item-extra]') && drawable.draw === originalDraw, 'Pełny cleanup dodatku');
            manager.setEnabled('item-tools', true);
            await wait(150);
            assert(icons[0].querySelectorAll('.qaddons-item-bonus').length === 1 && tip.querySelectorAll('[data-qaddons-item-extra]').length === 1, 'Brak duplikatów po włączeniu');
        }
    } finally {
        dispose?.(); settings.remove();
        manager.setEnabled('item-tools', false);
        fixture.remove(); Engine.items = previousItems; Engine.map = previousMap; Engine.mapShift = previousShift;
        manager.changeSettings('item-tools', { frames: [], overlays: [], activeFrame: '', activeOverlay: '' });
        manager.setEnabled('item-tools', true);
    }
};
