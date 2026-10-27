// Logic module for 0050-word-game (Word Forge)
// Pure deterministic cascading 4x4 word puzzle

const GRID_SIZE = 4;
const TARGET_SCORE = 300;
const MAX_TURNS = 20;

const LETTER_BAG =
  "AAAAAAAAA" +
  "BB" +
  "CC" +
  "DDDD" +
  "EEEEEEEEEEEE" +
  "FF" +
  "GGG" +
  "HH" +
  "IIIIIIIII" +
  "J" +
  "K" +
  "LLLL" +
  "MM" +
  "NNNNNN" +
  "OOOOOOOO" +
  "PP" +
  "Q" +
  "RRRRRR" +
  "SSSS" +
  "TTTTTT" +
  "UUUU" +
  "VV" +
  "WW" +
  "X" +
  "YY" +
  "Z";

const LETTER_POINTS = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
};

const DICTIONARY = [
  "ACT", "ADD", "AGE", "AGO", "AID", "AIM", "AIR", "ALL", "AND", "ANY",
  "APE", "ARC", "ARM", "ART", "ASH", "ASK", "ATE", "AWE", "AXE", "BAD",
  "BAG", "BAR", "BAT", "BAY", "BED", "BEE", "BEG", "BET", "BID", "BIG",
  "BIT", "BOW", "BOX", "BOY", "BUS", "BUT", "BUY", "CAN", "CAP", "CAR",
  "CAT", "COW", "CRY", "CUP", "CUT", "DAY", "DOG", "DOT", "DRY", "DUE",
  "EAR", "EAT", "EGG", "END", "EYE", "FAN", "FAR", "FAT", "FEW", "FIT",
  "FLY", "FOG", "FOR", "FOX", "FUN", "GAP", "GAS", "GET", "GOD", "GUN",
  "GUY", "HAT", "HIT", "HOT", "ICE", "ILL", "INK", "INN", "JAR", "JAW",
  "JOY", "KEY", "KID", "LAW", "LEG", "LET", "LIE", "LIP", "LOG", "LOW",
  "MAN", "MAP", "MAY", "NET", "NEW", "NOD", "NOT", "NOW", "NUT", "OAK",
  "ODD", "OFF", "OIL", "OLD", "ONE", "OUT", "OWL", "PAN", "PAY", "PEN",
  "PET", "PIG", "PIN", "PIT", "POT", "RAW", "RED", "RID", "ROW", "RUN",
  "SAD", "SAW", "SAY", "SEA", "SEE", "SET", "SEW", "SHE", "SIN", "SIT",
  "SIX", "SKY", "SON", "SPY", "SUN", "TAX", "TEA", "TEN", "TIE", "TIP",
  "TOE", "TOP", "TOY", "TWO", "USE", "WAR", "WAY", "WET", "WIN", "YES",
  "YET", "ZOO",

  // 4-letter words
  "ABLE", "ACID", "AGED", "ALSO", "AREA", "ARMY", "AWAY", "BABY", "BACK",
  "BALL", "BAND", "BANK", "BASE", "BATH", "BEAR", "BEAT", "BEEN", "BELL",
  "BIRD", "BLOW", "BLUE", "BOAT", "BODY", "BONE", "BOOK", "BORN", "BOTH",
  "BOWL", "BURN", "BUSH", "BUSY", "CALL", "CALM", "CAME", "CAMP", "CARD",
  "CARE", "CASE", "CASH", "CAST", "CITY", "CLAY", "CLUB", "COAL", "COAT",
  "COLD", "COME", "COOK", "COOL", "COPE", "COPY", "CORE", "COST", "DARK",
  "DATA", "DATE", "DAWN", "DAYS", "DEAD", "DEAL", "DEAR", "DEEP", "DEER",
  "DESK", "DIED", "DIRT", "DISC", "DOES", "DONE", "DOOR", "DOSE", "DOWN",
  "DRAW", "DROP", "DRUG", "DUAL", "DUST", "DUTY", "EACH", "EARN", "EAST",
  "EASY", "EDGE", "ELSE", "EVEN", "EVER", "FACE", "FACT", "FAIL", "FAIR",
  "FALL", "FARM", "FAST", "FATE", "FEAR", "FEED", "FEEL", "FEET", "FELL",
  "FILE", "FILL", "FILM", "FIND", "FINE", "FIRE", "FIRM", "FISH", "FIVE",
  "FLAT", "FLOW", "FOOD", "FOOT", "FORD", "FORM", "FORT", "FOUR", "FREE",
  "FROM", "FULL", "FUND", "GAIN", "GAME", "GATE", "GAVE", "GEAR", "GIFT",
  "GIRL", "GIVE", "GLAD", "GOAL", "GOES", "GOLD", "GONE", "GOOD", "GRAY",
  "GREW", "GROW", "GULF", "HAIR", "HALF", "HALL", "HAND", "HANG", "HARD",
  "HARM", "HATE", "HAVE", "HEAD", "HEAR", "HEAT", "HELD", "HELL", "HELP",
  "HERO", "HIGH", "HILL", "HIRE", "HOLD", "HOLE", "HOLY", "HOME", "HOPE",
  "HOST", "HOUR", "HUGE", "HUNG", "HUNT", "HURT", "IDEA", "INCH", "INTO",
  "IRON", "ITEM", "JOIN", "JUMP", "JUST", "KEEP", "KEPT", "KICK", "KILL",
  "KIND", "KING", "KNEE", "KNEW", "KNOW", "LACK", "LADY", "LAID", "LAKE",
  "LAND", "LANE", "LAST", "LATE", "LEAD", "LEFT", "LESS", "LIFE", "LIFT",
  "LIKE", "LINE", "LINK", "LION", "LIST", "LIVE", "LOAD", "LOAN", "LOCK",
  "LONG", "LOOK", "LORD", "LOSE", "LOSS", "LOST", "LOVE", "LUCK", "MADE",
  "MAIL", "MAIN", "MAKE", "MALE", "MANY", "MARK", "MASS", "MEAL", "MEAN",
  "MEAT", "MEET", "MENU", "MILE", "MILK", "MIND", "MINE", "MISS", "MODE",
  "MOOD", "MOON", "MORE", "MOST", "MOVE", "MUCH", "NAME", "NAVY", "NEAR",
  "NECK", "NEED", "NEWS", "NEXT", "NICE", "NIGHT", "NINE", "NONE", "NOSE",
  "NOTE", "OKAY", "ONCE", "ONLY", "OPEN", "ORAL", "OVER", "PACE", "PACK",
  "PAGE", "PAID", "PAIN", "PAIR", "PARK", "PART", "PASS", "PAST", "PATH",
  "PEAK", "PICK", "PILE", "PLAN", "PLAY", "PLOT", "PLUG", "PLUS", "POEM",
  "POET", "POLL", "POOL", "POOR", "PORT", "POST", "PULL", "PURE", "PUSH",
  "RACE", "RAIL", "RAIN", "RANK", "RARE", "RATE", "READ", "REAL", "REAR",
  "RELY", "RENT", "REST", "RICE", "RICH", "RIDE", "RING", "RISE", "RISK",
  "ROAD", "ROCK", "ROLE", "ROLL", "ROOF", "ROOM", "ROOT", "ROSE", "RULE",
  "RUSH", "SAFE", "SAID", "SAIL", "SALE", "SALT", "SAME", "SAND", "SAVE",
  "SEAT", "SEED", "SEEK", "SEEM", "SEEN", "SELF", "SELL", "SEND", "SENT",
  "SHIP", "SHOE", "SHOP", "SHOT", "SHOW", "SHUT", "SICK", "SIDE", "SIGN",
  "SILK", "SITE", "SIZE", "SKIN", "SLOW", "SNOW", "SOFT", "SOIL", "SOLD",
  "SOLE", "SOME", "SONG", "SOON", "SOUL", "SOUP", "SPOT", "STAR", "STAY",
  "STEP", "STOP", "SUCH", "SUIT", "SURE", "TAKE", "TALE", "TALK", "TALL",
  "TANK", "TAPE", "TASK", "TEAM", "TEAR", "TELL", "TEND", "TERM", "TEST",
  "TEXT", "THAN", "THAT", "THEM", "THEN", "THEY", "THIN", "THIS", "THUS",
  "TIME", "TINY", "TOLD", "TOLL", "TONE", "TOOK", "TOOL", "TOUR", "TOWN",
  "TREE", "TRIP", "TRUE", "TUBE", "TURN", "TWIN", "TYPE", "UNIT", "UPON",
  "USED", "USER", "VARY", "VAST", "VERY", "VICE", "VIEW", "VOTE", "WAGE",
  "WAIT", "WAKE", "WALK", "WALL", "WANT", "WARM", "WASH", "WAVE", "WEAK",
  "WEAR", "WEEK", "WELL", "WENT", "WERE", "WEST", "WHAT", "WHEN", "WHOM",
  "WIDE", "WIFE", "WILD", "WILL", "WIND", "WINE", "WING", "WIPE", "WIRE",
  "WISE", "WISH", "WITH", "WOOD", "WORD", "WORK", "YARD", "YEAH", "YEAR",
  "ZERO", "ZONE",

  // 5-letter words
  "ABOUT", "ABOVE", "ACTOR", "ACUTE", "ADAPT", "ADMIT", "ADOPT", "ADULT",
  "AFTER", "AGAIN", "AGENT", "AGREE", "AHEAD", "ALARM", "ALBUM", "ALERT",
  "ALIKE", "ALIVE", "ALLOW", "ALONE", "ALONG", "ALTER", "AMONG", "ANGER",
  "ANGLE", "ANGRY", "APART", "APPLE", "APPLY", "ARENA", "ARGUE", "ARISE",
  "ARMED", "ARRAY", "ASIDE", "ASSET", "AUDIO", "AUDIT", "AVOID", "AWAIT",
  "AWAKE", "AWARD", "AWARE", "BADLY", "BAKER", "BASES", "BASIC", "BASIS",
  "BEACH", "BEGAN", "BEGIN", "BEGUN", "BEING", "BELOW", "BENCH", "BILLY",
  "BIRTH", "BLACK", "BLAME", "BLIND", "BLOCK", "BLOOD", "BOARD", "BOAST",
  "BOOST", "BOOTH", "BOUND", "BRAIN", "BRAND", "BREAD", "BREAK", "BREED",
  "BRIEF", "BRING", "BROAD", "BROKE", "BROWN", "BUILD", "BUILT", "BUYER",
  "CABLE", "CALIF", "CARRY", "CATCH", "CAUSE", "CHAIN", "CHAIR", "CHART",
  "CHASE", "CHEAP", "CHECK", "CHEST", "CHIEF", "CHILD", "CHINA", "CHOSE",
  "CIVIL", "CLAIM", "CLASS", "CLEAN", "CLEAR", "CLICK", "CLOCK", "CLOSE",
  "COACH", "COAST", "COULD", "COUNT", "COURT", "COVER", "CRAFT", "CRASH",
  "CRAZY", "CREAM", "CRIME", "CROSS", "CROWD", "CROWN", "CURLY", "CYCLE",
  "DAILY", "DANCE", "DATED", "DEALT", "DEATH", "DEBUT", "DELAY", "DEPTH",
  "DOING", "DOUBT", "DOZEN", "DRAFT", "DRAMA", "DRAWN", "DREAM", "DRESS",
  "DRIVE", "DROVE", "DYING", "EAGER", "EARLY", "EARTH", "EIGHT", "ELITE",
  "EMPTY", "ENEMY", "ENJOY", "ENTER", "ENTRY", "EQUAL", "ERROR", "EVENT",
  "EVERY", "EXACT", "EXIST", "EXTRA", "FAITH", "FALSE", "FAULT", "FIBER",
  "FIELD", "FIFTH", "FIFTY", "FIGHT", "FINAL", "FIRST", "FIXED", "FLASH",
  "FLEET", "FLOOR", "FLUID", "FOCUS", "FORCE", "FORTH", "FORTY", "FORUM",
  "FOUND", "FRAME", "FRANK", "FRAUD", "FRESH", "FRONT", "FRUIT", "FULLY",
  "FUNNY", "GIANT", "GIVEN", "GLASS", "GLOBE", "GOING", "GRACE", "GRADE",
  "GRAND", "GRANT", "GRASS", "GREAT", "GREEN", "GROSS", "GROUP", "GROWN",
  "GUARD", "GUESS", "GUEST", "GUIDE", "HAPPY", "HARRY", "HEART", "HEAVY",
  "HENCE", "HENRY", "HORSE", "HOTEL", "HOUSE", "HUMAN", "IDEAL", "IMAGE",
  "INDEX", "INNER", "INPUT", "ISSUE", "JAPAN", "JIMMY", "JOINT", "JONES",
  "JUDGE", "KNOWN", "LABEL", "LARGE", "LASER", "LATER", "LAUGH", "LAYER",
  "LEARN", "LEASE", "LEAST", "LEAVE", "LEGAL", "LEVEL", "LEWIS", "LIGHT",
  "LIMIT", "LINKS", "LIVES", "LOCAL", "LOGIC", "LOOSE", "LOWER", "LUCKY",
  "LUNCH", "LYING", "MAGIC", "MAJOR", "MAKER", "MARCH", "MARIA", "MATCH",
  "MAYBE", "MAYOR", "MEANT", "MEDIA", "METAL", "MIGHT", "MINOR", "MINUS",
  "MIXED", "MODEL", "MONEY", "MONTH", "MORAL", "MOTOR", "MOUNT", "MOUSE",
  "MOUTH", "MOVIE", "MUSIC", "NEEDS", "NEVER", "NEWLY", "NIGHT", "NOISE",
  "NORTH", "NOTED", "NOVEL", "NURSE", "OCCUR", "OCEAN", "OFFER", "OFTEN",
  "ORDER", "OTHER", "OUGHT", "PAINT", "PANEL", "PAPER", "PARTY", "PEACE",
  "PETER", "PHASE", "PHONE", "PHOTO", "PIECE", "PILOT", "PITCH", "PLACE",
  "PLAIN", "PLANE", "PLANT", "PLATE", "POINT", "POUND", "POWER", "PRESS",
  "PRICE", "PRIDE", "PRIME", "PRINT", "PRIOR", "PRIZE", "PROOF", "PROUD",
  "PROVE", "QUEEN", "QUICK", "QUIET", "QUITE", "RADIO", "RAISE", "RANGE",
  "RAPID", "RATIO", "REACH", "READY", "REFER", "RIGHT", "RIVAL", "RIVER",
  "ROBIN", "ROGER", "ROMAN", "ROUGH", "ROUND", "ROUTE", "ROYAL", "RURAL",
  "SCALE", "SCENE", "SCOPE", "SCORE", "SENSE", "SERVE", "SEVEN", "SHALL",
  "SHAPE", "SHARE", "SHARP", "SHEET", "SHELF", "SHELL", "SHIFT", "SHINE",
  "SHIRT", "SHOCK", "SHOOT", "SHORT", "SHOWN", "SIGHT", "SINCE", "SIXTH",
  "SIXTY", "SIZED", "SKILL", "SLEEP", "SLIDE", "SMALL", "SMART", "SMILE",
  "SMOKE", "SOLID", "SOLVE", "SORRY", "SOUND", "SOUTH", "SPACE", "SPARE",
  "SPEAK", "SPEED", "SPEND", "SPENT", "SPLIT", "SPOKE", "SPORT", "STAFF",
  "STAGE", "STAKE", "STAND", "START", "STATE", "STEAM", "STEEL", "STICK",
  "STILL", "STOCK", "STONE", "STOOD", "STORE", "STORM", "STORY", "STRIP",
  "STUDY", "STUFF", "STYLE", "SUGAR", "SUITE", "SUPER", "SWEET", "TABLE",
  "TAKEN", "TASTE", "TAXES", "TEACH", "TEETH", "TERRY", "TEXAS", "THANK",
  "THEFT", "THEIR", "THEME", "THERE", "THESE", "THICK", "THING", "THINK",
  "THIRD", "THOSE", "THREE", "THREW", "THROW", "TIGHT", "TIMES", "TIRED",
  "TITLE", "TODAY", "TOPIC", "TOTAL", "TOUCH", "TOUGH", "TOWER", "TRACK",
  "TRADE", "TRAIN", "TREAT", "TREND", "TRIAL", "TRIED", "TRIES", "TRUCK",
  "TRULY", "TRUST", "TRUTH", "TWICE", "UNDER", "UNDUE", "UNION", "UNITY",
  "UNTIL", "UPPER", "UPSET", "URBAN", "USAGE", "USUAL", "VALID", "VALUE",
  "VIDEO", "VIRUS", "VISIT", "VITAL", "VOICE", "WASTE", "WATCH", "WATER",
  "WHEEL", "WHERE", "WHICH", "WHILE", "WHITE", "WHOLE", "WHOSE", "WOMAN",
  "WOMEN", "WORLD", "WORRY", "WORSE", "WORST", "WORTH", "WOULD", "WOUND",
  "WRITE", "WRONG", "WROTE", "YIELD", "YOUNG", "YOUTH"
];

