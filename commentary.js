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
    '🥈 FIFTY!\n💯 Brilliant half-century!\n👏 Pure timing and control!',
    '🥈 50 RUNS\n🔥 Raises the bat — well played!\n🎯 Holding the innings together!',
    '🥈 HALF CENTURY\n👑 A classy knock under pressure!\n💪 Leading from the front!',
    '🥈 50 UP!\n🚀 Reaches fifty in style!\n🏏 Crowd appreciates the effort!'
  ],

  hundred: [
    '🥇 CENTURY!\n💯🔥 WHAT A HUNDRED!\n🏏 Absolute batting masterclass!',
    '🥇 100 RUNS\n👑 Raises the bat proudly!\n🎆 A knock to remember!',
    '🥇 TON UP!\n🚀 Century in grand fashion!\n🏟 Crowd on its feet!',
    '🥇 HUNDRED!\n💥 Dominating performance!\n🔥 Bowlers had no answers!'
  ],

  partnership50: [
    '🤝 50 PARTNERSHIP\n📈 Solid stand building up!\n💪 Momentum shifting!',
    '🤝 FIFTY STAND\n🧱 Strong foundation laid!\n👏 Excellent teamwork!',
    '🤝 PARTNERSHIP 50\n🔄 Rotating strike brilliantly!\n🎯 Bowlers under pressure!',
    '🤝 50 TOGETHER\n💪 Building a crucial partnership!\n🏏 Smart cricket on display!'
  ],

  partnership100: [
    '🔥 100 PARTNERSHIP\n💥 Massive stand!\n🏏 Bowlers completely dominated!',
    '🔥 CENTURY STAND\n👑 Incredible partnership!\n🎆 Pure domination!',
    '🔥 100 TOGETHER\n🚀 Big partnership milestone!\n💪 Rock-solid batting!',
    '🔥 PARTNERSHIP 100\n📈 Game slipping away from bowlers!\n🔥 What a stand!'
  ],

  duck: [
    '🦆 DUCK!\n😬 Gone without scoring!\nNot his day today!',
    '🦆 OUT FOR 0\n💥 Big blow for the team!\n😓 Early disappointment!',
    '🦆 GOLDEN DUCK\n⚡ First ball — gone!\n😱 Shock dismissal!',
    '🦆 DUCK!\n🧊 Pressure got to him!\n💔 Walks back empty-handed!'
  ],

  duckHattrick: [
    '🦆🦆🦆 DUCK HATTRICK!\nThree ducks in a row!\n😱 Total batting collapse!',
    '💀 TRIPLE DUCKS\nDisaster for the batting side!\n🔥 Bowler on fire!',
    '😵 3 DUCKS\nUnreal scenes out there!\n🧨 Batting in ruins!',
    '😈 DUCK HATTRICK\n⚡ Three wickets, no runs!\nBrutal spell!'
  ],

  threeFer: [
    '🎩 3-WICKET HAUL\n🔥 Bowler on fire!\n🎯 Precision bowling!',
    '🎩 3-FER\n💪 Excellent spell!\n🏏 Breaking the backbone!',
    '🎩 THREE WICKETS\n⚡ Strikes again!\n😈 Total control!',
    '🎩 3 DOWN\n📉 Batting under pressure!\n🔥 What a performance!'
  ],

  fourFer: [
    '👑 4-WICKET HAUL\n💪 Destroying the lineup!\n🔥 Unstoppable today!',
    '👑 4-FER\n🎯 Clinical bowling!\n👏 Brilliant effort!',
    '👑 FOUR WICKETS\n⚡ Another one bites the dust!\n😱 What a spell!',
    '👑 4 DOWN\n📉 Batting collapsing fast!\n🔥 Bowler dominating!'
  ],

  fiveFer: [
    '🏆 5-WICKET HAUL\n🎉 LEGENDARY SPELL!\n👑 Historic performance!',
    '🏆 5-FER\n🔥 Absolute domination!\n💥 Too hot to handle!',
    '🏆 FIVE WICKETS\n🚀 History made!\n🏏 Pure brilliance!',
    '🏆 5 DOWN\n😱 Team in deep trouble!\n🔥 Bowler unstoppable!'
  ],

  sixFer: [
    '💀 6-WICKET HAUL\n😱 Unbelievable spell!\nSingle-handed destruction!',
    '💀 6-FER\n🔥 Total carnage!\n🏏 Batters clueless!',
    '💀 SIX WICKETS\n⚡ Wickets falling like dominoes!\n😈 Ruthless bowling!',
    '💀 6 DOWN\n📉 Complete collapse!\n🔥 What a spell!'
  ]
};


