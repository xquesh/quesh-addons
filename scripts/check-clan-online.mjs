import assert from 'node:assert/strict';
import { filterMembers, hasClan, memberLevel, onlineMembers, parseClanMembers, sortMembers, stripClanMembers } from '../src/addons/clan-online/data.js';

const raw = [
    7, 'Żerca', 200, 250, 'm', 'Ithan', 10, 11, 1, 0, 'mage.png',
    8, 'Ala', 120, 0, 'h', 'Torneg', 2, 3, 2, 12345, 'hunter.png',
    9, 'Borys', 300, 0, 'w', 'Ithan', 5, 6, 3, 0, 'warrior.png'
];
const parsed = parseClanMembers(raw);
assert.equal(parsed.length, 3);
assert.deepEqual(onlineMembers(raw).map(member => member.id), [7, 9]);
assert.equal(memberLevel(parsed[0]), '200|250m');
assert.deepEqual(filterMembers(parsed, 'ithan').map(member => member.id), [7, 9]);
assert.deepEqual(filterMembers(parsed, '250m').map(member => member.id), [7]);
assert.deepEqual(filterMembers(parsed, 'wojownik').map(member => member.id), [9]);
assert.deepEqual(sortMembers(onlineMembers(raw), 'level-desc').map(member => member.id), [9, 7]);
assert.deepEqual(sortMembers(onlineMembers(raw), 'name').map(member => member.id), [9, 7]);
assert.equal(hasClan({ Engine: { hero: { d: { clan: 42 } } } }), true);
assert.equal(hasClan({ Engine: { hero: { d: { clan: 0 } } } }), false);
assert.equal(hasClan({}), null);
const latePacket = [{ e: 'ok' }, { members: raw, keep: true }];
assert.equal(stripClanMembers(latePacket), true);
assert.equal(Object.hasOwn(latePacket[1], 'members'), false);
assert.equal(latePacket[1].keep, true);

console.log('OK: Klanowicze online parsuje rekordy 11-polowe, filtruje online, wyszukuje, sortuje i blokuje późne odpowiedzi natywnego okna');
