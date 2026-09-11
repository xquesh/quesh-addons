import assert from 'node:assert/strict';
import {
    createBerserkTracker, GROUP_BERSERK_ID, levelCommand, settingCommand,
    SOLO_BERSERK_ID, updateBerserkTracker
} from '../src/addons/pocket-berserk/data.js';

const tracker = createBerserkTracker();
assert.equal(updateBerserkTracker(tracker, { settings: { action: 'INIT', list: [
    { id: 34, d: { v: { v: 0 }, common: { v: 1 }, elite: { v: 1 }, elite2: { v: 0 }, lvlmin: { v: -12 }, lvlmax: { v: 13 } } },
    { 35: { v: 1, common: 1, elite: 0, elite2: 1, lvlmin: -20, lvlmax: 8 } }
] } }), true);
assert.deepEqual(tracker.modes[SOLO_BERSERK_ID], { v: false, common: true, elite: true, elite2: false, lvlmin: -12, lvlmax: 13 });
assert.deepEqual(tracker.modes[GROUP_BERSERK_ID], { v: true, common: true, elite: false, elite2: true, lvlmin: -20, lvlmax: 8 });
assert.equal(updateBerserkTracker(tracker, { party: { members: { 7: { id: 7 }, 9: { id: 9 } } }, h: { oplvl: 244 } }), true);
assert.equal(tracker.inParty, true);
assert.equal(tracker.heroLevel, 244);
updateBerserkTracker(tracker, { party: {} });
assert.equal(tracker.inParty, false);
updateBerserkTracker(tracker, { settings: { id: 34, key: 'elite2', v: 1 } });
assert.equal(tracker.modes[34].elite2, true);
updateBerserkTracker(tracker, { settings: { list: { 35: { v: 0, lvlmin: -15 } } } });
assert.equal(tracker.modes[35].v, false);
assert.equal(tracker.modes[35].lvlmin, -15);
assert.equal(settingCommand(34, '', true), 'settings&action=update&id=34&v=1');
assert.equal(settingCommand(35, 'common', false), 'settings&action=update&id=35&key=common&v=0');
assert.equal(levelCommand(34, 'lvlmin', -99), 'settings&action=update&id=34&key=lvlmin&v=-50');
assert.equal(levelCommand(35, 'lvlmax', 99), 'settings&action=update&id=35&key=lvlmax&v=13');

console.log('OK: Kieszonkowy berserk śledzi tryb solo/grupy i generuje bezpieczne komendy ustawień');
