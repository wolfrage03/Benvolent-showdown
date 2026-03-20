/* ═══════════════════════════════════════
   COMMENTARY — commentary.js
═══════════════════════════════════════ */

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ═══════ BOWLING PROMPTS ═══════ */

const bowlingPrompts = [
  "╔═ BOWLER'S TURN ═══════════════════╗\n  🎯 Send your number ( 1 – 6 ) in DM\n╚═══════════════════════════════════╝",
  "╔═ DELIVER THE BALL ════════════════╗\n  ⚡ Choose a number between 1 – 6\n╚═══════════════════════════════════╝",
  "╔═ BOWL YOUR LINE ══════════════════╗\n  🏐 Enter your number ( 1 – 6 )\n╚═══════════════════════════════════╝",
  "╔═ TIME TO BOWL ════════════════════╗\n  🔥 Bowler, send your number!\n╚═══════════════════════════════════╝",
  "╔═ WAITING FOR BOWLER ══════════════╗\n  ⏳ Pick a number ( 1 – 6 )\n╚═══════════════════════════════════╝",
  "╔═ DECEIVE THE BATTER ══════════════╗\n  😈 Send your number ( 1 – 6 )!\n╚═══════════════════════════════════╝",
  "╔═ WHAT'S YOUR DELIVERY? ═══════════╗\n  👀 Batter is ready — enter 1 – 6\n╚═══════════════════════════════════╝",
  "╔═ MIND GAME ON ════════════════════╗\n  🧠 Choose wisely between 1 – 6\n╚═══════════════════════════════════╝",
  "╔═ WICKET OR RUNS? ═════════════════╗\n  🎯 Bowler, enter your number!\n╚═══════════════════════════════════╝",
  "╔═ PRESSURE IS BUILDING ════════════╗\n  😤 Send your delivery ( 1 – 6 )\n╚═══════════════════════════════════╝",
  "╔═ ATTACK THE STUMPS ═══════════════╗\n  💥 Enter 1 – 6 immediately!\n╚═══════════════════════════════════╝",
  "╔═ BALL IN HAND ════════════════════╗\n  🔔 Bowler, respond with 1 – 6\n╚═══════════════════════════════════╝",
  "╔═ STRATEGIC BOWLING ═══════════════╗\n  🧩 Choose your number now!\n╚═══════════════════════════════════╝",
  "╔═ BATTLE IN PROGRESS ══════════════╗\n  ⚔️  Bowler, send 1 – 6\n╚═══════════════════════════════════╝",
];

/* ═══════ BATTER PROMPTS ═══════ */

const batterPrompts = [
  "╔═ BATTER'S TURN ═══════════════════╗\n  🏏 Send your number ( 0 – 6 )\n╚═══════════════════════════════════╝",
  "╔═ FACE THE DELIVERY ═══════════════╗\n  🎯 Choose a number between 0 – 6\n╚═══════════════════════════════════╝",
  "╔═ PLAY YOUR SHOT ══════════════════╗\n  🚀 Enter your number ( 0 – 6 )\n╚═══════════════════════════════════╝",
  "╔═ TIME TO SCORE ═══════════════════╗\n  🔥 Batter, send your number!\n╚═══════════════════════════════════╝",
  "╔═ WAITING FOR BATTER ══════════════╗\n  ⏳ Pick a number ( 0 – 6 )\n╚═══════════════════════════════════╝",
  "╔═ SMASH IT ════════════════════════╗\n  💥 Send your number ( 0 – 6 )!\n╚═══════════════════════════════════╝",
  "╔═ WHAT'S YOUR MOVE? ═══════════════╗\n  👀 Bowler is ready — enter 0 – 6\n╚═══════════════════════════════════╝",
  "╔═ MIND GAME ON ════════════════════╗\n  🧠 Choose wisely between 0 – 6\n╚═══════════════════════════════════╝",
  "╔═ BOUNDARY OR WICKET? ═════════════╗\n  🎯 Batter, enter your number!\n╚═══════════════════════════════════╝",
  "╔═ PRESSURE IS BUILDING ════════════╗\n  😈 Send your shot ( 0 – 6 )\n╚═══════════════════════════════════╝",
  "╔═ QUICK SHOT NEEDED ═══════════════╗\n  🏃 Enter 0 – 6 immediately!\n╚═══════════════════════════════════╝",
  "╔═ BALL DELIVERED ══════════════════╗\n  🔔 Batter, respond with 0 – 6\n╚═══════════════════════════════════╝",
  "╔═ STRATEGIC PLAY ══════════════════╗\n  🧩 Choose your number now!\n╚═══════════════════════════════════╝",
  "╔═ BATTLE IN PROGRESS ══════════════╗\n  ⚔️  Batter, send 0 – 6\n╚═══════════════════════════════════╝",
];

