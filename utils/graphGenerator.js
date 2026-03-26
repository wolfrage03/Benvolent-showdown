// utils/graphGenerator.js
// npm install chartjs-node-canvas

const { ChartJSNodeCanvas } = require("chartjs-node-canvas");

const width  = 900;
const height = 320;

function computeOvers(overHistory) {
  let cum = 0, wk = 0;
  return (overHistory || []).map(o => {
    const runs  = o.balls.reduce((s, b) => s + (b === "W" ? 0 : Number(b)), 0);
    const wkts  = o.balls.filter(b => b === "W").length;
    cum += runs; wk += wkts;
    return { over: o.over, runs, cum, wkts: wk, hasWkt: wkts > 0 };
  });
}

async function generateMatchGraph(match) {
  // Innings 1 — use firstInningsData if available, else current (still in inn 1)
  const inn1Raw  = match.innings === 1 ? match : (match.firstInningsData || null);
  const inn2Raw  = match.innings === 2 ? match : null;

  const d1 = computeOvers(inn1Raw?.overHistory);
  const d2 = computeOvers(inn2Raw?.overHistory);

  const inn1Name = inn1Raw
    ? (inn1Raw.battingTeam === "A" ? inn1Raw.teamAName : inn1Raw.teamBName)
    : (match.teamAName || "Team A");
  const inn2Name = inn2Raw
    ? (inn2Raw.battingTeam === "A" ? inn2Raw.teamAName : inn2Raw.teamBName)
    : null;

  const allLen     = Math.max(d1.length, d2.length, match.totalOvers || 0);
  const overLabels = Array.from({ length: allLen }, (_, i) => `Ov ${i + 1}`);

  const BG    = "#17212b";
  const GRID  = "rgba(80,120,160,0.15)";
  const TICK  = "#5a7a9a";
  const BLUE  = "rgba(91,157,217,0.8)";
  const GREEN = "rgba(52,188,130,0.8)";
  const RED   = "rgba(220,80,80,0.8)";

  const canvas = new ChartJSNodeCanvas({
    width, height,
    backgroundColour: BG,
  });

  const datasets = [
    // Inn 1 bars
    {
      label: `${inn1Name} runs/ov`,
      data: overLabels.map((_, i) => d1[i]?.runs ?? 0),
      backgroundColor: overLabels.map((_, i) =>
        d1[i] ? (d1[i].hasWkt ? RED : BLUE) : "transparent"
      ),
      borderRadius: 3,
      borderSkipped: false,
      stack: "inn1",
      yAxisID: "y",
      order: 2,
    },
    // Inn 1 cumulative line
    {
      label: `${inn1Name} total`,
      data: overLabels.map((_, i) => d1[i]?.cum ?? null),
      type: "line",
      borderColor: "#5b9dd9",
      backgroundColor: "transparent",
      borderWidth: 2,
      pointRadius: 3,
      pointBackgroundColor: "#5b9dd9",
      tension: 0.35,
      yAxisID: "y2",
      order: 1,
      spanGaps: false,
    },
  ];

  // Only add inn 2 datasets if innings 2 has started
  if (d2.length > 0) {
    datasets.push(
      {
        label: `${inn2Name} runs/ov`,
        data: overLabels.map((_, i) => d2[i]?.runs ?? 0),
        backgroundColor: overLabels.map((_, i) =>
          d2[i] ? (d2[i].hasWkt ? RED : GREEN) : "transparent"
        ),
        borderRadius: 3,
        borderSkipped: false,
        stack: "inn2",
        yAxisID: "y",
        order: 2,
      },
      {
        label: `${inn2Name} total`,
        data: overLabels.map((_, i) => d2[i]?.cum ?? null),
        type: "line",
        borderColor: "#34bc82",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#34bc82",
        tension: 0.35,
        yAxisID: "y2",
        order: 1,
        spanGaps: false,
      }
    );
  }

  // Title shows current state
  const titleText = match.innings === 1
    ? `📊 Innings 1 — ${inn1Name} | ${match.score}/${match.wickets} (${match.currentOver}.${match.currentBall}/${match.totalOvers} ov)`
    : `📊 Match Progression | Inn1: ${match.firstInningsScore} vs Inn2: ${match.score}/${match.wickets}`;

  const config = {
    type: "bar",
    data: { labels: overLabels, datasets },
    options: {
      responsive: false,
      animation: false,
      layout: { padding: { top: 10, right: 20, bottom: 10, left: 10 } },
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: { color: TICK, font: { size: 11 }, boxWidth: 12, padding: 14 },
        },
        title: {
          display: true,
          text: titleText,
          color: "#7a9bb5",
          font: { size: 12 },
          padding: { bottom: 6 },
        },
      },
      scales: {
        x: {
          grid: { color: GRID },
          ticks: { color: TICK, font: { size: 10 } },
        },
        y: {
          position: "left",
          grid: { color: GRID },
          ticks: { color: TICK, font: { size: 10 } },
          title: { display: true, text: "Runs/Over", color: TICK, font: { size: 10 } },
          min: 0,
        },
        y2: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: { color: TICK, font: { size: 10 } },
          title: { display: true, text: "Cumulative", color: TICK, font: { size: 10 } },
          min: 0,
        },
      },
    },
  };

  return canvas.renderToBuffer(config);
}

module.exports = { generateMatchGraph };