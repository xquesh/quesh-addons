import assert from 'node:assert/strict';
import { hotkeyLabel, inviteCandidates, matchesHotkey, RELATION, senderName, shouldAcceptInvite } from '../src/addons/quick-group/data.js';

const settings = { inviteRandos: false, randomInviteOrder: false, acceptAll: false, acceptFriend: true, acceptClan: false, acceptAlly: false };
const others = [
    { id: 2, relation: RELATION.FRIEND, x: 20, y: 20 },
    { id: 3, relation: RELATION.CLAN, x: 8, y: 8 },
    { id: 4, relation: RELATION.ALLY, x: 9, y: 9 },
    { id: 5, relation: RELATION.NONE, x: 10, y: 11 },
    { id: 6, relation: RELATION.NONE, x: 30, y: 30 }
];
assert.deepEqual(inviteCandidates(others, { x: 10, y: 10 }, new Set(['3']), new Set(['4']), settings).map(other => other.id), [2]);
assert.deepEqual(inviteCandidates(others, { x: 10, y: 10 }, new Set(), new Set(), { ...settings, inviteRandos: true }).map(other => other.id), [2, 3, 4, 5]);
assert.equal(senderName('Zaproszenie od [b]Kolega[/b]'), 'Kolega');
assert.equal(senderName('Zaproszenie od <b>Klanowicz</b>'), 'Klanowicz');
assert.equal(shouldAcceptInvite(settings, { relation: RELATION.FRIEND }), true);
assert.equal(shouldAcceptInvite(settings, { relation: RELATION.CLAN }), false);
assert.equal(matchesHotkey({ code: 'KeyG', ctrlKey: true, altKey: false, shiftKey: false }, { code: 'KeyG', ctrlKey: true }), true);
assert.equal(hotkeyLabel({ code: 'KeyG', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+G');
console.log('OK: Szybka grupa filtruje relacje, sąsiedztwo, grupę, stany walki i zaproszenia');