/* ═══════ RUN LINES ═══════ */

const runLines = {
  0: [
    "╔═ DOT BALL ════════════════════════╗\n  🎯 Beaten! No run scored.\n  🧱 Defended solidly.\n╚═══════════════════════════════════╝",
    "╔═ DOT BALL ════════════════════════╗\n  🔒 Tight line — dot ball!\n  💪 Bowler wins this one.\n╚═══════════════════════════════════╝",
    "╔═ DOT BALL ════════════════════════╗\n  😤 Can't get it away.\n  ⚡ Good length delivery.\n╚═══════════════════════════════════╝",
    "╔═ DOT BALL ════════════════════════╗\n  🛡️  Played out safely.\n  🎯 No room to work with.\n╚═══════════════════════════════════╝",
    "╔═ DOT BALL ════════════════════════╗\n  🧊 Frozen on the crease!\n  😬 Couldn't score off that.\n╚═══════════════════════════════════╝",
  ],
  1: [
    "╔═ SINGLE ══════════════════════════╗\n  🏃 Quick single taken!\n  👟 Smart running between wickets.\n╚═══════════════════════════════════╝",
    "╔═ SINGLE ══════════════════════════╗\n  1️⃣  Nudged away for one.\n  🔄 Keeps the scoreboard ticking.\n╚═══════════════════════════════════╝",
    "╔═ SINGLE ══════════════════════════╗\n  ✅ Rotates the strike.\n  🧠 Smart cricket on display.\n╚═══════════════════════════════════╝",
    "╔═ SINGLE ══════════════════════════╗\n  1️⃣  Worked into the gap.\n  💨 Good running — strike rotated.\n╚═══════════════════════════════════╝",
    "╔═ SINGLE ══════════════════════════╗\n  🎯 Pushed to mid-on — one!\n  🏃 Sharp running from both ends.\n╚═══════════════════════════════════╝",
  ],
  2: [
    "╔═ TWO RUNS ════════════════════════╗\n  2️⃣  Driven well — two runs!\n  👟 Excellent running.\n╚═══════════════════════════════════╝",
    "╔═ TWO RUNS ════════════════════════╗\n  🏃 Good placement — two!\n  📈 Keeps the momentum going.\n╚═══════════════════════════════════╝",
    "╔═ TWO RUNS ════════════════════════╗\n  2️⃣  Pushed into the gap.\n  🔄 Two more to the total.\n╚═══════════════════════════════════╝",
    "╔═ TWO RUNS ════════════════════════╗\n  ✌️  Nicely placed for two.\n  💨 Running hard — great effort.\n╚═══════════════════════════════════╝",
    "╔═ TWO RUNS ════════════════════════╗\n  🎯 Clipped off the pads — two!\n  🏃 Come back for the second!\n╚═══════════════════════════════════╝",
  ],
  3: [
    "╔═ THREE RUNS ══════════════════════╗\n  3️⃣  Excellent shot — three runs!\n  🏃 Outstanding running!\n╚═══════════════════════════════════╝",
    "╔═ THREE RUNS ══════════════════════╗\n  🔥 Driven hard — comes back for 3!\n  👏 Great determination.\n╚═══════════════════════════════════╝",
    "╔═ THREE RUNS ══════════════════════╗\n  3️⃣  Good placement — three taken.\n  💨 Brilliant between the wickets.\n╚═══════════════════════════════════╝",
    "╔═ THREE RUNS ══════════════════════╗\n  ✅ Three more added.\n  🎯 Smart cricket — took the risk.\n╚═══════════════════════════════════╝",
  ],
  4: [
    "╔═ FOUR! 🏏 ════════════════════════╗\n  🟩 Cracked through the covers!\n  💥 Elegant — boundary!\n╚═══════════════════════════════════╝",
    "╔═ FOUR! 🏏 ════════════════════════╗\n  4️⃣  Driven beautifully — FOUR!\n  🔥 Timed to perfection!\n╚═══════════════════════════════════╝",
    "╔═ FOUR! 🏏 ════════════════════════╗\n  🎯 Whipped off the pads — FOUR!\n  ⚡ Too good for the fielder!\n╚═══════════════════════════════════╝",
    "╔═ FOUR! 🏏 ════════════════════════╗\n  💨 Cut shot — screams to the fence!\n  👏 Brilliant strokeplay!\n╚═══════════════════════════════════╝",
    "╔═ FOUR! 🏏 ════════════════════════╗\n  🏏 Flicked through mid-wicket!\n  📈 Four more on the board!\n╚═══════════════════════════════════╝",
    "╔═ FOUR! 🏏 ════════════════════════╗\n  🔥 Punched through extra cover!\n  🎆 The crowd loves that!\n╚═══════════════════════════════════╝",
    "╔═ FOUR! 🏏 ════════════════════════╗\n  🪃 Reverse swept — FOUR!\n  😱 Outfoxed the bowler!\n╚═══════════════════════════════════╝",
    "╔═ FOUR! 🏏 ════════════════════════╗\n  🚀 Uppercut over point — FOUR!\n  💥 Audacious strokeplay!\n╚═══════════════════════════════════╝",
  ],
  5: [
    "╔═ FIVE! ⭐ ════════════════════════╗\n  5️⃣  Brilliant — five runs!\n  🏃 Incredible running — FIVE!\n╚═══════════════════════════════════╝",
    "╔═ FIVE! ⭐ ════════════════════════╗\n  ⭐ Superb placement — five taken!\n  💨 Outfield sprint — no chance!\n╚═══════════════════════════════════╝",
    "╔═ FIVE! ⭐ ════════════════════════╗\n  5️⃣  Rare score — five runs!\n  🔥 Shot plus misfield — FIVE!\n╚═══════════════════════════════════╝",
    "╔═ FIVE! ⭐ ════════════════════════╗\n  🌟 Drive plus overthrow — FIVE!\n  😱 Chaos in the outfield!\n╚═══════════════════════════════════╝",
  ],
  6: [
    "╔═ SIX! 🚀 ════════════════════════╗\n  6️⃣  MAXIMUM! Out of the ground!\n  🚀 Massive hit — into the crowd!\n╚═══════════════════════════════════╝",
    "╔═ SIX! 🚀 ════════════════════════╗\n  💥 HUGE SIX! Cleared the ropes!\n  🔥 Absolutely launched!\n╚═══════════════════════════════════╝",
    "╔═ SIX! 🚀 ════════════════════════╗\n  🌪️  Swings hard — SIX! Gone!\n  😱 Effortless power hitting!\n╚═══════════════════════════════════╝",
    "╔═ SIX! 🚀 ════════════════════════╗\n  🎆 SIX over long-on!\n  👑 What a shot — out of here!\n╚═══════════════════════════════════╝",
    "╔═ SIX! 🚀 ════════════════════════╗\n  🏏 Lofted over mid-wicket — SIX!\n  🚀 Incredible strike!\n╚═══════════════════════════════════╝",
    "╔═ SIX! 🚀 ════════════════════════╗\n  💣 Pulled over square leg — SIX!\n  🔥 No chance for anyone!\n╚═══════════════════════════════════╝",
    "╔═ SIX! 🚀 ════════════════════════╗\n  🎯 Slog swept — SIX!\n  😤 Pure brute force!\n╚═══════════════════════════════════╝",
    "╔═ SIX! 🚀 ════════════════════════╗\n  👊 Smashed straight — SIX!\n  💥 Didn't even watch it land!\n╚═══════════════════════════════════╝",
  ],
  wicket: [
    "╔═ WICKET! 💥 ══════════════════════╗\n  💥 OUT! Clean bowled!\n  😱 Stumps shattered!\n╚═══════════════════════════════════╝",
    "╔═ WICKET! 💥 ══════════════════════╗\n  🎯 GONE! Trapped plumb in front!\n  😤 Has to walk back!\n╚═══════════════════════════════════╝",
    "╔═ WICKET! 💥 ══════════════════════╗\n  💀 OUT! Brilliant delivery!\n  👏 Couldn't survive that!\n╚═══════════════════════════════════╝",
    "╔═ WICKET! 💥 ══════════════════════╗\n  ⚡ BOWLED HIM! What a delivery!\n  😱 Couldn't read it at all!\n╚═══════════════════════════════════╝",
    "╔═ WICKET! 💥 ══════════════════════╗\n  🔥 OUT! Numbers matched — gone!\n  💥 Couldn't survive!\n╚═══════════════════════════════════╝",
    "╔═ WICKET! 💥 ══════════════════════╗\n  😈 WICKET! Game opens up!\n  🎯 Right in the slot — OUT!\n╚═══════════════════════════════════╝",
    "╔═ WICKET! 💥 ══════════════════════╗\n  💣 CAUGHT! Didn't middle it.\n  😬 Early exit for the batter!\n╚═══════════════════════════════════╝",
    "╔═ WICKET! 💥 ══════════════════════╗\n  ⚡ DISMISSED! Played on!\n  😱 Off the inside edge — gone!\n╚═══════════════════════════════════╝",
    "╔═ WICKET! 💥 ══════════════════════╗\n  🎉 TIMBER! Middle stump gone!\n  😤 Couldn't cope with that!\n╚═══════════════════════════════════╝",
    "╔═ WICKET! 💥 ══════════════════════╗\n  💀 OUT! Beaten by the length!\n  😮 Walked into that one!\n╚═══════════════════════════════════╝",
  ],
};

