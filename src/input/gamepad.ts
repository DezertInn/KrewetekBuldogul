export type InputFamily = 'keyboard' | 'xbox' | 'playstation' | 'gamepad';
export interface PadLike {
  id: string;
  index: number;
  connected: boolean;
  mapping: string;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value: number }[];
}
export function controllerFamily(id: string): Exclude<InputFamily, 'keyboard'> {
  if (/dualshock|dualsense|playstation|sony|054c/i.test(id)) return 'playstation';
  if (/xbox|xinput|045e/i.test(id)) return 'xbox';
  return 'gamepad';
}
/** Neutral labels use one-based numbers. Only verified standard mappings receive family labels. */
export function gamepadButtonLabel(index: number, family: InputFamily): string {
  const xbox = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'Xbox'];
  const playstation = ['Cross', 'Circle', 'Square', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'D-pad up', 'D-pad down', 'D-pad left', 'D-pad right', 'PS'];
  return (family === 'xbox' ? xbox : family === 'playstation' ? playstation : [])[index] ?? `Button ${index + 1}`;
}
