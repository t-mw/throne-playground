export function colorFromSeed(seed) {
  const color = Math.floor((Math.abs(Math.sin(seed) * 16777215)) % 16777215);

  let r = (color >> 16) & 0xff;
  let g = (color >> 8) & 0xff;
  let b = color & 0xff;

  // mix with white
  r = Math.floor((r + 0xff) / 2);
  g = Math.floor((g + 0xff) / 2);
  b = Math.floor((b + 0xff) / 2);

  return "rgb(" + r.toString() + "," + g.toString() + "," + b.toString() + ")";
}

export function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function debounce(func, ms) {
  let timeout;
  return function() {
    const delayed = () => {
      timeout = null;
      func.apply(this, arguments);
    };
    clearTimeout(timeout);
    timeout = setTimeout(delayed, ms);
  };
}
