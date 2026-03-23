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
    '*🥈 FIFTY!*\n💯 Brilliant half-century!\n👏 Pure timing and control!',
    '*🥈 50 RUNS*\n🔥 Raises the bat — well played!\n🎯 Holding the innings together!',
    '*🥈 HALF CENTURY*\n👑 A classy knock under pressure!\n💪 Leading from the front!',
    '*🥈 50 UP!*\n🚀 Reaches fifty in style!\n🏏 Crowd appreciates the effort!'
  ],

  hundred: [
    '*🥇 CENTURY!*\n💯🔥 WHAT A HUNDRED!\n🏏 Absolute batting masterclass!',
    '*🥇 100 RUNS*\n👑 Raises the bat proudly!\n🎆 A knock to remember!',
    '*🥇 TON UP!*\n🚀 Century in grand fashion!\n🏟 Crowd on its feet!',
    '*🥇 HUNDRED!*\n💥 Dominating performance!\n🔥 Bowlers had no answers!'
  ],

  partnership50: [
    '*🤝 50 PARTNERSHIP*\n📈 Solid stand building up!\n💪 Momentum shifting!',
    '*🤝 FIFTY STAND*\n🧱 Strong foundation laid!\n👏 Excellent teamwork!',
    '*🤝 PARTNERSHIP 50*\n🔄 Rotating strike brilliantly!\n🎯 Bowlers under pressure!',
    '*🤝 50 TOGETHER*\n💪 Building a crucial partnership!\n🏏 Smart cricket on display!'
  ],

  partnership100: [
    '*🔥 100 PARTNERSHIP*\n💥 Massive stand!\n🏏 Bowlers completely dominated!',
    '*🔥 CENTURY STAND*\n👑 Incredible partnership!\n🎆 Pure domination!',
    '*🔥 100 TOGETHER*\n🚀 Big partnership milestone!\n💪 Rock-solid batting!',
    '*🔥 PARTNERSHIP 100*\n📈 Game slipping away from bowlers!\n🔥 What a stand!'
  ],

  duck: [
    '*🦆 DUCK!*\n😬 Gone without scoring!\nNot his day today!',
    '*🦆 OUT FOR 0*\n💥 Big blow for the team!\n😓 Early disappointment!',
    '*🦆 GOLDEN DUCK*\n⚡ First ball — gone!\n😱 Shock dismissal!',
    '*🦆 DUCK!*\n🧊 Pressure got to him!\n💔 Walks back empty-handed!'
  ],

  duckHattrick: [
    '*🦆🦆🦆 DUCK HATTRICK!*\nThree ducks in a row!\n😱 Total batting collapse!',
    '*💀 TRIPLE DUCKS*\nDisaster for the batting side!\n🔥 Bowler on fire!',
    '*😵 3 DUCKS*\nUnreal scenes out there!\n🧨 Batting in ruins!',
    '*😈 DUCK HATTRICK*\n⚡ Three wickets, no runs!\nBrutal spell!'
  ],

  threeFer: [
    '*🎩 3-WICKET HAUL*\n🔥 Bowler on fire!\n🎯 Precision bowling!',
    '*🎩 3-FER*\n💪 Excellent spell!\n🏏 Breaking the backbone!',
    '*🎩 THREE WICKETS*\n⚡ Strikes again!\n😈 Total control!',
    '*🎩 3 DOWN*\n📉 Batting under pressure!\n🔥 What a performance!'
  ],

  fourFer: [
    '*👑 4-WICKET HAUL*\n💪 Destroying the lineup!\n🔥 Unstoppable today!',
    '*👑 4-FER*\n🎯 Clinical bowling!\n👏 Brilliant effort!',
    '*👑 FOUR WICKETS*\n⚡ Another one bites the dust!\n😱 What a spell!',
    '*👑 4 DOWN*\n📉 Batting collapsing fast!\n🔥 Bowler dominating!'
  ],

  fiveFer: [
    '*🏆 5-WICKET HAUL*\n🎉 LEGENDARY SPELL!\n👑 Historic performance!',
    '*🏆 5-FER*\n🔥 Absolute domination!\n💥 Too hot to handle!',
    '*🏆 FIVE WICKETS*\n🚀 History made!\n🏏 Pure brilliance!',
    '*🏆 5 DOWN*\n😱 Team in deep trouble!\n🔥 Bowler unstoppable!'
  ],

  sixFer: [
    '*💀 6-WICKET HAUL*\n😱 Unbelievable spell!\nSingle-handed destruction!',
    '*💀 6-FER*\n🔥 Total carnage!\n🏏 Batters clueless!',
    '*💀 SIX WICKETS*\n⚡ Wickets falling like dominoes!\n😈 Ruthless bowling!',
    '*💀 6 DOWN*\n📉 Complete collapse!\n🔥 What a spell!'
  ]
};


