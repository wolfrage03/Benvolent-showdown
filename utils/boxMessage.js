function box(title, ...bodyLines) {
  const dashes = "─".repeat(Math.floor([...title].length * 0.6));
  const top    = `╭${dashes}╮`;
  const mid    = ` ${title} `;
  const bot    = `╰${dashes}╯`;

  const parts = [top, mid, bot];
  if (bodyLines.length > 0) {
    parts.push(...bodyLines);
  }
  return parts.join("\n");
}

module.exports = box;