/* ═══════ MILESTONES ═══════ */

const milestones = {

  fifty: [
    "╔═ FIFTY! ══════════════════════════╗\n  💯 Brilliant half-century!\n  👏 Pure timing and control!\n╚═══════════════════════════════════╝",
    "╔═ 50 RUNS ═════════════════════════╗\n  🔥 Raises the bat — well played!\n  🎯 Holding the innings together!\n╚═══════════════════════════════════╝",
    "╔═ HALF CENTURY ════════════════════╗\n  👑 A classy knock under pressure!\n  💪 Leading from the front!\n╚═══════════════════════════════════╝",
    "╔═ 50 UP! ══════════════════════════╗\n  🚀 Reaches fifty in style!\n  🏏 Crowd appreciates the effort!\n╚═══════════════════════════════════╝",
    "╔═ FIFTY! ══════════════════════════╗\n  🎆 What a knock — fifty up!\n  😍 Batter in supreme form!\n╚═══════════════════════════════════╝",
  ],

  hundred: [
    "╔═ CENTURY! ════════════════════════╗\n  💯🔥 WHAT A HUNDRED!\n  🏏 Absolute batting masterclass!\n╚═══════════════════════════════════╝",
    "╔═ 100 RUNS ════════════════════════╗\n  👑 Raises the bat proudly!\n  🎆 A knock to remember!\n╚═══════════════════════════════════╝",
    "╔═ TON UP! ═════════════════════════╗\n  🚀 Century in grand fashion!\n  🏟️  Crowd on its feet!\n╚═══════════════════════════════════╝",
    "╔═ HUNDRED! ════════════════════════╗\n  💥 Dominating performance!\n  🔥 Bowlers had no answers!\n╚═══════════════════════════════════╝",
    "╔═ CENTURY! ════════════════════════╗\n  🎊 Three figures — what a player!\n  😱 Unstoppable today!\n╚═══════════════════════════════════╝",
  ],

  duck: [
    "╔═ DUCK! ═══════════════════════════╗\n  🦆 Gone without scoring!\n  😬 Not his day today!\n╚═══════════════════════════════════╝",
    "╔═ OUT FOR 0 ═══════════════════════╗\n  💥 Big blow for the team!\n  😓 Early disappointment!\n╚═══════════════════════════════════╝",
    "╔═ GOLDEN DUCK ═════════════════════╗\n  ⚡ First ball — gone!\n  😱 Shock dismissal!\n╚═══════════════════════════════════╝",
    "╔═ DUCK! ═══════════════════════════╗\n  🧊 Pressure got to him!\n  💔 Walks back empty-handed!\n╚═══════════════════════════════════╝",
    "╔═ DUCK! ═══════════════════════════╗\n  😮 Couldn't get off the mark!\n  💀 Disaster for the team!\n╚═══════════════════════════════════╝",
  ],

  partnership50: [
    "╔═ 50 PARTNERSHIP ══════════════════╗\n  🤝 Solid stand building up!\n  📈 Momentum shifting!\n╚═══════════════════════════════════╝",
    "╔═ FIFTY STAND ═════════════════════╗\n  🧱 Strong foundation laid!\n  👏 Excellent teamwork!\n╚═══════════════════════════════════╝",
    "╔═ PARTNERSHIP 50 ══════════════════╗\n  🔄 Rotating strike brilliantly!\n  🎯 Bowlers under pressure!\n╚═══════════════════════════════════╝",
    "╔═ 50 TOGETHER ═════════════════════╗\n  💪 Building a crucial partnership!\n  🏏 Smart cricket on display!\n╚═══════════════════════════════════╝",
  ],

  partnership100: [
    "╔═ 100 PARTNERSHIP ═════════════════╗\n  🔥 Massive stand!\n  🏏 Bowlers completely dominated!\n╚═══════════════════════════════════╝",
    "╔═ CENTURY STAND ═══════════════════╗\n  👑 Incredible partnership!\n  🎆 Pure domination!\n╚═══════════════════════════════════╝",
    "╔═ 100 TOGETHER ════════════════════╗\n  🚀 Big partnership milestone!\n  💪 Rock-solid batting!\n╚═══════════════════════════════════╝",
    "╔═ PARTNERSHIP 100 ═════════════════╗\n  📈 Game slipping from bowlers!\n  🔥 What a stand!\n╚═══════════════════════════════════╝",
  ],

  threeFer: [
    "╔═ 3 WICKETS ═══════════════════════╗\n  🔥 Bowler on fire!\n  🎯 Precision bowling!\n╚═══════════════════════════════════╝",
    "╔═ 3-FER ═══════════════════════════╗\n  💪 Excellent spell!\n  🏏 Breaking the backbone!\n╚═══════════════════════════════════╝",
    "╔═ THREE WICKETS ═══════════════════╗\n  ⚡ Strikes again!\n  😈 Total control!\n╚═══════════════════════════════════╝",
    "╔═ 3 DOWN ══════════════════════════╗\n  📉 Batting under pressure!\n  🔥 What a performance!\n╚═══════════════════════════════════╝",
  ],

  fourFer: [
    "╔═ 4 WICKETS ═══════════════════════╗\n  💪 Destroying the lineup!\n  🔥 Unstoppable today!\n╚═══════════════════════════════════╝",
    "╔═ 4-FER ═══════════════════════════╗\n  🎯 Clinical bowling!\n  👏 Brilliant effort!\n╚═══════════════════════════════════╝",
    "╔═ FOUR WICKETS ════════════════════╗\n  ⚡ Another one bites the dust!\n  😱 What a spell!\n╚═══════════════════════════════════╝",
    "╔═ 4 DOWN ══════════════════════════╗\n  📉 Batting collapsing fast!\n  🔥 Bowler dominating!\n╚═══════════════════════════════════╝",
  ],

  fiveFer: [
    "╔═ 5 WICKETS! ══════════════════════╗\n  🎉 FIVE-WICKET HAUL!\n  👑 Legendary spell!\n╚═══════════════════════════════════╝",
    "╔═ 5-FER ═══════════════════════════╗\n  🔥 Absolute domination!\n  💥 Too hot to handle!\n╚═══════════════════════════════════╝",
    "╔═ FIVE WICKETS ════════════════════╗\n  🚀 Historic performance!\n  🏏 Pure brilliance!\n╚═══════════════════════════════════╝",
    "╔═ 5 DOWN ══════════════════════════╗\n  😱 Team in deep trouble!\n  🔥 Bowler unstoppable!\n╚═══════════════════════════════════╝",
  ],

  sixFer: [
    "╔═ 6 WICKETS ═══════════════════════╗\n  😱 Unbelievable spell!\n  💀 Single-handed destruction!\n╚═══════════════════════════════════╝",
    "╔═ 6-FER ═══════════════════════════╗\n  🔥 Total carnage!\n  🏏 Batters clueless!\n╚═══════════════════════════════════╝",
    "╔═ SIX WICKETS ═════════════════════╗\n  ⚡ Wickets falling like dominoes!\n  😈 Ruthless bowling!\n╚═══════════════════════════════════╝",
    "╔═ 6 DOWN ══════════════════════════╗\n  📉 Complete collapse!\n  🔥 What a spell!\n╚═══════════════════════════════════╝",
  ],

  hattrick: [
    "╔═ HAT-TRICK! 🎩 ═══════════════════╗\n  🎩 THREE IN THREE!\n  😱 Absolute carnage — hat-trick!\n╚═══════════════════════════════════╝",
    "╔═ HAT-TRICK! 🔥 ═══════════════════╗\n  🔥 BOWLER DOES IT!\n  💀 Three consecutive wickets!\n╚═══════════════════════════════════╝",
    "╔═ HAT-TRICK! ⚡ ════════════════════╗\n  ⚡ UNREAL SCENES!\n  🎉 Historic moment in the game!\n╚═══════════════════════════════════╝",
    "╔═ HAT-TRICK! 👑 ═══════════════════╗\n  👑 Perfect hat-trick!\n  😈 Batters had no answers!\n╚═══════════════════════════════════╝",
  ],
};

