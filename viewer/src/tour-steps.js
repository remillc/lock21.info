// The guided tour's steps (TODO #48; tour.js plays them). The views and moves are Christian's (2026-10-24); the texts are
// drafts to review. Each step:
// - view: a camera (x, y, z, then the point it looks at: the viewer's ?cam= numbers);
// - move: the camera travels from one camera to another, through the points in `via` (camera positions; the point it
//   looks at glides from the first camera's to the last's), at `pace` m/s;
// and a title and a short text in French and English.

/** @typedef {[number, number, number, number, number, number]} Cam */
/**
 * @typedef {Object} TourStep
 * @property {'view' | 'move'} kind
 * @property {Cam} [cam] - a view's camera
 * @property {Cam} [from] - a move's first camera
 * @property {Cam} [to] - a move's last camera
 * @property {[number, number, number][]} [via] - a move's points in between
 * @property {number} [pace] - a move's speed (m/s)
 * @property {number} [wait] - a move's pause at its start before it sets off (s; tour.js MOVE_PAUSE by default)
 * @property {[number, number, number][]} [approach] - the flight into the step passes through these points (camera
 *   positions), instead of its own curve
 * @property {([number, number, number] | { dir: [number, number, number] })[]} [looks] - with approach: what the camera
 *   looks at as it passes each approach point (one each), the line of sight gliding from one to the next: a point, or a
 *   direction from wherever the camera is ({ dir: [-1, 0, 0] }: level, due west)
 * @property {number} [turnFirst] - with looks: first a turn in place toward the first point looked at, over this many
 *   seconds; the camera sets off a little before it ends (tour.js TURN_OVERLAP)
 * @property {number[]} [paces] - with approach: a speed (m/s) for each stretch between its points (from the camera to
 *   the first, ..., from the last to the step's camera), instead of flightPace
 * @property {number} [accel] - with paces: the most the speed changes (m/s²; tour.js ACCEL otherwise)
 * @property {number} [flightPace] - the flight into the step at this mean speed (m/s), instead of its usual length
 * @property {number} [turn] - on the flight into the step, the camera turns toward the step's point first, within
 *   this share of the flight (otherwise gradually, all along it)
 * @property {{ fr: string, en: string }} title
 * @property {{ fr: string, en: string }} text
 */

