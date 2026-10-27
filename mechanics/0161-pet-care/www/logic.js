// 0161-pet-care: Paws & Whiskers - Pure Bot Contract Logic
// Deterministic, zero DOM, pure state machine.

function nextRand(state) {
  let s = (state.prngState ^ (state.prngState << 13)) >>> 0;
  s = (s ^ (s >>> 17)) >>> 0;
  s = (s ^ (s << 5)) >>> 0;
  state.prngState = s;
  return (s >>> 0) / 4294967296;
}

const PET_TEMPLATES = [
  { name: 'Barnaby', species: 'Golden Retriever Pup' },
  { name: 'Mochi', species: 'Calico Kitten' },
  { name: 'Pip', species: 'Fluffy Lop Bunny' },
  { name: 'Ziggy', species: 'Amazon Parrot' }
];

function spawnPet(state) {
  const idx = Math.floor(nextRand(state) * PET_TEMPLATES.length);
  const tpl = PET_TEMPLATES[idx];
  const pet = {
    id: 'pet_' + state.nextPetId++,
    name: tpl.name,
    species: tpl.species,
    hunger: 55,
    happiness: 60,
    hygiene: 55,
    health: 75,
    energy: 70
  };
  state.pets.push(pet);
}

function createState(seed = 12345) {
  const s = (typeof seed === 'number' ? seed : 12345) >>> 0 || 1;
  const state = {
    seed: s,
    prngState: s,
    turns: 0,
    maxTurns: 120,
    funds: 350,
    reputation: 80,
    supplies: {
      kibble: 5,
      shampoo: 4,
      treats: 4
    },
    pets: [],
    nextPetId: 1,
    adoptions: 0,
    neglectWarnings: 0,
    victory: false,
    defeat: false,
    gameMessage: 'Paws & Whiskers Sanctuary doors open! Care for your rescue companions.'
  };

  spawnPet(state);
  spawnPet(state);

  return state;
}

function isOver(state) {
  return Boolean(state.victory || state.defeat || state.turns >= state.maxTurns);
}

function score(state) {
  let val = state.funds;
  val += state.adoptions * 300;
  val += state.reputation * 15;
  val -= state.neglectWarnings * 250;
  if (state.victory) val += 3000;
  return Math.max(0, Math.floor(val));
}

function legalActions(state) {
  if (isOver(state)) return [];

  const actions = [];

  // General sanctuary management
  actions.push('action:cuddle_all_pets');

  if (state.funds >= 50) {
    actions.push('action:restock_sanctuary_supplies');
  }
  if (state.pets.length < 3) {
    actions.push('action:accept_rescue_pet');
  }

  // Pet care operations
  for (const p of state.pets) {
    if (state.supplies.kibble >= 1 && p.hunger < 100) {
      actions.push('action:feed_pet:' + p.id);
    }
    if (state.supplies.shampoo >= 1 && p.hygiene < 100) {
      actions.push('action:groom_and_bath:' + p.id);
    }
    if (p.energy >= 10 && p.happiness < 100) {
      actions.push('action:play_and_cuddle:' + p.id);
    }
    if (p.energy < 80) {
      actions.push('action:tuck_in_for_nap:' + p.id);
    }
    if (state.funds >= 35 && p.health < 100) {
      actions.push('action:vet_wellness_check:' + p.id);
    }
    if (p.hunger >= 75 && p.happiness >= 75 && p.hygiene >= 75 && p.health >= 75) {
      actions.push('action:process_adoption:' + p.id);
    }
  }

  return actions;
}

