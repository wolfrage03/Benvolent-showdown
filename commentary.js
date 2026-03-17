// ================= COMMENTARY DATA =================


const commentary = {

  0: [
    "Tight as a drum! No run.",
    "Beaten! Nothing off that delivery.",
    "Solid defence — straight to the fielder.",
    "Pressure building… dot ball!",
    "Right on the money, no scoring opportunity."
  ],

  1: [
    "Just a gentle push for one.",
    "Quick single taken!",
    "Soft hands, easy run.",
    "Rotating the strike nicely.",
    "Smart cricket — keeps the scoreboard ticking."
  ],

  2: [
    "Placed beautifully — they’ll come back for two!",
    "Good running between the wickets.",
    "In the gap! Comfortable couple.",
    "Excellent awareness — two more added.",
    "They hustle back for the second!"
  ],

  3: [
    "Into the deep — they’ll get three!",
    "Superb running, that’s three all the way.",
    "Chased hard… but three runs taken.",
    "Great placement and even better running!",
    "Turning ones into threes — brilliant effort."
  ],

  4: [
    "Cracked away! That’s four!",
    "Beautifully timed — races to the boundary!",
    "No stopping that — FOUR!",
    "Threaded the gap perfectly!",
    "Pure class — boundary!"
  ],

  5: [
    "Overthrows! That’s five runs gifted!",
    "Misfield and they’ll get five!",
    "Chaos in the field — five runs taken!",
    "That’s costly — five to the total!",
    "Extra runs courtesy of an overthrow!"
  ],

  6: [
    "That’s massive! SIX!",
    "High and handsome — out of the park!",
    "Clears the ropes with ease!",
    "What a strike! Maximum!",
    "That’s gone into the stands!"
  ],

  wicket: [
    "Cleaned him up!",
    "Gone! Big breakthrough!",
    "Straight to the fielder — taken!",
    "What a delivery — timber!",
    "That’s a huge wicket at this stage!"
  ],

  hattrick: [
    "Three in three! Unbelievable!",
    "That’s a hattrick! Magical spell!",
    "History made — three consecutive wickets!",
    "What a moment — hattrick hero!",
    "Hattrick ball… and he’s done it!"
  ],

  maiden: [
    "Maiden over! Absolute control.",
    "Six balls, no runs — brilliant bowling.",
    "Pressure cooker stuff — maiden!",
    "Tidy and disciplined — no scoring.",
    "Dot after dot — that’s a maiden!"
  ],

  fifty: [
    '╔═ FIFTY! ══════════════════════════╗\n  💯  Brilliant half-century!\n  👏  Pure timing and control!\n╚═══════════════════════════════════╝',
    '╔═ 50 RUNS ═════════════════════════╗\n  🔥  Raises the bat — well played!\n  🎯  Holding the innings together!\n╚═══════════════════════════════════╝',
    '╔═ HALF CENTURY ════════════════════╗\n  👑  A classy knock under pressure!\n  💪  Leading from the front!\n╚═══════════════════════════════════╝',
    '╔═ 50 UP! ══════════════════════════╗\n  🚀  Reaches fifty in style!\n  🏏  Crowd appreciates the effort!\n╚═══════════════════════════════════╝'
  ],

  hundred: [
    '╔═ CENTURY! ════════════════════════╗\n  💯🔥  WHAT A HUNDRED!\n  🏏  Absolute batting masterclass!\n╚═══════════════════════════════════╝',
    '╔═ 100 RUNS ════════════════════════╗\n  👑  Raises the bat proudly!\n  🎆  A knock to remember!\n╚═══════════════════════════════════╝',
    '╔═ TON UP! ═════════════════════════╗\n  🚀  Century in grand fashion!\n  🏟️  Crowd on its feet!\n╚═══════════════════════════════════╝',
    '╔═ HUNDRED! ════════════════════════╗\n  💥  Dominating performance!\n  🔥  Bowlers had no answers!\n╚═══════════════════════════════════╝'
  ],

  partnership50: [
    '╔═ 50 PARTNERSHIP ══════════════════╗\n  🤝  Solid stand building up!\n  📈  Momentum shifting!\n╚═══════════════════════════════════╝',
    '╔═ FIFTY STAND ═════════════════════╗\n  🧱  Strong foundation laid!\n  👏  Excellent teamwork!\n╚═══════════════════════════════════╝',
    '╔═ PARTNERSHIP 50 ══════════════════╗\n  🔄  Rotating strike brilliantly!\n  🎯  Bowlers under pressure!\n╚═══════════════════════════════════╝',
    '╔═ 50 TOGETHER ═════════════════════╗\n  💪  Building a crucial partnership!\n  🏏  Smart cricket on display!\n╚═══════════════════════════════════╝'
  ],

  partnership100: [
    '╔═ 100 PARTNERSHIP ═════════════════╗\n  🔥  Massive stand!\n  🏏  Bowlers completely dominated!\n╚═══════════════════════════════════╝',
    '╔═ CENTURY STAND ═══════════════════╗\n  👑  Incredible partnership!\n  🎆  Pure domination!\n╚═══════════════════════════════════╝',
    '╔═ 100 TOGETHER ════════════════════╗\n  🚀  Big partnership milestone!\n  💪  Rock-solid batting!\n╚═══════════════════════════════════╝',
    '╔═ PARTNERSHIP 100 ═════════════════╗\n  📈  Game slipping away from bowlers!\n  🔥  What a stand!\n╚═══════════════════════════════════╝'
  ],

  duck: [
    '╔═ DUCK! ═══════════════════════════╗\n  🦆  Gone without scoring!\n  😬  Not his day today!\n╚═══════════════════════════════════╝',
    '╔═ OUT FOR 0 ═══════════════════════╗\n  💥  Big blow for the team!\n  😓  Early disappointment!\n╚═══════════════════════════════════╝',
    '╔═ GOLDEN DUCK ═════════════════════╗\n  ⚡  First ball — gone!\n  😱  Shock dismissal!\n╚═══════════════════════════════════╝',
    '╔═ DUCK! ═══════════════════════════╗\n  🧊  Pressure got to him!\n  💔  Walks back empty-handed!\n╚═══════════════════════════════════╝'
  ],

  duckHattrick: [
    '╔═ DUCK HATTRICK! ══════════════════╗\n  🦆🦆🦆  Three ducks in a row!\n  😱  Total batting collapse!\n╚═══════════════════════════════════╝',
    '╔═ TRIPLE DUCKS ════════════════════╗\n  💀  Disaster for the batting side!\n  🔥  Bowler on fire!\n╚═══════════════════════════════════╝',
    '╔═ 3 DUCKS ═════════════════════════╗\n  😵  Unreal scenes out there!\n  🧨  Batting in ruins!\n╚═══════════════════════════════════╝',
    '╔═ DUCK HATTRICK ═══════════════════╗\n  ⚡  Three wickets, no runs!\n  😈  Brutal spell!\n╚═══════════════════════════════════╝'
  ],

  threeFer: [
    '╔═ 3 WICKETS ═══════════════════════╗\n  🔥  Bowler on fire!\n  🎯  Precision bowling!\n╚═══════════════════════════════════╝',
    '╔═ 3-FER ═══════════════════════════╗\n  💪  Excellent spell!\n  🏏  Breaking the backbone!\n╚═══════════════════════════════════╝',
    '╔═ THREE WICKETS ═══════════════════╗\n  ⚡  Strikes again!\n  😈  Total control!\n╚═══════════════════════════════════╝',
    '╔═ 3 DOWN ══════════════════════════╗\n  📉  Batting under pressure!\n  🔥  What a performance!\n╚═══════════════════════════════════╝'
  ],

  fourFer: [
    '╔═ 4 WICKETS ═══════════════════════╗\n  💪  Destroying the lineup!\n  🔥  Unstoppable today!\n╚═══════════════════════════════════╝',
    '╔═ 4-FER ═══════════════════════════╗\n  🎯  Clinical bowling!\n  👏  Brilliant effort!\n╚═══════════════════════════════════╝',
    '╔═ FOUR WICKETS ════════════════════╗\n  ⚡  Another one bites the dust!\n  😱  What a spell!\n╚═══════════════════════════════════╝',
    '╔═ 4 DOWN ══════════════════════════╗\n  📉  Batting collapsing fast!\n  🔥  Bowler dominating!\n╚═══════════════════════════════════╝'
  ],

  fiveFer: [
    '╔═ 5 WICKETS! ══════════════════════╗\n  🎉  FIVE-WICKET HAUL!\n  👑  Legendary spell!\n╚═══════════════════════════════════╝',
    '╔═ 5-FER ═══════════════════════════╗\n  🔥  Absolute domination!\n  💥  Too hot to handle!\n╚═══════════════════════════════════╝',
    '╔═ FIVE WICKETS ════════════════════╗\n  🚀  Historic performance!\n  🏏  Pure brilliance!\n╚═══════════════════════════════════╝',
    '╔═ 5 DOWN ══════════════════════════╗\n  😱  Team in deep trouble!\n  🔥  Bowler unstoppable!\n╚═══════════════════════════════════╝'
  ],

  sixFer: [
    '╔═ 6 WICKETS ═══════════════════════╗\n  😱  Unbelievable spell!\n  💀  Single-handed destruction!\n╚═══════════════════════════════════╝',
    '╔═ 6-FER ═══════════════════════════╗\n  🔥  Total carnage!\n  🏏  Batters clueless!\n╚═══════════════════════════════════╝',
    '╔═ SIX WICKETS ═════════════════════╗\n  ⚡  Wickets falling like dominoes!\n  😈  Ruthless bowling!\n╚═══════════════════════════════════╝',
    '╔═ 6 DOWN ══════════════════════════╗\n  📉  Complete collapse!\n  🔥  What a spell!\n╚═══════════════════════════════════╝'
  ]
};


