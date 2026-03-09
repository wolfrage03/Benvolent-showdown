function generateScorecard(match){

if (!match) return "⚠️ Scorecard unavailable."

let text = ""

text += `📊 Scorecard\n`
text += `${match.teamAName} vs ${match.teamBName}\n\n`

text += `Over: ${match.currentOver}/${match.totalOvers}\n`
text += `${match.battingTeamName} Batting\n`
text += `Score: ${match.score}/${match.wickets}\n\n`

text += `🏏 Batters\n`

for(const playerId of (match.battingOrder || [])){

const stats = match.batterStats[playerId] || {runs:0,balls:0}
const player = match.battingTeam.find(p => p.id === playerId) || { name: "Unknown Player" }

let marker=""

if(playerId===match.striker) marker="⭐"
else if(playerId===match.nonStriker) marker="(NS)"

text += `${marker} ${player.name} ${stats.runs}(${stats.balls})\n`
}

text += `\n🎯 ${match.bowlingTeamName} Bowling\n\n`

for(const bowlerId in (match.bowlerStats || {})){

const b = match.bowlerStats[bowlerId]
const bowler = match.bowlingTeam.find(p => p.id === bowlerId) || { name: "Unknown Bowler" }

const overs = Math.floor(b.balls/6)+"."+(b.balls%6)

text += `${bowler.name} (${overs}-${b.dots}-${b.runs}-${b.wickets})\n`

(match.overHistory || [])
.filter(o=>o.bowler===bowlerId)
.forEach(o=>{
text += `${o.over} over (${o.balls.join(",")})\n`
})

text += `\n`
}

return text
}

module.exports = generateScorecard