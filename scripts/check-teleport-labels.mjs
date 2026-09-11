import assert from 'node:assert/strict';
import { labelForItem, parseCustomLabels, parseItemStats, sanitizeLabel, serializeCustomLabels, teleportTarget } from '../src/addons/teleport-labels/data.js';

const teleport = { id: 1, name: 'Kamień teleportujący', stat: 'rarity=unique;teleport=1224,10,20' };
assert.deepEqual(parseItemStats(teleport), { rarity: 'unique', teleport: '1224,10,20' });
assert.deepEqual(teleportTarget(teleport), { type: 'map', key: '1224' });
assert.equal(labelForItem(teleport), 'KEND');
assert.equal(labelForItem({ stat: 'custom_teleport=99999,1,1' }), 'TP');
const summon = { name: 'Zwój przywołania drużyny na herosa Domina Ecclesiae', stat: 'townlimit=1' };
assert.deepEqual(teleportTarget(summon), { type: 'summon', key: 'Domina Ecclesiae' });
assert.equal(labelForItem(summon), 'DOMI');
assert.equal(labelForItem(teleport, { 1224: 'moja baza' }), 'MOJA BAZ');
assert.equal(sanitizeLabel('<bardzo-długi>'), '<BARDZO-');
const custom = parseCustomLabels('1224=ith\nname:Domina Ecclesiae=dom\nbłędny');
assert.deepEqual(custom, { 1224: 'ITH', 'name:Domina Ecclesiae': 'DOM' });
assert.equal(serializeCustomLabels(custom), '1224=ITH\nname:Domina Ecclesiae=DOM');
console.log('OK: Podpisownik rozpoznaje teleporty, custom_teleport, przywołania oraz własne etykiety');
