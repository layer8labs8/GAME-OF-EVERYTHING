# 0097-tactical: Tactical Breach

A close-quarters tactical (CQB) breach-and-clear simulation where the player commands a 3-man SWAT tactical team (Shield, Breacher, Scout) infiltrating a multi-room compound to eliminate fortified terrorists and disarm an active explosive device.

## Core Rules & Features
- **Tactical Floorplan**:
  - Room 0: Staging Entry Foyer (Cleared / Safe Zone).
  - Room 1: Security Office (2 Tangos, locked security door).
  - Room 2: Central Hallway (3 Tangos, open sightlines).
  - Room 3: Server Vault (2 Elite Tangos + Active Chemical Device).
  - Fog of War conceals room layouts, threats, and tangos until doors are breached.
- **Operator Roster**:
  - **Shield ("Pointman")**: 80 HP, Ballistic Riot Shield (absorbs 50% damage), Shotgun (30 dmg, Range 1). Flashbangs (Stuns room tangos for 1 turn).
  - **Breacher ("Hammer")**: 60 HP, Assault Rifle (25 dmg), Heavy Breaching Charges (Instantly destroys barricaded doors, staggering enemies).
  - **Scout ("Marksman")**: 50 HP, Marksman Carbine (40 dmg, Range 3). Smoke Grenades (Disrupts enemy sightlines).
- **Tactical Actions**:
  - `breach_door:{doorId}:{method}`:
    - `flashbang`: Throws stun grenade, blinds occupants, and forces entry.
    - `charge`: Uses explosive charge, blows door open, and staggers occupants.
    - `pick`: Silent lockpick entry without alerting adjacent rooms.
  - `advance_room:{roomId}`: Squad moves into breached room to establish firing angles.
  - `engage_target:{opId}:{tangoId}`: Direct shot against an identified tango in the room.
  - `defuse_device`: Spends operator turn disarming the chemical explosive device in Room 3.
  - `overwatch_door:{opId}`: Holds security angle on breached doorways against roaming hostiles.
  - `wait`: Steps tactical clock; device timer decrements, tangos return fire.
- **Threat Economy & Device Timer**:
  - Chemical explosive detonates after 20 tactical turns unless defused.
  - Tangos in breached rooms retaliate against exposed operators unless stunned.
- **Victory & Defeat**:
  - **Tactical Triumph**: All tangos eliminated AND explosive device successfully defused.
  - **Defeat**: Explosive detonates OR entire SWAT squad is neutralized.
- **Bot Contract**:
  - `createState(seed)`: Initializes compound floorplan, tango positions, operator kits, and timer.
  - `legalActions(state)`: Produces array of currently valid breach and tactical engagement commands.
  - `step(state, action)`: Applies tactical order, evaluates ballistic penetration, processes enemy return fire. Returns `{ reward, done }`.
  - `isOver(state)`: Returns whether mission objectives or mission failures occurred.
  - `score(state)`: Evaluates tangos eliminated, device defusal speed, and operator health preserved.