// ================= PROMPTS ================= =================

const bowlingPrompts = [
  "🎯 Bowl now!\nType a number between 1 and 6.",
  "🚀 It’s your delivery!\nSend your bowling number quickly (1–6).",
  "⏳ Waiting for your ball…\nReply with a number from 1 to 6.",
  "🔥 Time to strike!\nEnter your bowling number (1–6).",
  "💣 Drop a deadly delivery!\nSend your number (1–6).",
  "👀 Batter is ready… can you outsmart them?\nType your bowling number now!",
  "🧠 Mind game starts here!\nChoose a number (1–6) and send it fast.",
  "🎯 Aim for the wicket!\nSend your secret bowling number.",
  "😈 Try to trap the batter!\nEnter your number (1–6).",
  "🧩 Strategic Move Required\nChoose your bowling number.",
  "🎲 Roll the magic number!\nSend 1–6.",
  "💥 Boom or Bust?\nChoose your bowling number!",
  "🪄 Cast your bowling spell!\nSend a number (1–6).",
  "🧨 Let’s see if you can explode the stumps!\nEnter your number."
];


const batterPrompts = [
  "🏏 Batter’s Turn!\nSend your number (0–6) now!",
  "🎯 Face the delivery!\nChoose a number between 0 and 6.",
  "🚀 Play your shot!\nEnter your number (0–6).",
  "🔥 Time to score!\nBatter, send your number!",
  "⏳ Waiting for the batter…\nPick a number (0–6).",
  "💥 Can you smash this one?\nSend your number (0–6)!",
  "👀 Bowler is ready…\nBatter, what’s your move? (0–6)",
  "🧠 Mind game ON!\nChoose wisely between 0–6.",
  "🎯 Boundary or wicket?\nBatter, enter your number!",
  "😈 Pressure is building!\nSend your shot (0–6).",
  "🏃 Quick shot needed!\nEnter 0–6 immediately!",
  "🔔 Ball delivered!\nBatter, respond with 0–6!",
  "🧩 Strategic Play Required\nChoose your number now!",
  "⚔️ Battle in progress!\nBatter, send 0–6."
];


