import assert from 'node:assert/strict';
import { configuredBuild, inferBuild, normalizeBuilds, packetList, stateLabel } from '../src/addons/auto-abyss/data.js';
import { updateAbyssTracker } from '../src/addons/auto-abyss/runtime.js';

const builds = {
    1: { id: 1, name: 'EXP' },
    2: { id: 2, name: 'PVP wojownik' },
    3: { id: 3, name: 'Paladyn ogień' },
    4: { id: 4, name: 'Tytan wojownik' },
    bad: { name: 'Błędny' }
};

assert.deepEqual(normalizeBuilds(builds).map(build => build.id), [1, 2, 3, 4]);
assert.equal(inferBuild(builds, 'w')?.id, 2);
assert.equal(inferBuild(builds, 'p')?.id, 3);
assert.equal(inferBuild(builds, 'h')?.id, 1);
assert.equal(configuredBuild(builds, 'w', '3', 1)?.id, 3);
assert.equal(configuredBuild(builds, 'w', 'current', 1), null);
assert.equal(configuredBuild(builds, 'w', 'auto', 2), null);
assert.deepEqual(packetList([[{ matchmaking_state: 2 }], null]), [{ matchmaking_state: 2 }]);
assert.equal(stateLabel(3), 'Wybór wyposażenia');
assert.equal(stateLabel(99), 'Oczekiwanie na dane gry');
assert.deepEqual(updateAbyssTracker({}, { matchmaking_state: 3, matchmaking_confirmation: { accept: 0 }, matchmaking_preparation: { opponent_prof: 'm' } }), {
    state: 3, confirmation: { accept: 0 }, preparation: { opponent_prof: 'm' }
});
assert.deepEqual(updateAbyssTracker({}, { match_summary: { daily_stage: { id: 2, points_cur: 5, points_max: 8 } } }).progress, {
    stage: 3, current: 5, max: 8
});

console.log('OK: Auto Otchłań normalizuje zestawy, dobiera je pod profesję i rozpoznaje stany');
