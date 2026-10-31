# 0051: Spelling - Rune Scribe

A word-crafting puzzle game. The player steps into the circle of a mystical arcane scriptorium where a hexagonal hive of 7 letter runes glows with power. Words must be constructed using only these 7 runes, with the mandatory center rune anchored in every spell. Discovering longer words and the legendary 7-rune Pangram advances the player toward the Archmage rank before their ink runs dry.

## Core Rules

1. **Rune Hive & Letters**:
   - 7 unique letters: 1 mandatory Center Rune and 6 Outer Runes.
   - Letters can be used repeatedly without restriction in any single word.
   - Every valid word must:
     - Contain at least 4 letters.
     - Include the Center Rune at least once.
     - Consist solely of letters present in the 7-rune hive.
     - Match a valid entry in the ancient lexicon.

2. **Scoring & Pangrams**:
   - 4-letter words: 1 point.
   - 5+ letter words: 1 point per letter (e.g. 6 letters = 6 points).
   - **Pangram**: any word that incorporates all 7 unique runes awards a +7 bonus points!
   - Ranking thresholds:
     - Beginner: 0 pts
     - Apprentice: 25 pts
     - Scholar: 60 pts
     - Archmage: 100 pts (Target Score)

3. **Actions**:
   - `add_letter:<CHAR>`: appends the specified rune to the current spell transcription.
   - `delete_letter`: removes the trailing letter from current transcription.
   - `clear`: wipes the current transcription.
   - `shuffle`: rearranges the 6 outer runes around the center rune for fresh perspective.
   - `submit`: validates and commits the transcribed spell.
   - `submit_word:<WORD>`: directly transcribes and commits an unfound word from the lexicon.

4. **Limits & End Conditions**:
   - `turnsLeft`: 30 transcription attempts (ink limit).
   - Target Score: 100 points.
   - Victory: `score >= targetScore`.
   - Defeat: `turnsLeft <= 0` while `score < targetScore`.
