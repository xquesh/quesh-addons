import assert from 'node:assert/strict';
import { characterList, sortedHeroes, heroTimers, countdown, referenceRelog, heroLevel } from '../src/addons/relogger/data.js';
const list = characterList([{ id: 1, nick: 'A', lvl: 30, world: 'fobos' }, { id: 2, nick: 'B', lvl: 200, world: 'fobos' }, { id: 3, nick: 'C', world: 'katahha' }, { id: 4, nick: 'Bad', world: 'example.org' }]);
assert.equal(list.length, 3);
assert.deepEqual(sortedHeroes(list, 'fobos', 'level-desc').map(hero => hero.id), ['2', '1']);
assert.equal(countdown(3661), '1:01:01');
assert.equal(countdown(-1), '00:00');
assert.equal(heroLevel({ lvl: 190, prof: 'tropiciel' }), '190t');
assert.equal(heroLevel({ lvl: 244, prof: 'Wojownik' }), '244w');
const timer = (presp, rest = {}) => ({ type: 2, heroData: { id: 1 }, name: 'E2', presp, ...rest });
assert.deepEqual(heroTimers([timer(900), timer(1100, { minResp: 950 }), timer(1200), timer(100, {}), timer(1001, { heroData: { id: 2 } })], '1', 1000).map(value => value.state), ['due', 'window', 'waiting']);
assert.equal(heroTimers(undefined, 1, 1000).length, 0);
const calls = [];
const page = {
    Engine: { allInit: true, hero: { d: { id: 1 } } },
    location: { replace: url => calls.push(url) }, getMainDomain: () => 'pl', getCookie: () => '1',
    setCookie: (...args) => calls.push(args)
};
assert.throws(() => referenceRelog(1, 'fobos', page), /już na tej postaci/);
assert.equal(referenceRelog(2, 'fobos', page), true);
assert.equal(calls[0][0], 'mchar_id'); assert.equal(calls[0][1], '2'); assert.equal(calls[0][4], 'margonem.pl'); assert.equal(calls[0][5], true);
assert.equal(calls[1], 'https://fobos.margonem.pl');
page.Engine.changePlayer = { id: 2 };
assert.equal(referenceRelog(3, 'katahha', page), false);
page.Engine.changePlayer.id = null; page.Engine.dialogue = {};
assert.equal(referenceRelog(3, 'katahha', page), false);
page.Engine.dialogue = false; page.Engine.allInit = false;
assert.equal(referenceRelog(3, 'katahha', page), false);
console.log('OK: lista postaci, timery i pojedyncza zmiana postaci dokładnie jak w referencji');
