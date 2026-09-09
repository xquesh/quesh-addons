// Funkcje kosztów i danych łupu przeniesione z dostarczonego Quesh Tools NI 1.0.0.
export function createTooltipTools(tooltipConfig) {
    const ITEM_TYPES = ['Pierścienie','Naszyjniki','Hełmy','Rękawice','Zbroje','Dystansowe','Strzały','Buty','Jednoręczne','Półtoraręczne','Dwuręczne','Orby magiczne','Tarcze','Pomocnicze'];

    function isUpgradeableItem(html) {
        const match = html.match(/Typ:\s*([^<\n]+)/i);
        return match ? ITEM_TYPES.some(type => match[1].trim().includes(type)) : false;
    }

    function calculateUpgradeCosts(level, currentUpgrade, rarity) {
        const levelMultipliers = { 1: 1, 2: 1.1, 3: 1.3, 4: 1.6, 5: 2 };
        const rarityMultipliers = {
            zwykły: 1,
            zwykłe: 1,
            unikatowy: 10,
            unikatowe: 10,
            heroiczny: 30,
            heroiczne: 30,
            ulepszony: 40,
            ulepszonych: 40,
            legendarny: 60,
            legendarne: 60
        };
        const upgradeMultipliers = {
            zwykły: 1,
            zwykłe: 1,
            unikatowy: 10,
            unikatowe: 10,
            heroiczny: 100,
            heroiczne: 100,
            ulepszony: 1,
            ulepszonych: 1,
            legendarny: 1000,
            legendarne: 1000
        };

        const rarityKey = String(rarity || '').toLowerCase();
        const rarityMultiplier = rarityMultipliers[rarityKey] || 1;
        const upgradeMultiplier = upgradeMultipliers[rarityKey] || 1;
        const upgradedItem = rarityKey === 'ulepszony' || rarityKey === 'ulepszonych';
        const costs = {};
        const totals = { upgrade: 0, gold: 0, essence: 0 };

        for (let upgrade = currentUpgrade + 1; upgrade <= 5; upgrade++) {
            const multiplier = levelMultipliers[upgrade];
            const upgradeCost = upgradedItem
                ? Math.round((150 * level + 27000) * multiplier)
                : Math.round((180 + level) * multiplier * upgradeMultiplier);

            let gold = 0;
            let essence = 0;

            totals.upgrade += upgradeCost;

            if (upgrade === 5) {
                gold = Math.round((10 * level + 1300) * level * rarityMultiplier);
                essence = Math.round((level / 10 + 10) * 3);
                totals.gold += gold;
                totals.essence += essence;
            }

            costs[upgrade] = { upgrade: upgradeCost, gold, essence };
        }

        return { costs, totals };
    }

    function parseItemInfo(html) {
        const info = {
            level: null,
            currentUpgrade: 0,
            rarity: 'zwykły'
        };

        for (const pattern of [/Wymagany poziom:\s*(\d+)/i, /Poziom:\s*(\d+)/i]) {
            const match = html.match(pattern);
            if (match) {
                info.level = parseInt(match[1], 10);
                break;
            }
        }

        const dataTypes = [
            [/data-item-type="t-leg"/i, 'legendarny'],
            [/data-item-type="t-her"/i, 'heroiczny'],
            [/data-item-type="t-uniupg"/i, 'unikatowy'],
            [/data-item-type="t-upgraded"/i, 'ulepszony'],
            [/data-item-type="t-norm"/i, 'zwykły']
        ];

        for (const [pattern, rarity] of dataTypes) {
            if (pattern.test(html)) {
                info.rarity = rarity;
                break;
            }
        }

        if (info.rarity === 'zwykły') {
            const textTypes = [
                [/\bLegendarn[ey]\b/i, 'legendarny'],
                [/\bHeroiczn[ey]\b/i, 'heroiczny'],
                [/\bUnikatow[ey]\b/i, 'unikatowy'],
                [/\bUlepszony\b|\bUlepszonych\b/i, 'ulepszony']
            ];

            for (const [pattern, rarity] of textTypes) {
                if (pattern.test(html)) {
                    info.rarity = rarity;
                    break;
                }
            }
        }

        const nameSection = html.split('Typ:')[0] || html;
        const upgradeMatch = nameSection.match(/\+([1-5])(?=\s|$|<)/);

        if (upgradeMatch) {
            info.currentUpgrade = parseInt(upgradeMatch[1], 10);
        }

        return info;
    }

    function itemById(itemId) {
        try {
            if (!itemId) return null;
            const items = window.Engine?.items;

            if (typeof items?.getItemById === 'function') {
                const direct = items.getItemById(itemId);
                if (direct) return direct;
            }

            return items?.items?.[itemId] || null;
        } catch {
            return null;
        }
    }

    function itemByHid(hid) {
        try {
            if (!hid) return null;
            const store = window.Engine?.items?.items || window.Engine?.items?._items || {};

            for (const item of Object.values(store)) {
                if (item?.hid === hid) return item;
            }
        } catch {}

        return null;
    }

    function statFromItem(item) {
        if (!item) return null;
        if (typeof item.stat === 'string') return item.stat;
        if (typeof item.stat?.stat === 'string') return item.stat.stat;
        return null;
    }

    function currentItemId(html) {
        try {
            const htmlMatch = String(html || '').match(/item-id-(-?\d+)/);
            if (htmlMatch) return htmlMatch[1];

            const hovered = document.querySelector('.item:hover');
            const classMatch = hovered?.className?.match?.(/item-id-(-?\d+)/);
            if (classMatch) return classMatch[1];

            const targetItem = window.TIPS?.target?.data?.('item');
            if (targetItem?.id) return String(targetItem.id);
        } catch {}

        return null;
    }

    function currentHid(html) {
        try {
            const source = String(html || '');
            const htmlMatch = source.match(/data-hid="([a-f0-9]{40,})"/i) ||
                source.match(/ITEM#([a-f0-9]{40,})/i);

            if (htmlMatch) return htmlMatch[1];

            const hovered = document.querySelector('.item:hover');
            const hid = hovered?.dataset?.hid || hovered?.getAttribute?.('data-hid');
            if (hid) return hid;

            const targetItem = window.TIPS?.target?.data?.('item');
            if (targetItem?.hid) return targetItem.hid;
        } catch {}

        return null;
    }

    function parseLootStat(stat) {
        if (!stat) return null;

        const match = stat.match(/loot=([^;]+)/);
        if (!match) return null;

        const parts = match[1].split(',');
        if (parts.length < 4) return null;

        const groupSize = parseInt(parts[2], 10);
        const timestamp = parseInt(parts[3], 10);

        if (!Number.isFinite(groupSize) || !Number.isFinite(timestamp)) return null;

        const date = new Date(timestamp * 1000);
        const pad = value => String(value).padStart(2, '0');

        return {
            groupSize,
            formattedDate: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
        };
    }

    function parseLootFallback(html) {
        const dateMatch = String(html || '').match(/W dniu (\d{2}\.\d{2}\.\d{4})/);
        if (!dateMatch) return null;

        let groupSizeText = 'solo';

        if (/wraz z kompanem/i.test(html)) groupSizeText = '2 osoby';
        else if (/wraz z drużyną/i.test(html)) groupSizeText = 'drużyna';

        return {
            formattedDate: dateMatch[1],
            groupSizeText
        };
    }

    function formatNumber(value) {
        return Number(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    function upgradeHtml(info) {
        const rarityMap = {
            zwykły: 'zwykly',
            zwykłe: 'zwykly',
            unikatowy: 'unikatowy',
            unikatowe: 'unikatowy',
            heroiczny: 'heroiczny',
            heroiczne: 'heroiczny',
            ulepszony: 'ulepszony',
            ulepszonych: 'ulepszony',
            legendarny: 'legendarny',
            legendarne: 'legendarny'
        };

        const rarity = rarityMap[String(info.rarity || '').toLowerCase()] || 'zwykly';

        if (tooltipConfig.rarities?.[rarity] === false) return '';
        if (!info.level || info.currentUpgrade >= 5) return '';

        const { costs, totals } = calculateUpgradeCosts(info.level, info.currentUpgrade, info.rarity);
        const showLevels = tooltipConfig.upgradeDisplay === 'all' || tooltipConfig.upgradeDisplay === 'both';
        const showSum = tooltipConfig.upgradeDisplay === 'sum' || tooltipConfig.upgradeDisplay === 'both';

        let html = '<div style="border-top:1px solid #333333;margin-top:8px;padding-top:6px">';
        html += '<div style="color:#eeeeee;font-weight:700;margin-bottom:4px">Koszt ulepszeń</div>';

        if (showLevels) {
            for (const [level, cost] of Object.entries(costs)) {
                html += `<div style="font-size:11px;color:#cccccc;line-height:1.55">+${level}: <span style="color:#eeeeee">${formatNumber(cost.upgrade)}</span> pkt.`;
                if (cost.gold > 0) html += ` · <span style="color:#eeeeee">${formatNumber(cost.gold)}</span> zł`;
                if (cost.essence > 0) html += ` · <span style="color:#eeeeee">${cost.essence}</span> es.`;
                html += '</div>';
            }
        }

        if (showSum && Object.keys(costs).length > 0) {
            html += `<div style="font-size:11px;color:#cccccc;margin-top:5px;padding-top:5px;border-top:1px solid #333333"><b>Suma:</b> <span style="color:#eeeeee">${formatNumber(totals.upgrade)}</span> pkt.`;
            if (totals.gold > 0) html += ` · <span style="color:#eeeeee">${formatNumber(totals.gold)}</span> zł`;
            if (totals.essence > 0) html += ` · <span style="color:#eeeeee">${totals.essence}</span> es.`;
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    function lootHtml(itemId, info, fullHtml) {
        const hid = currentHid(fullHtml);
        let item = itemById(itemId);

        if (!item && hid) item = itemByHid(hid);

        const stat = statFromItem(item);
        let loot = parseLootStat(stat);

        if (!loot) {
            const fallback = parseLootFallback(fullHtml);
            if (fallback) {
                loot = {
                    formattedDate: `${fallback.formattedDate} (brak godz.)`,
                    groupSizeText: fallback.groupSizeText
                };
            }
        } else {
            loot.groupSizeText = loot.groupSize === 1 ? 'solo' : `${loot.groupSize} graczy`;
        }

        let essence = item?.salvageItems;

        if ((essence === null || essence === undefined || Number.isNaN(Number(essence))) && info?.level && info.rarity !== 'zwykły') {
            essence = Math.floor(info.level / 10) + 10;
            if (String(info.rarity).toLowerCase() === 'legendarny') essence *= 3;
        }

        let html = '';

        if (loot && tooltipConfig.showLootDate) {
            html += `<div><span style="color:#999999">Zdobyto:</span> <span style="color:#eeeeee">${loot.formattedDate}</span></div>`;
        }

        if (loot && tooltipConfig.showLootGroup) {
            html += `<div><span style="color:#999999">Grupa:</span> <span style="color:#eeeeee">${loot.groupSizeText}</span></div>`;
        }

        if (tooltipConfig.showEssence && essence !== null && essence !== undefined && !Number.isNaN(Number(essence))) {
            html += `<div><span style="color:#999999">Esencja:</span> <span style="color:#eeeeee">${Number(essence)}</span></div>`;
        }

        return html
            ? `<div data-qtn-loot="1" style="font-size:11px;color:#cccccc;line-height:1.65;margin-top:5px">${html}</div>`
            : '';
    }


return { isUpgradeableItem, calculateUpgradeCosts, parseItemInfo, upgradeHtml, lootHtml, currentItemId, itemById, statFromItem, currentHid, itemByHid };
}
