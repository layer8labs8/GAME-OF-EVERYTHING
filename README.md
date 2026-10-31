<div align="center">

# Game of Everything

**Play 179 2D game mechanics in your browser, see how each one works, and use the code in your own game.**

### [Play now](https://layer8labs8.github.io/GAME-OF-EVERYTHING/)

No install or account needed.

![CI](https://github.com/layer8labs8/GAME-OF-EVERYTHING/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Status: early](https://img.shields.io/badge/status-early-orange.svg)

</div>

## What is this?

A game mechanic is the idea that makes a game work, such as matching three tiles, jumping over gaps, or building a deck of cards. Most games are built from a small set of these ideas.

This project keeps each mechanic as a small, working game. You can use it to:

- **Play:** try platformers, puzzles, card games, shooters, and more.
- **Learn:** read the rules and see exactly how a mechanic is built.
- **Build:** copy a mechanic into your own project under the MIT license.
- **Experiment:** let a bot play it, because the game logic runs without a screen.

The project is early. Every game is playable, but most still need better art, sound, and levels.

## Inside each game

Each game has its own folder in [`mechanics/`](mechanics), such as [`0017-court-rally`](mechanics/0017-court-rally):

| File | What it is |
|---|---|
| `www/index.html` | The game you play |
| `www/logic.js` | The rules, with no graphics, so they're easy to read and reuse |
| `SPEC.md` | The rules written in words |
| `test.js` | Tests that prove the rules work |

## Use a mechanic in your code

Most games share the same five functions. This bot plays a full match:

```js
const game = require('./mechanics/0017-court-rally/www/logic.js');

const state = game.createState(1); // The same seed gives the same game
while (!game.isOver(state)) {
  const actions = game.legalActions(state);
  game.step(state, actions[0]);
}
console.log(game.score(state));
```

To run a game on your own computer:

```bash
python -m http.server 8123
```

Then open <http://localhost:8123/mechanics/0017-court-rally/www/>.

## Help out

You can help without being an expert:

- **Improve a game:** add sound, levels, or a better feel.
- **Add a new game:** bring a mechanic that's missing.
- **Make it clearer:** explain a mechanic in plain words.
- **Report a problem:** tell us when a game breaks or feels wrong.

[Pick a starter issue](https://github.com/layer8labs8/GAME-OF-EVERYTHING/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22), then follow [CONTRIBUTING.md](CONTRIBUTING.md).

Want to support the project another way? You can [send a crypto tip](https://layer8labs8.github.io/GAME-OF-EVERYTHING/#support).

Games use original names, art, and levels. Rules and ideas can be shared, but another game's name, art, or text can't be copied. See [docs/LEGAL.md](docs/LEGAL.md).

## Progress

<!-- STATUS:START -->
**Playable: 179 / 179** `████████████████████████`

Logic with tests or better: 179 / 179 · Bot interface: 177 / 179 · Data levels: 6

| Stage | Mechanics |
|---|---|
| idea | 0 |
| spec | 0 |
| logic | 0 |
| playable | 179 |
| polished | 0 |
| shipped | 0 |

Full table: [registry/STATUS.md](registry/STATUS.md)
<!-- STATUS:END -->

## Learn more

[Vision](docs/VISION.md) · [Architecture](docs/ARCHITECTURE.md) · [Mechanic spec](docs/MECHANIC-SPEC.md) · [Levels](docs/LEVELS.md) · [Roadmap](docs/ROADMAP.md) · [Legal](docs/LEGAL.md) · [Security](SECURITY.md)

## License

[MIT](LICENSE)
