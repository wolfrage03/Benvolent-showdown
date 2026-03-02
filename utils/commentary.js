/* ================= COMMENTARY ENGINE ================= */

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
  ]
};

/* ================= RANDOM LINE ================= */

function randomLine(type) {
  const list = commentary[type];
  if (!list) return "";
  return list[Math.floor(Math.random() * list.length)];
}

/* ================= PROMPTS ================= */

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

function randomBowlingPrompt() {
  return bowlingPrompts[
    Math.floor(Math.random() * bowlingPrompts.length)
  ];
}

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

function randomBatterPrompt() {
  return batterPrompts[
    Math.floor(Math.random() * batterPrompts.length)
  ];
}

module.exports = {
  randomLine,
  randomBowlingPrompt,
  randomBatterPrompt
};