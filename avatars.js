// Coordinates on the original 1280 × 720 contact sheet, in reading order.
const avatarFrames = [
  [47, 23, 90, 92], [165, 23, 95, 92], [288, 23, 98, 92], [405, 23, 81, 92],
  [505, 23, 86, 92], [610, 23, 88, 92], [717, 23, 94, 92], [844, 23, 81, 92],
  [951, 23, 92, 92], [1069, 23, 85, 91],
  [47, 137, 90, 96], [166, 137, 94, 96], [288, 137, 98, 96], [405, 137, 81, 96],
  [505, 137, 86, 96], [610, 137, 88, 93], [717, 137, 88, 93], [844, 136, 81, 90],
  [948, 137, 95, 86], [1069, 137, 81, 90],
  [47, 268, 95, 92], [165, 268, 98, 96], [286, 266, 95, 102], [404, 266, 95, 105],
  [511, 266, 95, 105], [618, 266, 94, 107], [735, 269, 117, 99], [885, 270, 89, 92],
  [47, 386, 90, 104], [159, 386, 132, 104], [302, 406, 98, 84],
];

function avatarPortrait(id) {
  const frame = avatarFrames[id - 1];
  if (!frame) return '';
  const [x, y, width, height] = frame;
  const size = Math.min(width, height);
  const left = x + (width - size) / 2;
  const top = y + (height - size) / 2;
  return `<span aria-hidden="true" class="avatar-portrait" style="background-size:${128000 / size}% ${72000 / size}%;background-position:${100 * left / (1280 - size)}% ${100 * top / (720 - size)}%"></span>`;
}

if (typeof module !== 'undefined') module.exports = avatarFrames.length;
