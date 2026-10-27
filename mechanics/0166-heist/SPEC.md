# 0166-heist: Vault Infiltrator

A high-stakes tactical heist simulation inspired by *Payday*, *Monaco: What's Yours Is Mine*, and *Ocean's Eleven*. Players orchestrate an elite crew of thieves infiltrating the First Federal Reserve across four security rings, looping CCTV feeds, neutralizing guards, thermal-drilling the titanium vault, bagging millions in gold and diamonds, and escaping into the getaway van before SWAT sweeps the facility.

## Core Pillars & Mechanics

- **Stealth & Alarm Dynamics**:
  - `suspicion`: (0-100%). Sinks or rises based on camera detection, unhidden bodies, and drill noise.
  - `alarmTriggered`: If suspicion reaches 100%, facility enters lockdown and police assault waves begin.
  - `pagersRemaining`: Radio responses (starts at 4). Neutralizing a guard consumes 1 pager response; running out triggers immediate alarm.
  - `crewHealth`: (0-100%). Physical survivability during loud assault shootouts. Restored with first aid kits.
- **Facility Security Zones**:
  - `0: Perimeter Alley`: Getaway van rendezvous, ventilation ingress.
  - `1: Security Monitoring Hub`: CCTV servers, keycard lockers, laser corridors.
  - `2: Vault Antechamber`: Armed guards, biometric scanner, heavy blast doors.
  - `3: Titanium Deep Vault`: Safe deposit boxes, gold bullion cages, the central pedestal holding the Imperial Diamond.
- **Loot & Extraction Economy**:
  - `cashStash`: Bond bundles ($50,000 each).
  - `goldBullion`: Solid bars ($100,000 each).
  - `imperialDiamond`: Master gem ($500,000).
  - `totalLootValue`: Aggregate secured bounty.
- **Tactical Actions**:
  - `action:recon_surveillance`: Scouts guard patterns and security camera rotations.
  - `action:hack_camera_loop`: Infiltrator loops video feed in current zone.
  - `action:silent_guard_takedown`: Silently subdues guard and answers radio pager.
  - `action:deploy_emp_jammer`: Scrambles electronics and suppresses alarms for several turns.
  - `action:pick_security_lock`: Unlocks security gates and keycard panels.
  - `action:start_thermal_drill`: Deploys heavy magnetic thermal drill on vault door.
  - `action:service_drill`: Fixes drill bit jam and restarts combustion.
  - `action:bag_cash`: Bags loose cash stacks in vault.
  - `action:bag_gold`: Bags solid gold bullion in vault.
  - `action:bag_imperial_diamond`: Steals the crown prize of the First Federal Reserve!
  - `action:defend_against_swat`: Returns suppressing fire against SWAT response teams during loud phase.
  - `action:advance_to_zone:<zoneId>`: Traverses between perimeter, hub, antechamber, and vault.
  - `action:escape_in_getaway_van`: Rendezvous with getaway van in Zone 0 with stolen loot.
- **Victory & Defeat**:
  - Victory: Infiltrate deep vault, bag the Imperial Diamond, return to Zone 0, and escape with >= $500,000 in loot!
  - Defeat: Crew health drops to 0 or turns reach maxTurns (120).

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0-120)
- `maxTurns`: 120
- `zone`: integer (0-3)
- `suspicion`: integer (0-100)
- `alarmTriggered`: boolean
- `pagersRemaining`: integer (starts at 4)
- `crewHealth`: integer (100)
- `cctvLooped`: array of boolean (4 zones)
- `doorUnlocked`: array of boolean (4 zones)
- `drillDeployed`: boolean
- `drillProgress`: integer (0-100)
- `drillJammed`: boolean
- `vaultOpened`: boolean
- `hasImperialDiamond`: boolean
- `cashBags`: integer
- `goldBags`: integer
- `lootValue`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
