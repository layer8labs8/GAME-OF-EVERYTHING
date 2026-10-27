const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createState,
  legalActions,
  step,
  isOver,
  score,
  MAX_TICKS,
  HERO_MAX_HP,
  CORE_MAX_HP
} = require('./www/logic.js');

test('createState initializes lane highway, heroes, towers, and cores', () => {
  const s = createState(42);
  assert.equal(s.tick, 1);
  assert.equal(s.playerHero.hp, HERO_MAX_HP);
  assert.equal(s.playerHero.pos, 1);
  assert.equal(s.enemyHero.pos, 5);
  assert.equal(s.playerCore.hp, CORE_MAX_HP);
  assert.equal(s.enemyCore.hp, CORE_MAX_HP);
  assert.equal(s.done, false);
});

test('legalActions provides movements, hero attack, and tactical spells', () => {
  const s = createState(101);
  const actions = legalActions(s);

  assert.ok(actions.includes('tick'));
  assert.ok(actions.includes('move_left'));
  assert.ok(actions.includes('move_right'));
  assert.ok(actions.includes('hero_attack'));
  assert.ok(actions.includes('ability_shockwave'));
  assert.ok(actions.includes('ability_rally'));
});

test('move_right shifts hero forward towards enemy territory', () => {
  const s = createState(202);
  const initialPos = s.playerHero.pos;

  const res = step(s, 'move_right');
  assert.equal(s.playerHero.pos, initialPos + 1);
  assert.ok(res.reward > 0);
});

test('hero_attack inflicts damage on opposing frontline units', () => {
  const s = createState(303);
  s.playerHero.pos = 3;
  s.minions.push({ id: 99, team: 'enemy', pos: 3, hp: 40, maxHp: 40, attack: 10 });

  const initialMinionHp = s.minions.find(m => m.id === 99).hp;
  step(s, 'hero_attack');
  const target = s.minions.find(m => m.id === 99);
  assert.ok(target.hp < initialMinionHp);
});

test('ability_shockwave deals area-of-effect damage to sector enemies', () => {
  const s = createState(404);
  s.playerHero.pos = 2;
  s.minions.push({ id: 101, team: 'enemy', pos: 2, hp: 40, maxHp: 40, attack: 10 });
  const initialMana = s.playerHero.mana;

  step(s, 'ability_shockwave');
  assert.equal(s.playerHero.mana, initialMana - 30);
  assert.ok(!s.minions.some(m => m.id === 101)); // Wiped by 45 dmg
});

test('ability_rally buffs and heals allied minion cadre', () => {
  const s = createState(505);
  s.playerHero.pos = 1;
  const alliedMinion = s.minions.find(m => m.team === 'player' && m.pos === 1);
  const initialAttack = alliedMinion.attack;

  step(s, 'ability_rally');
  assert.ok(alliedMinion.attack > initialAttack);
});

test('rest_mana restores mana and hero vitality', () => {
  const s = createState(606);
  s.playerHero.mana = 40;
  s.playerHero.hp = 120;

  step(s, 'rest_mana');
  assert.equal(s.playerHero.mana, 70);
  assert.equal(s.playerHero.hp, 135);
});

test('destroying enemy ancient base core achieves victory', () => {
  const s = createState(707);
  s.enemyCore.hp = 10;
  s.playerHero.pos = 6;

  step(s, 'hero_attack');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'player');
  assert.equal(s.result, 'victory');
  assert.equal(isOver(s), true);
  assert.ok(score(s) > 500);
});

test('player ancient core destruction triggers defeat', () => {
  const s = createState(808);
  s.playerCore.hp = 5;
  // Put an enemy minion at base 0 to deliver final blow
  s.minions = [{ id: 88, team: 'enemy', pos: 0, hp: 40, maxHp: 40, attack: 10 }];

  step(s, 'tick');
  assert.equal(s.done, true);
  assert.equal(s.winner, 'enemy');
  assert.equal(s.result, 'defeat');
});

test('illegal action throws error without state corruption', () => {
  const s = createState(909);
  s.playerHero.mana = 10; // Not enough for shockwave
  const snapshot = JSON.stringify(s);

  assert.throws(() => {
    step(s, 'ability_shockwave');
  }, /Illegal action/);

  assert.equal(JSON.stringify(s), snapshot);
});

test('same seed and orders produce strictly deterministic Action RTS battle', () => {
  const s1 = createState(1414);
  const s2 = createState(1414);

  const orders = ['move_right', 'move_right', 'ability_shockwave', 'tick'];
  for (const act of orders) {
    if (legalActions(s1).includes(act) && legalActions(s2).includes(act)) {
      step(s1, act);
      step(s2, act);
    }
  }

  assert.deepEqual(s1, s2);
});
