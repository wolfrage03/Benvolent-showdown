
function displayWidth(str) {
  let w = 0;
  for (const ch of [...str]) {
    const cp = ch.codePointAt(0);
    if (!cp) continue;
    // Variation selectors are zero-width — skip
    if (cp >= 0xFE00 && cp <= 0xFE0F) continue;
    // Emoji, symbols, CJK → width 2
    if (
      (cp >= 0x1F000 && cp <= 0x1FFFF) ||
      (cp >= 0x2600  && cp <= 0x27BF)  ||
      (cp >= 0x2300  && cp <= 0x23FF)  ||
      (cp >= 0x2B00  && cp <= 0x2BFF)  ||
      (cp >= 0x3000  && cp <= 0x9FFF)  ||
      (cp >= 0xF900  && cp <= 0xFAFF)  ||
      (cp >= 0x20000 && cp <= 0x2A6DF)
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

function box(title, ...bodyLines) {
  const w     = displayWidth(title);
  const dashes = "─".repeat(w + 2);
  const top   = `╭${dashes}╮`;
  const mid   = ` ${title} `;
  const bot   = `╰${dashes}╯`;
  const parts = [top, mid, bot];
  if (bodyLines.length > 0) {
    parts.push(...bodyLines);
  }
  return parts.join("\n");
}

module.exports = box;