/* ═══════ TEAM NAMES ═══════ */

const teamNames = [
  ["Red Hair Pirates",   "Demon Slayers XI"],
  ["Titan Shifters",     "Survey Corps"],
  ["Cursed Spirits",     "Jujutsu Sorcerers"],
  ["Akatsuki XI",        "Konoha Legends"],
  ["Gear Fifth FC",      "Gomu Gomu Stars"],
  ["Hashira Warriors",   "Lower Moon XI"],
  ["Saiyan Warriors",    "Z Fighters"],
  ["Soul Society",       "Espada XI"],
  ["Avengers XI",        "Hydra Strikers"],
  ["Shadow Monarchs",    "Hunter Guild"],
  ["Mumbai Indians",     "Chennai Kings"],
  ["Royal Challengers",  "Sunrisers"],
  ["Knight Riders",      "Rajasthan Royals"],
  ["Punjab Kings",       "Delhi Capitals"],
  ["Southern Brave",     "Oval Invincibles"],
  ["Trent Rockets",      "Welsh Fire"],
  ["Manchester Origin",  "London Spirit"],
  ["Northern Super",     "Birmingham Phoenix"],
  ["Cosmic Strikers",    "Galaxy Warriors"],
  ["Thunder Bolts",      "Storm Riders"],
  ["Iron Fists",         "Steel Shields"],
  ["Blaze United",       "Frost Giants"],
  ["Neon Hawks",         "Crimson Eagles"],
  ["Venom Vipers",       "Toxic Tigers"],
  ["Dragon Slayers",     "Phoenix Flames"],
];

/* ═══════ EXPORTS ═══════ */

function randomLine(key)            { return pick(runLines[key] || [`▸ ${key}`]); }
function randomMilestone(key)       { return pick(milestones[key] || [""]); }
function randomMilestoneLine(key)   { return pick(milestones[key] || [""]); }  // alias
function randomGif(key)             { return null; }  // placeholder — add file IDs when collected
function randomBowlingPrompt()      { return pick(bowlingPrompts); }
function randomBatterPrompt()       { return pick(batterPrompts); }
function getRandomTeams()           { return pick(teamNames); }

module.exports = {
  randomLine,
  randomMilestone,
  randomMilestoneLine,
  randomGif,
  randomBowlingPrompt,
  randomBatterPrompt,
  getRandomTeams,
};