const DICT_SET = new Set(DICTIONARY);

function createRng(seed) {
  let s = (Math.imul(seed || 1, 1103515245) + 12345) & 0x7fffffff;
  return function() {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

function getRandomLetter(rng) {
  const idx = Math.floor(rng() * LETTER_BAG.length);
  return LETTER_BAG[idx];
}

function findWordPath(grid, word) {
  const w = word.toUpperCase();
  const len = w.length;
  if (len < 3) return null;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === w[0]) {
        const visited = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
        visited[r][c] = true;
        const path = [{ r, c }];

        if (dfs(grid, w, 1, r, c, visited, path)) {
          return path;
        }
      }
    }
  }
  return null;
}

function dfs(grid, word, idx, r, c, visited, path) {
  if (idx === word.length) return true;

  const target = word[idx];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        if (!visited[nr][nc] && grid[nr][nc] === target) {
          visited[nr][nc] = true;
          path.push({ r: nr, c: nc });
          if (dfs(grid, word, idx + 1, nr, nc, visited, path)) {
            return true;
          }
          path.pop();
          visited[nr][nc] = false;
        }
      }
    }
  }
  return false;
}

function createState(seed = 1) {
  const rng = createRng(seed);
  const grid = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(getRandomLetter(rng));
    }
    grid.push(row);
  }

  return {
    seed,
    turn: 0,
    turnsLeft: MAX_TURNS,
    score: 0,
    targetScore: TARGET_SCORE,
    wordsFound: 0,
    grid,
    lastWord: null,
    rngStep: 16,
    won: false,
    lost: false,
    done: false
  };
}

