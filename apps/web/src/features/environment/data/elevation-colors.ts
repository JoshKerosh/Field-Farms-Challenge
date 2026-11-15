export const ALTITUDE_STOPS: readonly (readonly [number, readonly [number, number, number]])[] = [
  [-1, [37, 91, 128]],
  [0, [56, 129, 123]],
  [250, [99, 158, 101]],
  [750, [175, 193, 112]],
  [1500, [226, 190, 101]],
  [2500, [188, 115, 73]],
  [3500, [209, 181, 153]],
  [4200, [244, 240, 224]],
];

export function terrariumElevation(red: number, green: number, blue: number): number {
  return red * 256 + green + blue / 256 - 32768;
}

export function altitudeColor(elevation: number): readonly [number, number, number] {
  if (elevation <= ALTITUDE_STOPS[0][0]) return ALTITUDE_STOPS[0][1];
  for (let index = 1; index < ALTITUDE_STOPS.length; index++) {
    const [upper, upperColor] = ALTITUDE_STOPS[index];
    const [lower, lowerColor] = ALTITUDE_STOPS[index - 1];
    if (elevation <= upper) {
      const fraction = (elevation - lower) / (upper - lower);
      return lowerColor.map((channel, channelIndex) =>
        Math.round(channel + (upperColor[channelIndex] - channel) * fraction),
      ) as [number, number, number];
    }
  }
  return ALTITUDE_STOPS[ALTITUDE_STOPS.length - 1][1];
}
