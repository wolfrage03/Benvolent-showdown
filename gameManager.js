class GameManager {
  constructor() {
    this.games = new Map(); // chatId -> game state
  }

  createGame(chatId) {
    this.games.set(chatId, {
      teamA: [],
      teamB: [],
      currentInnings: 1,
      battingTeam: "A",
      scoreA: 0,
      scoreB: 0,
      wickets: 0,
      maxWickets: 2,
      isActive: true
    });
  }

  joinTeam(chatId, user, team) {
    const game = this.games.get(chatId);
    if (!game) return;

    if (team === "A") game.teamA.push(user);
    if (team === "B") game.teamB.push(user);
  }

  getGame(chatId) {
    return this.games.get(chatId);
  }

  addRun(chatId, runs) {
    const game = this.games.get(chatId);
    if (!game) return;

    if (game.battingTeam === "A") {
      game.scoreA += runs;
    } else {
      game.scoreB += runs;
    }
  }

  addWicket(chatId) {
    const game = this.games.get(chatId);
    if (!game) return;

    game.wickets++;

    if (game.wickets >= game.maxWickets) {
      this.switchInnings(chatId);
    }
  }

  switchInnings(chatId) {
    const game = this.games.get(chatId);
    if (!game) return;

    if (game.currentInnings === 1) {
      game.currentInnings = 2;
      game.battingTeam = "B";
      game.wickets = 0;
    } else {
      game.isActive = false;
    }
  }

  getScore(chatId) {
    const game = this.games.get(chatId);
    if (!game) return;

    return `
🏏 Score Update:

Team A: ${game.scoreA}
Team B: ${game.scoreB}
Innings: ${game.currentInnings}
Batting: Team ${game.battingTeam}
Wickets: ${game.wickets}/${game.maxWickets}
`;
  }
}

module.exports = new GameManager();