// ================= GIF FILE IDs =================

const gifs = {



  bowlingCall: [
    "CgACAgUAAxkBAAIGTWm6MLBrusESwtEN8KZJOOl-1iJAAAJVGwACuPAAAVXtX-_52XSxCzoE",
    "CgACAgQAAxkBAAIGUWm6MLBxrKo-gjC4c5Wc6BuN0jDJAAJHAwACJkElU8U7gCITK8QyOgQ",
    "CgACAgUAAxkBAAIGTGm6MLDNHcuUoY3Rn7103mGaA4eVAAJWGwACuPAAAVU3cynSbaDAVDoE",
    "CgACAgUAAxkBAAIGS2m6MLDaMzmDFOv8O0xKZoJGmFPIAAJXGwACuPAAAVVRcJ4zKTzxUjoE"
  ],

  battingCall: [
    "CgACAgUAAxkBAAIGXmm6MLACZk_3AAFI_0Ij4Swxf0lm_wACSxsAAvGpyFWq8ttwdvAyOzoE",
    "BAACAgUAAxkBAAIITGm9OExKntL557gcWpxrUOVqhoTtAAIaHQACJZjpVfw4FKfxT_TEOgQ",
    "BAACAgUAAxkBAAIITmm9OG2CRdgOA7jMBTLqX7X_gP1-AAIbHQACJZjpVZ3Ti1RJb6idOgQ",
    "BAACAgUAAxkBAAIIUmm9OKip6qzo4jTke8j0-D7J18n3AAIdHQACJZjpVcPWcB6bN5MoOgQ",
    "BAACAgUAAxkBAAIIWGm9ORb5WmRE5ixazIB-tYIK6YLhAAIgHQACJZjpVVmLc0bOH3mKOgQ"
  ],

  0: [
    "CgACAgUAAxkBAAIGM2m6MLBR8jIDVt4sV9wAAQMNDAQL6gACdAMAAmAVcVaeHBC_3weV0ToE",
    "CgACAgQAAxkBAAIGWGm6MLCyTlxglbK3W0ETTDIZdfd5AAIhAwACjyB9U8MZnHeNznJ_OgQ",
    "CgACAgUAAxkBAAIGMWm6MLC3LnpSvAP0RLFeE91SIvBjAALGHgACCVMpVLwCmCknOiA9OgQ",
    "BAACAgUAAxkBAAIGUmm6MLDfeTP73--hmfssRY3SdnYwAALZIAACoe_JVajT2BJP58CnOgQ",
    "BAACAgUAAxkBAAIGU2m6MLCe5-zU0gzsCCJ5_VFUG0HfAALaIAACoe_JVSe9sQqHZWpJOgQ",
    "CgACAgQAAxkBAAIGT2m6MLDwPfTSbp0lXoXf7_K_nqboAAKNAgACpJcVU0UwKFXbj-_XOgQ"
  ],

  1: [
    "CgACAgUAAxkBAAIGW2m6MLC3xJ8kKmYnZruGySneKi2vAAI8GwAC8anIVa6hCwXuIcd-OgQ",
    "BAACAgUAAxkBAAIHI2m6iOpVMdwHTB7rYtsjJKaprIAdAALVHgACtpPZVf9jMZAp5n3ZOgQ",
    "BAACAgUAAxkBAAIHG2m6Z6vOfSQVB-MvcTL3anzmtIUcAAISHgACtpPZVWL3DD-xn0dVOgQ",
    "BAACAgUAAxkBAAIHGWm6Z5oltRYvtbZz-wzDy5b4sbIxAAIRHgACtpPZVescgRl1U8iQOgQ",
    "BAACAgUAAxkBAAIIVGm9OMMXOuR3D1CAPOEq04vdPDXvAAIeHQACJZjpVd61s9Ye1-xBOgQ"
  ],

  2: [
    "BAACAgUAAxkBAAIGamm6MLDl4rSyVTsPvNcrQx_0S2R1AAJNJAAC50PJVUmqTzFzL6siOgQ",
    "CgACAgUAAxkBAAIGXGm6MLBqzKy1T2txfCUFbkMaxnhgAAI9GwAC8anIVdOqPLq1xXIaOgQ",
    "BAACAgUAAxkBAAIHH2m6cXStgkifK5ETqBVWROUG_wtWAAJTHgACtpPZVdPaLyDI8x6LOgQ",
    "BAACAgUAAxkBAAIIZWm9ivDzsUVh5DvmTRrMtJ7-sst4AAKoHQACJZjpVcZIuWcVNRwAAToE",
    "BAACAgUAAxkBAAIIZ2m9iv08dwvbMaX9sSXMB5ajR8WcAAKpHQACJZjpVQanuskAAUgHnToE"
  ],

  3: [
    "BAACAgUAAxkBAAIG4Wm6SDuXVhOspY98xLMNbrnLtxbsAAKOHQACDjjJVVcimJzFYD-DOgQ",
    "CgACAgUAAxkBAAIIaWm9j2rKppQAAcw4vk3_Ja2dlXnmwgACaBwAAmVDEVXqMTm7wtGVBjoE"
  ],

  4: [
    "BAACAgUAAxkBAAIGZ2m6MLBaTeFb-IeHpVCLyPr8WqGAAALuIwAC50PJVXw8JgOX3_sSOgQ",
    "BAACAgUAAxkBAAIGZmm6MLD7cOLbuMMUK3n-L3ti40agAALtIwAC50PJVR8dH0datT5mOgQ",
    "BAACAgUAAxkBAAIGSGm6MLCb0lK5MhwnftQ0OZrM5x_AAAKrIgAC50PJVS8JEOYpZOe6OgQ",
    "CgACAgUAAxkBAAIGOWm6MLDpcbWtIntx28yiDm_kzcuHAAJUEQACheAwV0EiDXxiq-WmOgQ",
    "CgACAgUAAxkBAAIGNmm6MLBF02BAXHJTO1mduOpYdhl_AAKPBQAC84yYVVZSmkDqPSvHOgQ",
    "CgACAgUAAxkBAAIGN2m6MLCB_-GfgEY49ZQuN4EcXX9rAAJEFwAC7pXRVbh9OhIlO5n5OgQ",
    "CgACAgQAAxkBAAIGOGm6MLCooRJ-5K3jjoREWkc9FSUPAAJYEgACMTq4Ux_8DkSIzF2GOgQ",
    "CgACAgQAAxkBAAIGQGm6MLBk5W_iedF2Qcl5j714b4I4AAKaDgACR4K4UwRAXAzId8p8OgQ",
    "CgACAgQAAxkBAAIGNGm6MLCTyfDX0jxCuK_NRyY2IixPAALTGQACbTu4UEcaD1q9ZQbYOgQ",
    "CgACAgIAAxkBAAIGMmm6MLACcAyjqRepOXVsPoiB7ZqxAALTbgAChWZgSlmQBtE-EmrSOgQ"
  ],

  5: [
    "BAACAgUAAxkBAAIGVmm6MLDJOYeVf6M5yuRERgtqOgSVAALXIAACoe_JVSr-8ITnTYdBOgQ",
    "BAACAgUAAxkBAAIGVWm6MLDDK1G75vaz2Nd9ZlJSxSPxAALWIAACoe_JVe5ZSobGs_JnOgQ",
    "BAACAgUAAxkBAAIGV2m6MLCpmxRtZSaCkF9yZ_SVeEq9AALYIAACoe_JVS_5P_xalC9mOgQ",
    "BAACAgUAAxkBAAIGVGm6MLB30TeZ0amiGfn96xJMvxviAALVIAACoe_JVbzMoOlJqW7FOgQ"
  ],

  6: [
    "CgACAgUAAxkBAAIGXWm6MLBgsaQqzkqQAf3qzyXwGY2QAAI_GwAC8anIVXot_FUljFPeOgQ",
    "BAACAgUAAxkBAAIGRmm6MLDObEVXdwABZdAk5i81mmcKAgACqSIAAudDyVWcIAgczBQ3ljoE",
    "BAACAgUAAxkBAAIGSWm6MLCbToc88K2Y_qJDT0c4bX4DAAKuIgAC50PJVXQ99nag7SBIOgQ",
    "CgACAgUAAxkBAAIGRGm6MLDoFfYyRGD1-5VsSEFzI5ixAAJwGgAC8anIVUjfY1ElSF5kOgQ",
    "CgACAgUAAxkBAAIG62m6SJ-yo8DbwmDf3NFPTvYf5Q4RAAJAIAACnWrQV2MyUUD5m6nEOgQ",
    "CgACAgQAAxkBAAIGNWm6MLB_ganO5ijDFYU-NzFxteUNAALSGQACbTu4UNQEMY4djFBvOgQ",
    "CgACAgUAAxkBAAIGLmm6MLBUtb6ssm5OAtQyPx-jjYvbAAJnCAACxBqYV6ixX4sckLREOgQ",
    "CgACAgUAAxkBAAIGLWm6MLBW7nubTYi3TeYfGNbF_bvgAALPFgACdrRxVuZk2Wr_IBd6OgQ",
    "CgACAgIAAxkBAAIGL2m6MLBSLJk_iHDMYWAjQsXOYDY3AALvfQAC-Sy4SbOt46ldXAofOgQ",
    "CgACAgIAAxkBAAIGMGm6MLAxlz1PimjOqzJsC745-1vJAAL6YQACvtcZSWFV-KaH4lTqOgQ"
  ],

  wicket: [
    "CgACAgIAAxkBAAIGUGm6MLCpRvxvAcvlPRTCypRq9rRCAAKDjQACMyXJST2VaOTgb-AjOgQ",
    "CgACAgUAAxkBAAIGSmm6MLD1HSNiIGlEaJkmFQbbvjpVAAJnHAACZUMRVXktQ_WGV0hJOgQ",
    "CgACAgUAAxkBAAIG52m6SIpORe5757PmsoSO1lmfX_4vAALjCwACsNBgVHpyYuDLyKopOgQ",
    "CgACAgUAAxkBAAIG6Gm6SIq1pVANblCm3mnqJxRObsdBAALHEQACFuigVoh-BqXIuQZVOgQ",
    "CgACAgQAAxkBAAIG42m6SHt_As9xD7dSGhraoHYej4lPAAJiEAACCwUYUcYL0W-D4XIcOgQ",
    "CgACAgUAAxkBAAIG5Gm6SHuxOCn8eanf6IWYXW5lbhntAAIhDwACpnqYVKjmeHqTsp70OgQ",
    "CgACAgIAAxkBAAIHD2m6XpWmvfRIXWivTvSW3nuLkTObAAKYfQACN-7ZSuVHgzF6iLslOgQ",
    "CgACAgIAAxkBAAIHEWm6XvIVpnJCxUVRFD9IBpHoNtVMAAKPdAACYfmJSrJwIkVE-_X7OgQ"
  ],

  duck: [
    "CgACAgUAAxkBAAIGTmm6MLAnEj3vb0X69nIsq9AAAQOC6AACuRwAAtyVYFVXetm3uG-CRDoE"
  ],

  fifty: [
    "CgACAgUAAxkBAAIGQmm6MLC_3FzimsYIsuZwzjZ7sk3hAAKDCQACrrfJV6_e475XG5DkOgQ",
    "BAACAgUAAxkBAAIISmm9OAy4fkoL740W64wAAXGk5hcsqwACGR0AAiWY6VX3Q6ucLYjTMDoE",
    "BAACAgUAAxkBAAIIUGm9OIHu5bDR0Pfm0g5b4PBRFT10AAIcHQACJZjpVQ5uO3DDerNeOgQ",
    "BAACAgUAAxkBAAIIVmm9ON0U-jFv_LuWF8__H9tRtM-RAAIfHQACJZjpVRpdYPwqvymDOgQ"
  ],

  hundred: [
    "BAACAgUAAxkBAAIGR2m6MLBUCWFjXCXYTzsqrgFTrJGEAAKqIgAC50PJVciMCwHXUKIEOgQ",
    "CgACAgQAAxkBAAIGQ2m6MLCenBk6wLv9xqdxnYB7siVCAAI-AwACdFIFU3wqy_qd6od4OgQ",
    "CgACAgUAAxkBAAIGQmm6MLC_3FzimsYIsuZwzjZ7sk3hAAKDCQACrrfJV6_e475XG5DkOgQ",
    "BAACAgUAAxkBAAIGX2m6MLC6TYKesd1Iuh--Ay9c_sDdAALmIwAC50PJVfHFKYBXuPweOgQ"
  ],

  partnership: [
    "BAACAgUAAxkBAAIGaGm6MLCyOsFlFexOAzIxCk_Cn82VAALvIwAC50PJVQyYDfvA6lgEOgQ",
    "BAACAgUAAxkBAAIGZGm6MLC7YMpA_HFwFNWRxZtDXbevAALrIwAC50PJVTsfWtt8zthiOgQ",
    "BAACAgUAAxkBAAIGZWm6MLAxmVwwZT6sN2vtC7sC4rW7AALsIwAC50PJVYkrxrJ6Yg8hOgQ",
    "BAACAgUAAxkBAAIGYGm6MLCcZnmlFMyEEBMqF4N3BzNmAALnIwAC50PJVXbTog8-ipHkOgQ",
    "BAACAgUAAxkBAAIGYmm6MLCXdXwo0vIKtutCtkMAAb1lUgAC6SMAAudDyVVK6waO4NplvToE",
    "BAACAgUAAxkBAAIGY2m6MLCZZyZcGBv3fhSfdCIZEz-lAALqIwAC50PJVQa_No8CGCeEOgQ",
    "BAACAgUAAxkBAAIGYWm6MLDlqoxwVHhVwNQlu2mxB0k5AALoIwAC50PJVXc1m82fIEBtOgQ",
    "BAACAgUAAxkBAAIGRWm6MLBiHmv4-fcWZ_q7aHP9gAq-AAKnIgAC50PJVTCuFRCefPAOOgQ",
    "BAACAgUAAxkBAAIHIWm6iOYc5LI3ntU8nOPb06H7MTG_AALUHgACtpPZVbaxPh1ss0XaOgQ"
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

function getBowlingCall() {
  return {
    text: pick(bowlingPrompts),
    gif: pick(gifs.bowlingCall)
  };
}

function getBattingCall() {
  return {
    text: pick(batterPrompts),
    gif: pick(gifs.battingCall)
  };
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
  getBowlingCall,   
  getBattingCall,   
  getRandomTeams,
  randomMilestoneLine
};