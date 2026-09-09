import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abbreviation, legendaryBonus, BONUSES, imageUrl, defaults } from '../src/addons/item-tools/data.js';
import { createTooltipTools } from '../src/addons/item-tools/tooltip.js';
for (const [name, result] of [['Krytyczna osłona', 'KO'], [' Cios  bardzo krytyczny ', 'CBK'], ['Oślepienie', 'OŚ'], ['Klątwa', 'KL'], ['Ochrona żywiołów', 'OŻ']]) assert.equal(abbreviation(name), result);
for (const [code, name] of Object.entries(BONUSES)) {
    assert.deepEqual(legendaryBonus({ stat: `rarity=legendary;legbon=${code}` }), { name, short: abbreviation(name) });
    assert.equal(legendaryBonus({ itemType: 't-her', stat: `legbon=${code}` }, true), null);
}
assert.equal(legendaryBonus({ stat: 'legendary;legbon=unknown' }), null);
assert.equal(legendaryBonus({ stat: 'legendary' }), null);
assert.equal(legendaryBonus({ itemType: 't-leg', getLegbonStat: () => 'glare' }).short, 'OŚ');
assert.equal(legendaryBonus({ itemType: 't-leg', getLegbonStat: () => 'critred,25' }).short, 'KO');
assert.equal(legendaryBonus({ stat: { stat: 'legendary;legbon=verycrit' } }).short, 'CBK');
assert.equal(imageUrl('javascript:alert(1)'), '');
assert.equal(imageUrl('http://example.test/a.png'), '');
assert.equal(imageUrl('https://example.test/a.png'), 'https://example.test/a.png');
const config = structuredClone(defaults);
const tips = createTooltipTools(config);
assert.deepEqual(tips.calculateUpgradeCosts(100, 4, 'legendarny'), { costs: { 5: { upgrade: 560000, gold: 13800000, essence: 60 } }, totals: { upgrade: 560000, gold: 13800000, essence: 60 } });
config.upgradeDisplay = 'sum';
assert.match(tips.upgradeHtml({ level: 100, currentUpgrade: 4, rarity: 'legendarny' }), /560 000/);
config.rarities.legendarny = false;
assert.equal(tips.upgradeHtml({ level: 100, currentUpgrade: 3, rarity: 'legendarny' }), '');
const bundle = await readFile('dist/margonem-toolkit.js', 'utf8');
for (const removed of ['startTitanDetection', 'handleSellingHotkey', 'startWakeWatcher', 'makeTimerResizable', 'buildSymbolPanel']) assert.ok(!bundle.includes(removed), `Usunięta funkcja: ${removed}`);
console.log('OK: bonusy legendarne, polskie skróty, brak etykiet na innych rangach, walidacja URL, koszty ulepszeń, usunięte moduły');
