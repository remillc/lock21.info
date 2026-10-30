// The zones' shapes for the small zone map (src/components/ZoneMap.astro, TODO #106), traced as rectangles on Nick Baets'
// 1988 drawing as the « Découpage du site » page shows it (src/content/docs/decoupage-site.webp, 1181 x 1564 px): the same
// places and orientation, in that image's pixels. A schematic of the real layout, not a survey.

/**
 * @typedef {Object} ZoneShape
 * @property {number} zone
 * @property {[number, number, number, number][]} rects - x, y, width, height
 * @property {[number, number]} [label] - where its number goes (default: the first rectangle's middle)
 * @property {boolean} [small] - its number smaller (a narrow zone)
 * @property {boolean} [outside] - its number beside it, in the page's colours
 */

/** The drawing's part the map shows: x, y, width, height */
export const viewBox = [240, 30, 840, 1400]

/** @type {ZoneShape[]} */
export const zones = [
  // The lock's chamber, north to south
  { zone: 21, rects: [[262, 337, 270, 180]] },
  { zone: 22, rects: [[262, 517, 270, 210]] },
  { zone: 23, rects: [[262, 727, 270, 195]] },
  { zone: 24, rects: [[262, 922, 270, 183]] },
  { zone: 25, rects: [[262, 1105, 270, 225]] },
  { zone: 26, rects: [[513, 1335, 40, 85]], small: true },
  // The spillways' enclaves: floors (1-6) and, north of the walkway, their upper part (10-15)
  { zone: 1, rects: [[905, 470, 70, 78]] },
  { zone: 2, rects: [[828, 470, 77, 78]] },
  { zone: 3, rects: [[755, 470, 73, 78]] },
  { zone: 4, rects: [[680, 470, 75, 78]] },
  { zone: 5, rects: [[603, 470, 77, 78]] },
  { zone: 6, rects: [[530, 470, 73, 78]] },
  { zone: 10, rects: [[903, 405, 70, 46]] },
  { zone: 11, rects: [[828, 405, 75, 46]] },
  { zone: 12, rects: [[755, 405, 73, 46]] },
  { zone: 13, rects: [[678, 405, 77, 46]] },
  { zone: 14, rects: [[603, 405, 75, 46]] },
  { zone: 15, rects: [[532, 405, 71, 46]] },
  // The walkway over them, drawn last of the three (on top)
  { zone: 9, rects: [[517, 451, 550, 19]], label: [1040, 460], small: true },
  // The walls: north (8) and east (7)
  { zone: 8, rects: [[962, 278, 26, 127]], small: true },
  { zone: 7, rects: [[972, 548, 26, 292]], small: true },
  // Small parts north of the chamber
  { zone: 16, rects: [[538, 558, 32, 32]], small: true },
  { zone: 20, rects: [[535, 290, 57, 82]] },
  { zone: 17, rects: [[578, 40, 28, 28], [606, 63, 420, 8]], label: [552, 54], small: true, outside: true },
  { zone: 18, rects: [[556, 115, 28, 30], [584, 137, 442, 8]], label: [530, 130], small: true, outside: true },
  { zone: 19, rects: [[528, 188, 28, 28], [556, 209, 470, 8]], label: [502, 202], small: true, outside: true },
]
