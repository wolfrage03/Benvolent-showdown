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
    "Placed beautifully — they'll come back for two!",
    "Good running between the wickets.",
    "In the gap! Comfortable couple.",
    "Excellent awareness — two more added.",
    "They hustle back for the second!"
  ],

  3: [
    "Into the deep — they'll get three!",
    "Superb running, that's three all the way.",
    "Chased hard… but three runs taken.",
    "Great placement and even better running!",
    "Turning ones into threes — brilliant effort."
  ],

  4: [
    "Cracked away! That's four!",
    "Beautifully timed — races to the boundary!",
    "No stopping that — FOUR!",
    "Threaded the gap perfectly!",
    "Pure class — boundary!"
  ],

  5: [
    "Overthrows! That's five runs gifted!",
    "Misfield and they'll get five!",
    "Chaos in the field — five runs taken!",
    "That's costly — five to the total!",
    "Extra runs courtesy of an overthrow!"
  ],

  6: [
    "That's massive! SIX!",
    "High and handsome — out of the park!",
    "Clears the ropes with ease!",
    "What a strike! Maximum!",
    "That's gone into the stands!"
  ],

  wicket: [
    "Cleaned him up!",
    "Gone! Big breakthrough!",
    "Straight to the fielder — taken!",
    "What a delivery — timber!",
    "That's a huge wicket at this stage!"
  ],

  hattrick: [
    "Three in three! Unbelievable!",
    "That's a hattrick! Magical spell!",
    "History made — three consecutive wickets!",
    "What a moment — hattrick hero!",
    "Hattrick ball… and he's done it!"
  ],

  maiden: [
    "Maiden over! Absolute control.",
    "Six balls, no runs — brilliant bowling.",
    "Pressure cooker stuff — maiden!",
    "Tidy and disciplined — no scoring.",
    "Dot after dot — that's a maiden!"
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


// ================= GIF FILE IDs =================

const gifs = {

  0: [
    "CgACAgQAAyEFAATiBsiBAAN6abkHkm2ZeRFNPyQn8IbaYOYuJ6kAAo0CAAKklxVTUpQItKrasso6BA",
    "CgACAgQAAyEFAATiBsiBAAOFabkNECKCbLHu_YgT0nVCTI6m02kAAkcDAAImQSVTR2WErATwqRE6BA",
    "BAACAgUAAyEFAATiBsiBAAOLabkwbgcEMyiKyRTBwjZ-mLOxkNoAAtkgAAKh78lVUWikJzzZHe06BA",
    "BAACAgUAAyEFAATiBsiBAAOMabkwbl8Ev03r1cg-cmGKr3ZfITIAAtogAAKh78lVXXaaplD_NZU6BA",
    "CgACAgUAAyEFAATBvHTpAAECVRBptpUSPcF1NJjdDZ8c7KfvTsORUQACdAMAAmAVcVbaAAHlRJpTCO06BA"
  ],

  1: [
    "CgACAgUAAyEFAATiBsiBAANtabkEtJPlRJc4XTbhHxs5_A1G3ukAAmccAAJlQxFVtLZutNsvtRw6BA",
    "CgACAgUAAyEFAATiBsiBAAOmablFotLL3yJVt7IctYebG_8FY3AAAjwbAALxqchVk5ky-JliuCQ6BA"
  ],

  2: [
    "CgACAgUAAyEFAATiBsiBAAOpablKoamwyB20bvmE0-x0sXcnca4AAj0bAALxqchVHB9EHsrHpFY6BA",
    "BAACAgUAAyEFAATiBsiBAAPTabl3X6YU3TpUJaJGsmOGOt3irOQAAk0kAALnQ8lVKsrLhId7o6w6BA"
  ],

  3: [
    "BAACAgUAAxkBAAEcNERpubIhtm1mppUiGNt-9e4Mn6OlGgACjh0AAg44yVXkBIuwayJP5zoE"
  ],

  4: [
    "BAACAgUAAyEFAATiBsiBAANeabkD1-O-AW4QiO4AAcvqnTltS6csAAKrIgAC50PJVWyMINVoqrhIOgQ",
    "CgACAgUAAxkBAAEcK4RpuFQDJNYVagGcAwABHLaEJMQppGUAAq0EAAJtQ0FW0pFqxqCYsJE6BA",
    "CgACAgIAAxkBAAEcK4xpuFRVIP19ZGn6BzyjCHTtZotHygACa4AAAhf_8UhUJnGSR5od1zoE",
    "CgACAgQAAyEFAATBvHTpAAECVg5puPKBGp5ZyVTTxgIInq2qIAoXIgAC0xkAAm07uFB2gcimGTMWhjoE",
    "CgACAgUAAyEFAATBvHTpAAECVhJpuPKX4wiPrTlTauYW1X8S-FjZ0gACjwUAAvOMmFUui_5-cMAEGDoE",
    "CgACAgQAAyEFAATBvHTpAAECVhppuPLPtWR1AgJFiPQ_t7aW7raCfgACWBIAAjE6uFO3x-Tv3E9fzToE",
    "CgACAgUAAyEFAATBvHTpAAECVhhpuPLFUSQdBdgvmAH1ICGzsW_-FgACVBEAAoXgMFdkximVfq06nzoE",
    "CgACAgQAAyEFAATBvHTpAAECVuppuPaiKCGkw27ITyk5ChremfnzzAACmg4AAkeCuFMmuost-pwAASg6BA",
    "BAACAgUAAyEFAATiBsiBAAO6ablWPlMbBVNj8hWkdLwrg-gpREwAAu4jAALnQ8lVhXCyTTvcu606BA",
    "BAACAgUAAyEFAATiBsiBAAO5ablWLmA-S5eKHn1pzy0dy7zcrvAAAu0jAALnQ8lV7iDMvO1GoH06BA"
  ],

  5: [
    "BAACAgUAAxkBAAEcK0xpuFBgmLeShgABRJKDnoeiYY9IZLsAAg4iAAKaIhhVDYq-T",
    "BAACAgUAAyEFAATiBsiBAAOQabkwfSPQz-cVTlPVztctraMY5H8AAtggAAKh78lVmR-Uqr-6OMw6BA",
    "BAACAgUAAyEFAATiBsiBAAOPabkwfbB5MhiiDsucLNfPk5wR3WsAAtcgAAKh78lV50C6rfEwBYI6BA",
    "BAACAgUAAyEFAATiBsiBAAOOabkwfXziyfzyIEMhGgHoJY2eHhMAAtYgAAKh78lVc9HGP5yWRro6BA"
  ],

  6: [
    "CgACAgUAAxkBAAEcK2JpuFGZwc-a21_wh-0ewR5vksuRcwACzxYAAna0cVZPgzlDy3zYVToE",
    "BAACAgUAAyEFAATiBsiBAANcabkDgr-e7TMX5UBfJA779QU1wYoAAqkiAALnQ8lVYfR8aJgClRU6BA",
    "CgACAgUAAyEFAATiBsiBAAOqablKuctp6HjKi9jmXTNFolNmU5gAAj8bAALxqchV4PWgLoiQPI86BA",
    "CgACAgUAAxkBAAEcK2RpuFGwRPZVH7lWzBOm5IxZcCQUOgACZwgAAsQamFcjitfPGRrDdzoE",
    "CgACAgIAAxkBAAEcK2ZpuFHGxGH9yD9E26gQ3HS9rOdlDQAC730AAvksuEmPN1Jge4LS6ToE",
    "CgACAgIAAxkBAAEcK2hpuFHei8KAhQ_ZbkzuHqN8RxScWwAC-mEAAr7XGUmsHe6av1DrZjoE",
    "CgACAgIAAxkBAAEcK3RpuFJjE0ofuUY1VZcM2UgvQq1GvgACHHkAAnUMWEhkseTWre_NtDoE",
    "CgACAgQAAyEFAATBvHTpAAECVg9puPKDUeJOdLDXqb56C1hlxNOq1QAC0hkAAm07uFDbZXxlS1wdijoE",
    "CgACAgUAAyEFAATiBsiBAANZabkAAebiSWegL6RzIpZdzZPToyKXAAJwGgAC8anIVbNH2bV5Nd9sOgQ"
  ],

  wicket: [
    "CgACAgIAAyEFAATiBsiBAAN8abkINKEQbvfor3yyq_ursAt0vA4AAoONAAIzJclJf4E5MqGR7f46BA",
    "BAACAgUAAxkBAAEcK0hpuE8Yj_tWFX7Yg7UXGnzmdn_hvgACECIAApoiGFXBCXimVmRBVToE",
    "CgACAgQAAxkBAAEcK05puFCm5Xcrb-kS1uvOVtMdAly8cgACxhEAAnSqEFALkEHxN-S-jDoE",
    "CgACAgIAAxkBAAEcK1RpuFDcQCOHS1HIVE0XMjQ_kSjukAACmH0AAjfu2UpHdBzhtpaemDoE",
    "CgACAgIAAxkBAAEcK1ZpuFEHlC1lR28a7pAqwt6ArCG_sQACKnwAAuxhIUglaugnIvIDXToE",
    "CgACAgIAAxkBAAEcK1xpuFE72LvAvgG4oIgDJTS15vKtSQACj3QAAmH5iUpOjlTa2gXG1zoE",
    "CgACAgUAAxkBAAEcK15puFFTLlaFRjGd9ELs0XM5oeRZwwACohEAAjIyeVQNnopT7iKpujoE",
    "CgACAgUAAyEFAATiBsiBAANEabj92KGS3FIKbTjvu-CTFXLVeWsAAowZAAJE2fFWYChLSyMxfUk6BA"
  ],

  duck: [
    "CgACAgUAAyEFAATiBsiBAAN5abkHTAhtTs7J7ZweWp9b0HqbAAGzAAK5HAAC3JVgVZoT1nfRkCy3OgQ"
  ],

  fifty: [
    "CgACAgQAAyEFAATiBsiBAAN6abkHkm2ZeRFNPyQn8IbaYOYuJ6kAAo0CAAKklxVTUpQItKrasso6BA"
  ],

  hundred: [
    "CgACAgUAAyEFAATiBsiBAANSabkAARAw3ZbHuy-awAqidj0LiUfrAAI-AwACdFIFUwlX06Ozffq5OgQ"
  ],

  partnership: [
    "BAACAgUAAyEFAATiBsiBAANbabkCyb5JM7J4YzwVuJaOBsC4D8sAAqciAALnQ8lVoen35uvsMfg6BA",
    "BAACAgUAAyEFAATiBsiBAAOzablV39VpXMVrXe3UONx0bg6fnikAAucjAALnQ8lVGNdImb-0XGk6BA",
    "BAACAgUAAyEFAATiBsiBAAO0ablV_3ZhoQZ-l-KLWkh1_ciDJmkAAugjAALnQ8lVx7vIFguUMBY6BA",
    "BAACAgUAAyEFAATiBsiBAAO1ablWBkf9wIFenzWrEKTW3UtID04AAukjAALnQ8lV0ZRO51rYenw6BA",
    "BAACAgUAAyEFAATiBsiBAAO2ablWEJ2Ek3LM_YMopoxNUXVKfBYAAuojAALnQ8lVcPppbFK57Z46BA",
    "BAACAgUAAyEFAATiBsiBAAO3ablWH2sbFr-bwLVKWxBcbE-uImsAAusjAALnQ8lVUwTuk6m-gvI6BA",
    "BAACAgUAAyEFAATiBsiBAAO4ablWKHKwV75Pu0nfUTX8ZsjVUhYAAuwjAALnQ8lVSiwnP95VxBk6BA",
    "BAACAgUAAyEFAATiBsiBAAO7ablWUAdWe-OewGsSzMK4Gm_GNxIAAu8jAALnQ8lV-NedQpKPqxg6BA"
  ]

};


// ================= PROMPTS =================

const bowlingPrompts = [
  "🎯 Bowl now!\nType a number between 1 and 6.",
  "🚀 It's your delivery!\nSend your bowling number quickly (1–6).",
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
  "🧨 Let's see if you can explode the stumps!\nEnter your number."
];


const batterPrompts = [
  "🏏 Batter's Turn!\nSend your number (0–6) now!",
  "🎯 Face the delivery!\nChoose a number between 0 and 6.",
  "🚀 Play your shot!\nEnter your number (0–6).",
  "🔥 Time to score!\nBatter, send your number!",
  "⏳ Waiting for the batter…\nPick a number (0–6).",
  "💥 Can you smash this one?\nSend your number (0–6)!",
  "👀 Bowler is ready…\nBatter, what's your move? (0–6)",
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

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomLine(type) {
  const list = commentary[type];
  return list ? pick(list) : null;
}

function randomGif(type) {
  // Fallback chain: try exact type, then related types
  const list = gifs[type];
  if (list && list.length) return pick(list);
  return null;
}

function randomBowlingPrompt() {
  return pick(bowlingPrompts);
}

function randomBatterPrompt() {
  return pick(batterPrompts);
}

function getRandomTeams() {
  const shuffled = [...teams].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
}

function randomMilestoneLine(type) {
  const list = commentary[type];
  if (!list) return null;
  return pick(list);
}


// ================= EXPORTS =================

module.exports = {
  randomLine,
  randomGif,
  randomBowlingPrompt,
  randomBatterPrompt,
  getRandomTeams,
  randomMilestoneLine
};