function isOver(state) {
  return state.done;
}

function score(state) {
  return state.score + (state.won ? 300 : 0) + state.turnsLeft * 10;
}

function legalActions(state) {
  if (state.done) return [];

  const actions = ["shuffle", "pass"];
  const foundWords = new Set();

  for (let i = 0; i < DICTIONARY.length; i++) {
    const word = DICTIONARY[i];
    if (findWordPath(state.grid, word)) {
      foundWords.add(word);
      if (foundWords.size >= 30) break;
    }
  }

  for (const w of foundWords) {
    actions.push(`submit:${w}`);
  }

  return actions;
}

function step(state, action) {
  if (state.done) {
    throw new Error("Game is already over");
  }

  const legal = legalActions(state);
  if (!legal.includes(action)) {
    throw new Error(`Illegal action: ${action}`);
  }

  let reward = 0;
  state.turnsLeft--;
  state.turn++;

  if (action === "pass") {
    // Passes turn
    reward -= 5;
  } else if (action === "shuffle") {
    // Reshuffle all grid tiles using PRNG
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const rng = createRng(state.seed + state.rngStep++);
        state.grid[r][c] = getRandomLetter(rng);
      }
    }
    reward += 5;
  } else if (action.startsWith("submit:")) {
    const word = action.slice(7).toUpperCase();
    const path = findWordPath(state.grid, word);
    if (!path) {
      throw new Error(`Word cannot be formed on grid: ${word}`);
    }

    // 1. Calculate word points
    let letterSum = 0;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      letterSum += LETTER_POINTS[ch] || 1;
    }
    const multiplier = Math.max(1, word.length - 2);
    const wordScore = letterSum * multiplier;

    state.score += wordScore;
    state.wordsFound++;
    state.lastWord = { word, score: wordScore };
    reward += wordScore;

    // 2. Clear tiles in path
    for (const p of path) {
      state.grid[p.r][p.c] = null;
    }

    // 3. Gravity: collapse non-empty tiles down
    for (let c = 0; c < GRID_SIZE; c++) {
      const colTiles = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        if (state.grid[r][c] !== null) {
          colTiles.push(state.grid[r][c]);
        }
      }
      // Fill remaining from top with new letters
      const needed = GRID_SIZE - colTiles.length;
      const newLetters = [];
      for (let k = 0; k < needed; k++) {
        const rng = createRng(state.seed + state.rngStep++);
        newLetters.push(getRandomLetter(rng));
      }

      const fullCol = newLetters.concat(colTiles);
      for (let r = 0; r < GRID_SIZE; r++) {
        state.grid[r][c] = fullCol[r];
      }
    }
  }

  // Evaluate end conditions
  if (state.score >= state.targetScore) {
    state.won = true;
    state.done = true;
    reward += 300;
  } else if (state.turnsLeft <= 0) {
    state.lost = true;
    state.done = true;
    reward -= 100;
  }

  return { reward, done: state.done };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GRID_SIZE,
    TARGET_SCORE,
    MAX_TURNS,
    LETTER_POINTS,
    DICTIONARY,
    findWordPath,
    createState,
    legalActions,
    step,
    isOver,
    score
  };
}