// ================= TEAM NAMES =================

const teams = [
  "Mumbai Indians",
  "Chennai Super Kings",
  "Royal Challengers Bengaluru",
  "Kolkata Knight Riders",
  "Rajasthan Royals",
  "Delhi Capitals",
  "Sunrisers Hyderabad",
  "Gujarat Titans",
  "Sydney Sixers",
  "Perth Scorchers",
  "Melbourne Stars",
  "Brisbane Heat",
  "Oval Invincibles",
  "Southern Brave",
  "Manchester Originals",
  "London Spirit",
  "Paarl Royals",
  "Guyana Amazon Warriors",
  "Barbados Royals",
  "Seattle Orcas",
  "San Francisco Unicorns",
  "Cursed Spirits",
  "Gojo Infinity",
  "Straw Hat Raiders",
  "Red Hair Pirates",
  "Hidden Leaf Legends",
  "Akatsuki Storm",
  "Demon Slayers XI",
  "Hashira Hurricanes",
  "Saiyan Warriors",
  "Z Fighters XI",
  "Blade Breakers",
  "Dragon Emperor XI",
  "Phantom Troupe",
  "Nen Masters",
  "State Alchemists",
  "Elric Brothers XI",
  "Titan Shifters",
  "Survey Corps Strikers",
  "Soul Reapers XI",
  "Gotei 13 Warriors",
  "Hero Academia United",
  "Plus Ultra Strikers",
  "Blue Lock Strikers",
  "Egoist XI",
  "Hero Association",
  "Kira Dominion",
  "Shinigami Reign",
  "Karasuno Crows",
  "Nekoma Cats"
];

// ================= HELPERS =================

function randomLine(type) {
  const list = commentary[type];
  return list[Math.floor(Math.random() * list.length)];
}

function randomBowlingPrompt() {
  return bowlingPrompts[
    Math.floor(Math.random() * bowlingPrompts.length)
  ];
}

function randomBatterPrompt() {
  return batterPrompts[
    Math.floor(Math.random() * batterPrompts.length)
  ];
}

function getRandomTeams() {
  const shuffled = [...teams].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
}

module.exports = {
  randomLine,
  randomBowlingPrompt,
  randomBatterPrompt,
  getRandomTeams
};

// ================= MILESTONE HELPERS =================

function randomMilestoneLine(type) {
  const list = commentary[type];
  if (!list) return null;
  return list[Math.floor(Math.random() * list.length)];
}

module.exports.randomMilestoneLine = randomMilestoneLine;