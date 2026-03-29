const mongoose = require("mongoose");

const matchArchiveSchema = new mongoose.Schema({
  groupId:       { type: String, required: true },
  endedAt:       { type: Date,   default: Date.now },
  endReason:     { type: String, default: "force_ended" }, // "force_ended" | "completed"
  phase:         String,
  totalOvers:    Number,
  currentOver:   Number,
  currentBall:   Number,
  innings:       Number,

  teamAName:     String,
  teamBName:     String,
  teamA:         [{ id: Number, name: String }],
  teamB:         [{ id: Number, name: String }],
  captains:      { A: Number, B: Number },
  host:          Number,

  battingTeam:   String,
  bowlingTeam:   String,
  score:         Number,
  wickets:       Number,
  striker:       Number,
  nonStriker:    Number,
  bowler:        Number,

  firstInningsScore:   Number,
  firstInningsWickets: Number,
  target:              Number,

  ballLog: [String],
}, { timestamps: true });

module.exports =
  mongoose.models.MatchArchive || mongoose.model("MatchArchive", matchArchiveSchema);