// ================= GIF FILE IDs =================

const gifs = {



  bowlingCall: [
    "BAACAgUAAxkBAAIJJGnAPLlJRbYo_lWTVFZqIGphSfD6AAJSHwACs1cBVgsLI9xxbPy8OgQ",
    "BAACAgUAAxkBAAIJMmnAQf1kFe3bcT9Le8TPcyWk_A0EAAJbHwACs1cBVukuwSR-ddguOgQ",
    "CgACAgUAAxkBAAIGTWm6MLBrusESwtEN8KZJOOl-1iJAAAJVGwACuPAAAVXtX-_52XSxCzoE",
    "CgACAgQAAxkBAAIGUWm6MLBxrKo-gjC4c5Wc6BuN0jDJAAJHAwACJkElU8U7gCITK8QyOgQ",
    "CgACAgUAAxkBAAIGTGm6MLDNHcuUoY3Rn7103mGaA4eVAAJWGwACuPAAAVU3cynSbaDAVDoE",
    "CgACAgUAAxkBAAIGS2m6MLDaMzmDFOv8O0xKZoJGmFPIAAJXGwACuPAAAVVRcJ4zKTzxUjoE"
  ],

  battingCall: [
    "BAACAgUAAxkBAAII_mm_5-zLHTRb7MHVfcLDUThgbiHsAAIsHgACs1cBVigSuWNx_DqUOgQ",
    "BAACAgUAAxkBAAII_Gm_5-mB4ob7JoH7sSafRLNrXf5bAAIrHgACs1cBVpO7pRsO0TbYOgQ",
    "BAACAgUAAxkBAAII-mm_5-LS3mNWB_ZcmxjfaPbz5yrCAAIqHgACs1cBVofVdfZcCLlTOgQ",
    "BAACAgUAAxkBAAIJAAFpv-fwl0Ng3VYCQpwDqf8g3piKMQACLR4AArNXAVb1GoNI1oLQtzoE",
    "BAACAgUAAxkBAAIJCGm_6VRHz7zNxtjUJC-wICi2j23gAALPJAAC9EYBVsTD2yfTQznUOgQ",
    "BAACAgUAAxkBAAIJJmnAPOWAAcYEX5iwoZzQsPWgKRoEAAJUHwACs1cBVty9NeD7xQ75OgQ",
    " BAACAgUAAxkBAAIJKGnAPOzqhWF56q1Nr-kCYSae49pmAAJVHwACs1cBVvdPiPviymLOOgQ"
  ],

  0: [
    "BAACAgUAAxkBAAII1Gm_5PPe4YH88zZSF26aFd2iSUBSAAIFHgACs1cBVjSYvM3-dA_gOgQ",
    "BAACAgUAAxkBAAII1mm_5Pj4fEA6WyZQQebtu-R4hx-NAAIIHgACs1cBVrRebMeQGoZhOgQ",
    "BAACAgUAAxkBAAII2Gm_5P2xTk5YFsKLbyIEeTZPhZZiAAIJHgACs1cBVog3CUXYflZLOgQ",
    "BAACAgUAAxkBAAII2mm_5QWO6cV4696yvHkjeLPfGzuaAAILHgACs1cBVrJcINJRE6bXOgQ",
    "BAACAgUAAxkBAAII3Gm_5QpmDdOPiL6RTw06xVHm3RWlAAINHgACs1cBVulMFNT-7jr_OgQ",
    "BAACAgUAAxkBAAIJCmm_67-craYWumLLge84QTRHeE8hAAIzHgACs1cBVn5QsyMIQkP0OgQ",
    "CgACAgUAAxkBAAIJNmnARflNNWUozeSwUhWoxf877HzKAALGHgACCVMpVLwCmCknOiA9OgQ"
  ],

  1: [
    "BAACAgUAAxkBAAII3mm_5UxIwlqTIOMKlyXv0ckixKJhAAIOHgACs1cBViJQ5atWYOFfOgQ",
    "BAACAgUAAxkBAAII4Gm_5VcUIK1bqZSFar1vAAEGI5DvbwACDx4AArNXAVYBUG-qQBLoQzoE",
    "BAACAgUAAxkBAAII4mm_5WKCOaRKvxjxXghPZJ2_t6SDAAIQHgACs1cBVnDacxFdhTrrOgQ",
    "BAACAgUAAxkBAAII5Gm_5WwgKePOAdTqECQapZA3crCoAAIRHgACs1cBVof8RURkPbxvOgQ",
    "CgACAgUAAyEGAATBJHMxAAJG5mm-MGv5HhFe-D8b4U76DqoLH7U_AAJnHAACZUMRVXktQ_WGV0hJOgQ"
  ],

  2: [
    "BAACAgUAAxkBAAIImGm_36QUxzzngmmYX4SuDxiZFRjfAALTHQACs1cBVg-iNNYMx35UOgQ",
    "BAACAgUAAxkBAAIImmm_373X6L0Y-C50v1aE3jO-xzSMAALUHQACs1cBVgIX3-gdnOdxOgQ",
    "BAACAgUAAxkBAAIInGm_399bdTWg7kQjGfAfdtrcUI9lAALWHQACs1cBVqEjjFRyD_CyOgQ",
    "BAACAgUAAxkBAAIInmm_4ApzbPRRV4DlaovaNtgJ5FbuAALeHQACs1cBVmTZXCXb7DQDOgQ",
    "BAACAgUAAxkBAAIIoGm_4Gf6udbvDK92VQlozmSnuaIoAALhHQACs1cBVgvphERBSfaPOgQ",
    "BAACAgUAAxkBAAIIomm_4IvnIr8oUODshyuoftsWwVOUAALjHQACs1cBVm8piz-yva8mOgQ"
  ],

  3: [
    "BAACAgUAAxkBAAIIsGm_4Zz0x7u9btRMFUlb1TUbX5xEAALsHQACs1cBVredx7uRBy_xOgQ",
    "BAACAgUAAxkBAAIIsmm_4eFrMb3o04YEB7I7Pz2g26KTAALtHQACs1cBVlS78ogtIbAQOgQ",
    "CgACAgUAAxkBAAIJBGm_6NqZhwlhegp348ONoFAOnhDEAAJoHAACZUMRVeoxObvC0ZUGOgQ"
  ],

  4: [
    "BAACAgUAAxkBAAIIpGm_4PcujXCKOiClJcP5k3HYq7OIAALmHQACs1cBVgkpaSoIWnFwOgQ",
    "BAACAgUAAxkBAAIIpmm_4UYkYhog9EPZrUjZHWZj0v5wAALnHQACs1cBVgv3X4VyqhMiOgQ",
    "BAACAgUAAxkBAAIIqGm_4WAvk4ARbatvjxeFsN-VcnrzAALoHQACs1cBVle3vSYQG7ImOgQ",
    "BAACAgUAAxkBAAIIqmm_4WoyeTbyoEdcQl4aQMRdNvd4AALpHQACs1cBVhYPtm1EHTsOOgQ",
    "BAACAgUAAxkBAAIIrGm_4XfZSBVphoPnkwiuWpT4BIHBAALqHQACs1cBVu3zogGHbrRyOgQ",
    "BAACAgUAAxkBAAIIrmm_4YOnlGG79k30CEpD7Z3lGKN8AALrHQACs1cBVn9x3cEx0cycOgQ",
    "BAACAgUAAxkBAAIJDGm_698kwgxMsM-VXXgp5GyOk1UzAAI0HgACs1cBVmKoY1EEhDErOgQ"
  ],

  5: [
    "BAACAgUAAxkBAAIGVmm6MLDJOYeVf6M5yuRERgtqOgSVAALXIAACoe_JVSr-8ITnTYdBOgQ",
    "BAACAgUAAxkBAAIGVWm6MLDDK1G75vaz2Nd9ZlJSxSPxAALWIAACoe_JVe5ZSobGs_JnOgQ",
    "BAACAgUAAxkBAAIGV2m6MLCpmxRtZSaCkF9yZ_SVeEq9AALYIAACoe_JVS_5P_xalC9mOgQ",
    "BAACAgUAAxkBAAIGVGm6MLB30TeZ0amiGfn96xJMvxviAALVIAACoe_JVbzMoOlJqW7FOgQ"
  ],

  6: [
    "BAACAgUAAxkBAAIItGm_4mRqFHV2Z8-0-eC4Cvw1Sl1NAALuHQACs1cBVi5IvTuFW6eYOgQ",
    "BAACAgUAAxkBAAIItmm_4n0Wz_eqInbq6FYijgYa2ae7AALvHQACs1cBVqYkgmPYE6I6OgQ",
    "BAACAgUAAxkBAAIIuGm_4oE4ju83isPiU7dyXhr_CjbDAALwHQACs1cBVm3QQ1vCtsgcOgQ",
    "BAACAgUAAxkBAAIJEGm_7L5acUCe_0kk3BCIpwHRIX2ZAAI8HgACs1cBVuzXo8OTSdXQOgQ",
    "BAACAgUAAxkBAAIJDmm_6_3iX1Sd66z4E5R9h1fm-cBYAAI1HgACs1cBVqu1YBFH_SFqOgQ",
    "BAACAgUAAxkBAAIJHmnAO5oELEqYTXFSOTmmTl_88gABBwACTx8AArNXAVZzOIz1CPSNNzoE",
    "BAACAgUAAxkBAAIJIGnAO6WTXLl3hvVXA5mJoSY0ZqeqAAJQHwACs1cBVi9V7beQFgttOgQ",
    "BAACAgUAAxkBAAIJImnAO7akbdKbGrWEnlDmVLRp5FDgAAJRHwACs1cBVqtxtX-3l0T1OgQ"
  ],

  wicket: [
    "BAACAgUAAxkBAAIIxmm_41lX5Q1LsJ4Th1JU7weAjc23AAL3HQACs1cBVgIlXTuUl5coOgQ",
    "BAACAgUAAxkBAAIIyGm_42BTvI8lzDgFhM62Qj2_l2nzAAL4HQACs1cBVgy3RfK9d9vBOgQ",
    "BAACAgUAAxkBAAIIymm_45OP-RItl5YSV7_sV1yb3Pu_AAL5HQACs1cBVms_AAG1QpzxEjoE",
    "BAACAgUAAxkBAAIIzGm_46d4mlrgPzU8vFL1vzFCwlrsAAL6HQACs1cBVomtOSPOpZwkOgQ",
    "BAACAgUAAxkBAAII0Gm_5EjYifpwBFao8pNoZ0rZdQ89AAL9HQACs1cBVrPi7-aC8WzyOgQ",
    "BAACAgUAAxkBAAII0mm_5JBRwnOyfSFT95iddTrd02wfAAMeAAKzVwFWhoWtBPt6ymw6BA",
    "BAACAgUAAxkBAAIJEmnAOnrWDD18BWNMb-Mp3ElrhzvMAAJGHwACs1cBVqP49Fo9c-vtOgQ",
    "BAACAgUAAxkBAAIJFGnAOoWWko5pP35u0xyahVSg-GddAAJHHwACs1cBVo-HWx16i5ndOgQ"
  ],

  duck: [
    "BAACAgUAAxkBAAII5mm_5xQdzGzd1DcavuR5otrAjhlRAAIXHgACs1cBVu2brtmIym_WOgQ",
    "BAACAgUAAxkBAAII6Gm_5xj9CkvpuxnuJQy6JX5vLe8WAAIYHgACs1cBVrsFIOITx_XDOgQ",
    "BAACAgUAAxkBAAII6mm_5xnaEE2zRAT0_pXFZiqvK2O2AAIZHgACs1cBVplLNey8FRq6OgQ",
    "BAACAgUAAxkBAAII7Gm_5x1lcrdQht3h2held0m97RCwAAIaHgACs1cBVsrkcWryVpeJOgQ",
    "BAACAgUAAxkBAAII7mm_5yCqFbIV2Rxq98S4h0bRAAHpkgACHB4AArNXAVZ6HgABhFErkkk6BA"
  ],

  hattrick: [
    "BAACAgUAAxkBAAII8Gm_52ht_EHhQITWYjCc2EMk2GHUAAIgHgACs1cBVoXaXU2HkLCpOgQ",
    "BAACAgUAAxkBAAII8mm_54LjOLbus-FHAm-4B1IAAfyXAwACIR4AArNXAVZ5vifj0CWmbToE",
    "BAACAgUAAxkBAAII9Gm_542HYNWXoDOuDwUWO8HJxGUFAAIjHgACs1cBVl0NXmp15wsPOgQ",
    "BAACAgUAAxkBAAII9mm_56AjB6Iq8qgEp0CpsKaJxvMaAAIlHgACs1cBVq_K7qC1XecHOgQ",
    "BAACAgUAAxkBAAII-Gm_58DOPSuk6M9vzlP30cV3pBe0AAIoHgACs1cBVvwDQQ2pfNgVOgQ"
  ],

  fifty: [
    "BAACAgUAAxkBAAIIwGm_4uGTIM2XQ4m0WMPDYHrx6zO-AAL0HQACs1cBViVErk4h_IJAOgQ",
    "BAACAgUAAxkBAAIIwmm_4w1axfnqWBn9IdLfWrZ4YuegAAL1HQACs1cBVrvCqNkwxQNwOgQ",
    "BAACAgUAAxkBAAIIxGm_4xof29fh_uvhAkM5xYCYn9J4AAL2HQACs1cBVpHiN-oPLZm-OgQ",
    "BAACAgUAAxkBAAIJFmnAOr5CIL3PWvn_WDvQinmQ-JvhAAJIHwACs1cBVjKYoA_VUmFzOgQ",
    "BAACAgUAAxkBAAIJGGnAOs__7RnjpnWQ1-7ZtRTO7D2wAAJJHwACs1cBVpvztYKKnoLCOgQ",
    "BAACAgUAAxkBAAIJMGnAQMxcpEhTeDuRhUIuIoi3z3TsAAJaHwACs1cBVuHnBKAgTsBJOgQ"
  ],

  hundred: [
    "BAACAgUAAxkBAAIIvGm_4s1a_2UqzWl0oqxAdjdXlhDjAALyHQACs1cBVg_kdaaYazJpOgQ",
    "BAACAgUAAxkBAAIIvmm_4t_kk1qrnOdB09gjsqIUww_MAALzHQACs1cBViV--CbnbSCJOgQ",
    "BAACAgUAAxkBAAIIwGm_4uGTIM2XQ4m0WMPDYHrx6zO-AAL0HQACs1cBViVErk4h_IJAOgQ",
    "BAACAgUAAxkBAAIJGmnAOteNc6jVBPNCN59705I-Q4nkAAJKHwACs1cBVucNxk-a58ldOgQ",
    "BAACAgUAAxkBAAIJHGnAOuA9D01emjWPP8mu5D_vOsw_AAJLHwACs1cBVprctakKC4iOOgQ",
    "BAACAgUAAxkBAAIJKmnAPY46m8Y3_FKLFp0Owm4iV2AhAAJXHwACs1cBVo1MbLrr93RPOgQ"
  ],

  partnership: [
    "BAACAgUAAxkBAAIJLGnAPdgxPEW02sdURNaEt-UnebrSAAJYHwACs1cBVpKEM21YZd_FOgQ",
    "BAACAgUAAxkBAAIJLmnAPeqDbi4_SoRfuOcOC4vtMQs9AAJZHwACs1cBVp5jTpPSZPSZOgQ"
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

function getHattrickCall() {
  return {
    text: pick(commentary.hattrick),
    gif: pick(gifs.hattrick)
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
  getHattrickCall,
  getRandomTeams,
  randomMilestoneLine
};