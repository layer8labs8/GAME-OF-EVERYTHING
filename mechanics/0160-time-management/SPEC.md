# 0160-time-management: Grand Hotel Rush

A fast-paced multi-station hospitality and queue orchestration simulation inspired by Diner Dash and Hotel Giant. Players act as General Manager of the bustling Grand Hotel, coordinating front-desk keycard check-ins, bellhop luggage deliveries, gourmet room-service trays, and rapid housekeeping turnovers while maintaining guest satisfaction across strict patience timers.

## Core Pillars & Mechanics

- **Guest Lifecycle & Multi-Station Routing**:
  Each arriving guest progresses through sequential hotel service requests:
  - `Stage 0: Check-In`: Guest queues at front desk awaiting room assignment.
  - `Stage 1: Bellhop Luggage`: Delivering bags to guest room floor.
  - `Stage 2: Room Service`: Delivering ordered meals/beverages to occupied room.
  - `Stage 3: Housekeeping Cleaning`: Scrubbing and making beds after guest checkout to free the room for the next visitor.
- **Patience Timers & Hotel Reputation**:
  - `patience`: Each active guest request has a decaying patience clock (10 to 18 turns). Fast completion awards 5-star reviews and generous tips; delays reduce ratings.
  - `reputation`: Overall hotel star satisfaction rating (0-100%). Dropping to 0 causes hotel closure!
  - `capital`: Operating revenue ($). Earned on room charges and tips; spent hiring assistants and facility upgrades.
  - `walkouts`: Count of disgruntled guests who stormed out due to expired patience.
  - `servedGuests`: Total count of happily accommodated patrons.
- **Hotel Operations & Actions**:
  - `action:check_in_guest:<guestId>`: Issues keycard and assigns room (-10 energy, moves guest to room).
  - `action:dispatch_bellhop:<guestId>`: Delivers luggage cart to guest room (-8 energy, satisfies bag request).
  - `action:deliver_room_service:<guestId>`: Serves gourmet culinary tray (-12 energy, satisfies dining request).
  - `action:clean_vacant_room:<roomId>`: Housekeeping turnover restoring room to pristine cleanliness.
  - `action:serve_welcome_cocktails`: Complimentary drinks to all waiting guests in lobby (+4 patience across all active guests).
  - `action:hire_assistant_bellhop`: Permanently boosts luggage speed and reduces energy drain (-$200).
  - `action:hire_express_maid`: Permanently speeds up housekeeping room turnover (-$220).
  - `action:manager_espresso_break`: Sipping double espresso in the back office (+35 energy).
- **Victory & Defeat**:
  - Victory: Successfully serve at least 15 hotel guests with >= 85% Hotel Reputation and >= $3,000 Capital.
  - Defeat: 5 angry guest walkouts or reputation drops to 0 (hotel condemned).
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `energy`: integer (0 to 100)
- `capital`: integer (starts at 350)
- `reputation`: integer (starts at 80)
- `rooms`: array of objects
  - `id`: integer (1 to 4)
  - `status`: string ('clean', 'occupied', 'dirty')
  - `guestId`: string or null
- `guests`: array of objects
  - `id`: string
  - `name`: string
  - `stage`: integer (0: check-in, 1: luggage, 2: room service, 3: checkout)
  - `roomId`: integer or null
  - `patience`: integer (turns remaining)
  - `reward`: integer
- `upgrades`: object
  - `hasAssistantBellhop`: boolean
  - `hasExpressMaid`: boolean
- `nextGuestId`: integer
- `servedGuests`: integer
- `walkouts`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