function step(state, action) {
  if (isOver(state)) {
    return { reward: 0, done: true };
  }

  const validActions = legalActions(state);
  if (!validActions.includes(action)) {
    throw new Error('Illegal pet care action "' + action + '" in current sanctuary state');
  }

  const oldScore = score(state);

  if (action === 'action:cuddle_all_pets') {
    for (const p of state.pets) {
      p.happiness = Math.min(100, p.happiness + 8);
    }
    state.gameMessage = 'Spent gentle moments giving cuddles to all sanctuary animals.';
  } else if (action === 'action:restock_sanctuary_supplies') {
    state.funds -= 50;
    state.supplies.kibble += 4;
    state.supplies.shampoo += 3;
    state.supplies.treats += 3;
    state.gameMessage = 'Delivered fresh organic kibble, lavender shampoo, and healthy treats.';
  } else if (action === 'action:accept_rescue_pet') {
    spawnPet(state);
    state.gameMessage = 'Welcomed a sweet new rescue companion to an open kennel.';
  } else if (action.startsWith('action:feed_pet:')) {
    const pId = action.split(':')[2];
    const p = state.pets.find(x => x.id === pId);
    state.supplies.kibble -= 1;
    p.hunger = Math.min(100, p.hunger + 35);
    p.happiness = Math.min(100, p.happiness + 10);
    state.gameMessage = 'Served delicious bowl of kibble to ' + p.name + '! Tummy full and happy.';
  } else if (action.startsWith('action:groom_and_bath:')) {
    const pId = action.split(':')[2];
    const p = state.pets.find(x => x.id === pId);
    state.supplies.shampoo -= 1;
    p.hygiene = Math.min(100, p.hygiene + 40);
    p.happiness = Math.min(100, p.happiness + 10);
    state.gameMessage = 'Gave warm bubble bath and fur brush to ' + p.name + '! Clean and smelling great.';
  } else if (action.startsWith('action:play_and_cuddle:')) {
    const pId = action.split(':')[2];
    const p = state.pets.find(x => x.id === pId);
    p.energy = Math.max(0, p.energy - 12);
    p.happiness = Math.min(100, p.happiness + 30);
    state.gameMessage = 'Threw tennis ball and played lively games with ' + p.name + '!';
  } else if (action.startsWith('action:tuck_in_for_nap:')) {
    const pId = action.split(':')[2];
    const p = state.pets.find(x => x.id === pId);
    p.energy = Math.min(100, p.energy + 45);
    p.happiness = Math.min(100, p.happiness + 8);
    state.gameMessage = p.name + ' curled up for a peaceful nap in their plush cushion bed.';
  } else if (action.startsWith('action:vet_wellness_check:')) {
    const pId = action.split(':')[2];
    const p = state.pets.find(x => x.id === pId);
    state.funds -= 35;
    p.health = Math.min(100, p.health + 30);
    state.gameMessage = 'Dr. Taylor administered routine checkup and vitamin drops for ' + p.name + '.';
  } else if (action.startsWith('action:process_adoption:')) {
    const pId = action.split(':')[2];
    const pIdx = state.pets.findIndex(x => x.id === pId);
    const p = state.pets[pIdx];
    state.adoptions += 1;
    state.funds += 260;
    state.reputation = Math.min(100, state.reputation + 6);
    state.gameMessage = 'Joyful graduation! ' + p.name + ' was adopted into a loving forever family! +$260 adoption donation.';
    state.pets.splice(pIdx, 1);
  }

  // Turn advance & Pet biological decay
  state.turns += 1;

  for (const p of state.pets) {
    p.hunger = Math.max(0, p.hunger - 3);
    p.happiness = Math.max(0, p.happiness - 2);
    p.hygiene = Math.max(0, p.hygiene - 2);
    if (p.hunger < 20 || p.hygiene < 20) {
      p.health = Math.max(0, p.health - 5);
    }
    if (p.health < 20 && nextRand(state) < 0.25) {
      state.neglectWarnings += 1;
      state.reputation = Math.max(0, state.reputation - 15);
      state.gameMessage += ' (Warning: Welfare citation issued for pet distress! -15% Reputation.)';
    }
  }

  if (state.pets.length === 0) {
    spawnPet(state);
  }

  // Win / Loss evaluation
  if (state.adoptions >= 8 && state.reputation >= 85 && state.funds >= 2500) {
    state.victory = true;
    state.gameMessage = 'Victory! Paws & Whiskers acclaimed Premier National Animal Sanctuary!';
  } else if (state.neglectWarnings >= 3) {
    state.defeat = true;
    state.gameMessage = 'Defeat: 3 animal welfare citations issued! Sanctuary closed by humane society.';
  } else if (state.pets.some(p => p.health <= 0)) {
    state.defeat = true;
    state.gameMessage = 'Defeat: Critical animal emergency! Sanctuary operating license revoked.';
  } else if (state.turns >= state.maxTurns) {
    if (state.adoptions >= 6 && state.funds >= 1800) {
      state.victory = true;
      state.gameMessage = 'Victory: Sanctuary season concluded with dozens of happy pet adoptions!';
    } else {
      state.gameMessage = 'Sanctuary operating year concluded.';
    }
  }

  const newScore = score(state);
  const reward = newScore - oldScore;
  const done = isOver(state);

  return { reward, done };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
