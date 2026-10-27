# 0161-pet-care: Paws & Whiskers

A heartfelt pet rescue sanctuary and animal companionship simulation inspired by Nintendogs and Petz. Players direct a cozy animal rehabilitation haven, attending to puppies, kittens, bunnies, and parrots through nourishing feedings, bubble baths, grooming, playtime fetch, veterinary wellness checkups, and finding warm forever homes through adoptions.

## Core Pillars & Mechanics

- **Rescue Companions & Behavioral Vitals**:
  Each animal companion maintains individual health and wellbeing indicators:
  - `hunger`: Satiation level (0-100%). Sinks over turns; restored through gourmet kibble and fresh treats.
  - `happiness`: Emotional affection (0-100%). Elevated by petting, toys, and playing fetch.
  - `hygiene`: Fur and coat cleanliness (0-100%). Restored with warm bubble baths and brushing.
  - `health`: Physical vitality (0-100%). Boosted through routine veterinary wellness exams.
  - `energy`: Playfulness stamina (0-100%). Restored with cozy plush bed naps.
- **Sanctuary Supplies & Operations**:
  - `funds`: Community donations and adoption grants ($).
  - `reputation`: Public shelter rating (0-100%).
  - `supplies`:
    - `kibble`: Nutritious animal food bags.
    - `shampoo`: Organic lavender pet soap.
    - `treats`: Training chew snacks.
  - `adoptions`: Total count of fully rehabilitated pets placed into loving forever families.
  - `neglectWarnings`: Citations issued if any pet's vitals drop into critical distress (< 15%).
- **Caring Actions**:
  - `action:feed_pet:<petId>`: Serves meal (+35 hunger, +10 happiness, consumes 1 kibble).
  - `action:groom_and_bath:<petId>`: Warm bubble bath and fur brush (+40 hygiene, consumes 1 shampoo).
  - `action:play_and_cuddle:<petId>`: Engages with toys and affection (+30 happiness, -12 pet energy).
  - `action:tuck_in_for_nap:<petId>`: Puts pet to sleep in plush bed (+45 energy).
  - `action:vet_wellness_check:<petId>`: Administers vitamins and medical care (+30 health, -$35).
  - `action:process_adoption:<petId>`: Available when pet reaches >= 75% across hunger, happiness, hygiene, and health (+1 adoption, +$250 donation).
  - `action:restock_sanctuary_supplies`: Orders bulk kibble, shampoo, and treats (-$50).
  - `action:accept_rescue_pet`: Welcomes a new rescue animal into an open kennel.
- **Victory & Defeat**:
  - Victory: Successfully adopt out 8 healthy companions with >= 85% Sanctuary Reputation and >= $2,500 Funds.
  - Defeat: 3 neglect warnings or any pet health reaches 0.
  - Max Turns: 120 turns guarantee.

## State Schema
- `seed`: integer
- `prngState`: integer
- `turns`: integer (0 to 120)
- `maxTurns`: 120
- `funds`: integer (starts at 300)
- `reputation`: integer (starts at 80)
- `supplies`: object
  - `kibble`: integer
  - `shampoo`: integer
  - `treats`: integer
- `pets`: array of objects
  - `id`: string
  - `name`: string
  - `species`: string ('Dog', 'Cat', 'Bunny', 'Parrot')
  - `hunger`: integer (0 to 100)
  - `happiness`: integer (0 to 100)
  - `hygiene`: integer (0 to 100)
  - `health`: integer (0 to 100)
  - `energy`: integer (0 to 100)
- `nextPetId`: integer
- `adoptions`: integer
- `neglectWarnings`: integer
- `victory`: boolean
- `defeat`: boolean
- `gameMessage`: string
