export const MM_PER_IN = 25.4

// The rim flange sticks out past the bead seat by about half an inch each
// side, so an 8.5" wheel is about 9.5" wide overall.
export const FLANGE_WIDTH_MM = 12.7
export const FLANGE_HEIGHT_MM = 17.5

// Drawing sizes for the wheel barrel and mounting disc.
export const BARREL_MM = 8
export const DISC_MM = 15

// Fender, seen in the same cross-section. Only the bottom of the outer skin and
// its lip are modeled, since that's where a tire or wheel would touch it. The
// lip is a flange folded 90° inboard; rolling it folds it flat against the
// inside of the skin, so the skin gets thicker but nothing sticks inboard.
export const FENDER_OUTER_MM = 90
export const FENDER_LIP_MM = 20
export const FENDER_SHEET_MM = 1
export const FENDER_ROLL_MM = 2
// How much skin to draw above the lip (more if the tire reaches higher).
export const FENDER_SKIN_MM = 40

// Ride height: hub center to the bottom of the fender lip.
export const RIDE_HEIGHT_MIN_IN = 10
export const RIDE_HEIGHT_MAX_IN = 14.75
export const RIDE_HEIGHT_STEP_IN = 0.125
export const RIDE_HEIGHT_DEFAULT_IN = 14.5
