function box(title, ...bodyLines) {
  const dashes = "─".repeat([...title].length);
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