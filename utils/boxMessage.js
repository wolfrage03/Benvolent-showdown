function box(title, ...bodyLines) {
  const len    = [...title].length;
  const dashes = "─".repeat(len + 2);
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