/** @type {TourStep[]} */
export const TOUR_STEPS = [
  {
    kind: 'view',
    cam: [-18.6, 3.08, -27.91, -45.68, -28.73, -39.76],
    title: { fr: 'L’écluse 21', en: 'Lock 21' },
    text: {
      fr: 'Dickinson Landing, un des villages engloutis du Saint-Laurent: l’écluse est sous l’eau depuis 1958. On commence au fond, sur le plancher de madriers d’une des enclaves du déversoir, à 60 pieds (18 m) sous la surface.',
      en: 'Dickinson Landing, one of the St. Lawrence’s Lost Villages: the lock has been under water since 1958. We start at the bottom, on the plank floor of one of the spillway’s bays, 60 feet (18 m) below the surface.',
    },
  },
  {
    kind: 'view',
    // Christian's view (2026-10-24; was -31.65, 10.45, -10.5 looking at -55.3, -7.97, -29.94, then -31.65, 10.45,
    // -17.28 looking at -34.3, 8.39, -19.46). From step 1, close to
    // the floor east of the piers' ends (open, about 1 m high), then up along the south side of the pier at z -21 to
    // the view; slowly. Checked against every surface: never closer than 1.2 m
    cam: [-31.09, 9.78, -17.83, -33.72, 8.21, -20.01],
    // The climb 50 cm farther from the pier than first (Christian, 2026-10-24): away from it, south-east, then south
    // The climb (Christian, 2026-10-24) up the pier's east end (its top flat at 8.36 m, 1.4 m wide from z -21.2 to
    // -19.8, from x -29.4 westward; its end stepping down to 4.2 m at x -27.5), to about 1 m over its top; tilting
    // down near the top (25° at the top: the sky behind the highest structure above, the pier's top below);
    // then one smooth move on to the view, the line of sight gliding toward its point (Christian, 2026-10-24: the dolly
    // and the turn after it were too mechanical).
    // Clear of every surface (about 1 m at least)
    // (the climb starting 1 m sooner along the low way: Christian, 2026-10-24; was at -25.15, 2.0, -19.45)
    approach: [[-20.5, 2.0, -25.0], [-24.51, 2.0, -20.22], [-27.0, 5.0, -19.6], [-27.9, 8.0, -20.2], [-28.4, 9.3, -20.5]],
    // Low, looking about level toward the pillars and the pier to climb (the floor in view); climbing, level toward the
    // west; near the top, tilting down to 25° (Christian, 2026-10-24: 11°, 18°, 30°, then 25°: the view's own); then gliding to the
    // view's point
    looks: [[-29, 2.2, -20.5], { dir: [-1, 0, 0] }, { dir: [-1, 0, 0] }, { dir: [-1, -0.23, 0] }, { dir: [-1, -0.466, 0] }],
    // Low over the floor (it first turns toward the first column, setting off near the end of the turn), the climb at
    // 0.75 m/s (Christian, 2026-10-24), the dolly and the end slower
    // (the glide to the view 25 % faster: Christian, 2026-10-24)
    // (the climb 50 % faster than 0.75 m/s: Christian, 2026-10-24)
    paces: [2, 2, 1.125, 1.125, 1.125, 0.625],
    turnFirst: 2.5,
    title: { fr: 'Au-dessus des piliers', en: 'Above the piers' },
    text: {
      fr: 'Le dessus du déversoir: les piliers, la passerelle qui les relie et les mécanismes qui levaient les vannes. Le haut des murs est à 40 pieds (12 m) sous la surface.',
      en: 'The top of the spillway: the piers, the footbridge that joins them and the gear that raised the gates. The tops of the walls are 40 feet (12 m) below the surface.',
    },
  },
  {
    kind: 'view',
    cam: [-18.3, 1.55, 8.64, -17.06, -0.43, 10.55],
    // From step 2 (Christian, 2026-10-24: the first try's fast turn was horrible): turning around in place toward the
    // door, then out over the edge east of the piers' ends and plunging toward the floor, looking at the door all the
    // way, the dive levelling off near the floor into a glide to the door. Clear of every surface (1.5 m at least)
    // (landing 2 m farther south-east: Christian, 2026-10-24; was -14.5, 2.1, 0); then an elegant loop to the right on
    // the floor, round the door by the south and east, to its view, the door looked at all the way (Christian,
    // 2026-10-24). Clear of every surface (1.5 m at least)
    approach: [[-24, 9.2, -12], [-18, 5.5, -5], [-13.09, 2.1, 1.41], [-11.6, 1.9, 3.6], [-12.0, 1.8, 6.4], [-14.4, 1.7, 8.0]],
    looks: [[-17.06, -0.43, 10.55], [-17.06, -0.43, 10.55], [-17.06, -0.43, 10.55], [-17.06, -0.43, 10.55], [-17.06, -0.43, 10.55], [-17.06, -0.43, 10.55]],
    // (about 30 % faster than first: Christian, 2026-10-24, too slow)
    turnFirst: 3.2,
    // (speeding up harder in the plunge, then 50 % faster: Christian, 2026-10-24); the loop slower
    // (all 25 % faster: Christian, 2026-10-24)
    paces: [2, 6.4, 3.9, 2, 1.6, 1.4, 1.1],
    accel: 2.6,
    title: { fr: 'Une porte de vanne', en: 'A gate door' },
    text: {
      fr: 'Une des portes des vannes du déversoir, couchée sur le fond (zone 16). Le fer de son cadre est rongé par la rouille.',
      en: 'One of the spillway’s gate doors, lying on the bottom (zone 16). The iron of its frame is eaten by rust.',
    },
  },
  {
    kind: 'move',
    from: [-27.28, 2.02, -16.28, -61.37, -7.37, -21.45],
    // From step 3 (Christian, 2026-10-24: accelerating softly while the way plunges): up slowly out of the door's area,
    // over the floor east of the piers' ends, then diving into the bay, faster as it goes down, braking only at the
    // end, along the move's line of sight. Clear of every surface (1.3 m at least)
    approach: [[-18.4, 5.2, 5.5], [-19.0, 7.6, -2], [-20.5, 6.0, -9.5], [-23.6, 3.2, -15.0]],
    // (the first stretch faster: 1.4, was 0.8, Christian, 2026-10-24)
    paces: [1.4, 1.4, 1.9, 2.3, 0.9],
    // Through the passage in line with the start (Christian, 2026-10-24: it went through the walls), in its middle: the
    // passages are 1.1 m wide (z -17.2 to -16.1 for this one) and 1.1 m high (y 1.8 to 2.9), their piers 0.8 m wide
    // and 3.1 m long (x -32.7 to -35.8); measured with the finest tiles, every surface counted
    via: [[-31.6, 2.3, -16.6], [-34.2, 2.35, -16.65], [-36.5, 2.3, -16.4]],
    to: [-37.22, 1.69, -15.24, -75.0, -10.69, -21.69],
    pace: 1.2,
    title: { fr: 'Par le passage d’une vanne', en: 'Through a gate passage' },
    text: {
      fr: 'Les vannes ouvertes laissaient passer l’eau sous la voûte. On traverse un des passages, vers l’ouest.',
      en: 'With the gates open, the water ran under the vault. We go through one of the passages, westward.',
    },
  },
  {
    // Added by Christian, 2026-10-24
    kind: 'view',
    cam: [-45.27, 1.67, -26.26, -40.87, 2.8, -28.73],
    title: { fr: 'Les piliers, côté ouest', en: 'The piers, west side' },
    text: {
      fr: 'Du côté ouest, les piliers sont arrondis, montés en assises de pierre. Derrière, l’enclave est fermée par un mur de madriers.',
      en: 'On the west side, the piers are rounded, built in courses of stone. Behind them, the bay is closed by a wall of timbers.',
    },
  },
  {
    kind: 'move',
    from: [-46.34, 4.98, -16.15, -41.79, 3.96, -16.02],
    to: [-38.7, 3.99, -16.38, -37.72, 3.77, -16.35],
    pace: 0.8,
    // A look at the gates before moving in (Christian, 2026-10-24)
    wait: 3,
    title: { fr: 'Les vannes, de près', en: 'The gates, up close' },
    text: {
      fr: 'De l’autre côté, les trois vannes pendent encore à leurs tiges, au-dessus des passages. On s’approche.',
      en: 'On the other side, the three gates still hang from their rods above the passages. Let’s move closer.',
    },
  },
  {
    kind: 'view',
    cam: [-56.68, 6.62, -22.08, -56.34, 3.94, -30.87],
    title: { fr: 'L’escalier du mur nord', en: 'The north wall’s steps' },
    text: {
      fr: 'Au bout ouest du mur nord, sa structure en escalier (zone 8).',
      en: 'At the west end of the north wall, its stepped structure (zone 8).',
    },
  },
  {
    kind: 'view',
    // It looks at the top of the block, at its centre, from the start of the flight to the end (Christian, 2026-10-24:
    // turning toward it as soon as the flight starts, the same point all the way); his view looked at
    // -36.26, -20.92, 11.83, a little lower and further north
    cam: [-106.95, 7.59, -10.04, -93.75, 6.42, -4.0],
    turn: 0.12,
    title: { fr: 'La zone 18', en: 'Zone 18' },
    text: {
      fr: 'Dernier arrêt: le bloc de la zone 18, à l’ouest, et l’écluse au loin. Le relevé continue: les volumes violets sont les zones pas encore numérisées.',
      en: 'Last stop: the block of zone 18, to the west, and the lock in the distance. The survey goes on: the purple shapes are the zones not scanned yet.',
    },
  },
]
