import assert from 'node:assert/strict';
import { garbageCandidates, itemIdentity } from '../src/addons/garbage-truck/data.js';
import { exportSkillSet, learningQueue, parseSkillList, validateSkillSet } from '../src/addons/skill-set/data.js';
import { buildItemIds, mergeBuildPacket, normalizeBuilds } from '../src/addons/build-switcher/data.js';

const expired = { id: 1, tpl: 101, loc: 'g', st: 0, name: 'Stary', checkExpires: () => true };
const marked = { id: 2, tpl: 202, loc: 'g', st: 0, name: 'Znaczony', checkExpires: () => false };
const bag = { id: 3, tpl: 303, loc: 'g', st: 20, checkExpires: () => true };
const equipped = { id: 4, tpl: 404, loc: 'g', st: 6, checkExpires: () => true };
const foreign = { id: 5, tpl: 505, loc: 'l', st: 0, checkExpires: () => true };
assert.deepEqual(garbageCandidates([expired, marked, bag, equipped, foreign], [{ tpl: 202 }]).map(item => item.id), [1, 2, 4]);
assert.deepEqual(itemIdentity(marked), { tpl: 202, name: 'Znaczony' });
console.log('OK: Śmieciara wykrywa wygasłe i wskazane typy, chroni torby oraz przedmioty spoza ekwipunku');

const legacy = parseSkillList([11, 'Atak', 0, 1, 0, '', '', '2/5', '', ''], {});
assert.equal(legacy.legacy, true); assert.deepEqual(legacy.skills[0], { id: 11, name: 'Atak', group: 0, level: 2, maxLevel: 5 });
const modern = parseSkillList({ 12: { lvl: 3 } }, { 12: { name: 'Obrona', pos: 2, maxLvl: 7 } });
assert.equal(modern.legacy, false); assert.deepEqual(modern.skills[0], { id: 12, name: 'Obrona', group: 1, level: 3, maxLevel: 7 });
const saved = exportSkillSet({ skills: [...legacy.skills, ...modern.skills], mastery: { list: [1, 4], rpt: 1 }, hero: { level: 190, profession: 'w' } });
assert.equal(validateSkillSet(saved), true); assert.equal(saved.level, 190); assert.equal(saved.prof, 'w'); assert.deepEqual(saved.mastery, { skills: [1, 4], repeat: true });
assert.deepEqual(learningQueue(saved, [{ id: 11, level: 1 }, { id: 12, level: 3 }]), [{ id: 11, target: 2 }]);
assert.equal(validateSkillSet({ skills: 'broken' }), false);
console.log('OK: Zapisz zestaw UM obsługuje oba formaty gry, eksport, walidację i kolejkę nauki');

const builds = normalizeBuilds({ 2: { name: '[SET.2]', items: [10, 11] }, 1: { name: 'EXP', id: 1 } });
assert.deepEqual(builds.map(build => [build.id, build.name]), [[1, 'EXP'], [2, 'Zestaw 2']]);
assert.deepEqual(buildItemIds(builds[1]), [10, 11]);
const state = { builds: [], currentId: 0, offers: [] };
assert.equal(mergeBuildPacket(state, { builds: { action: 'INIT', list: builds, currentId: 1, listToBuy: [{ id: 3 }] } }), true);
assert.equal(state.currentId, 1); assert.equal(state.offers.length, 1);
mergeBuildPacket(state, { builds: { action: 'UPDATE_DATA', list: [{ id: 1, name: 'PvP' }] } });
assert.equal(state.builds[0].name, 'PvP');
mergeBuildPacket(state, { builds: { action: 'UPDATE_CURRENT_ID', currentId: 2 } });
assert.equal(state.currentId, 2);
console.log('OK: Zmieniacz zestawów odtwarza INIT, aktualizacje danych i zmianę aktywnego zestawu');
