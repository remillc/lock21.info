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
    cam: [-31.65, 10.45, -10.5, -55.3, -7.97, -29.94],
    title: { fr: 'Au-dessus des piliers', en: 'Above the piers' },
    text: {
      fr: 'Le dessus du déversoir: les piliers, la passerelle qui les relie et les mécanismes qui levaient les vannes. Le haut des murs est à 40 pieds (12 m) sous la surface.',
      en: 'The top of the spillway: the piers, the footbridge that joins them and the gear that raised the gates. The tops of the walls are 40 feet (12 m) below the surface.',
    },
  },
  {
    kind: 'view',
    cam: [-18.54, 1.28, 8.53, -17.08, -0.65, 10.34],
    title: { fr: 'Une porte de vanne', en: 'A gate door' },
    text: {
      fr: 'Une des portes des vannes du déversoir, couchée sur le fond (zone 16). Le fer de son cadre est rongé par la rouille.',
      en: 'One of the spillway’s gate doors, lying on the bottom (zone 16). The iron of its frame is eaten by rust.',
    },
  },
  {
    kind: 'move',
    from: [-27.28, 2.02, -16.28, -61.37, -7.37, -21.45],
    // Over the sill in the middle passage (a straight line hit it 8.4 m along), centred between its uprights
    via: [[-34.2, 2.2, -15.6], [-35.8, 2.35, -15.5], [-36.6, 2.1, -15.35]],
    to: [-37.22, 1.69, -15.24, -75.0, -10.69, -21.69],
    pace: 1.2,
    title: { fr: 'Par le passage d’une vanne', en: 'Through a gate passage' },
    text: {
      fr: 'Les vannes ouvertes laissaient passer l’eau sous la voûte. On traverse le passage du milieu, vers l’ouest.',
      en: 'With the gates open, the water ran under the vault. We go through the middle passage, westward.',
    },
  },
  {
    kind: 'move',
    from: [-46.34, 4.98, -16.15, -41.79, 3.96, -16.02],
    to: [-38.7, 3.99, -16.38, -37.72, 3.77, -16.35],
    pace: 0.8,
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
    cam: [-106.95, 7.59, -10.04, -36.26, -20.92, 11.83],
    title: { fr: 'La zone 18', en: 'Zone 18' },
    text: {
      fr: 'Dernier arrêt: le bloc de la zone 18, à l’ouest, et l’écluse au loin. Le relevé continue: les volumes violets sont les zones pas encore numérisées.',
      en: 'Last stop: the block of zone 18, to the west, and the lock in the distance. The survey goes on: the purple shapes are the zones not scanned yet.',
    },
  },
]
