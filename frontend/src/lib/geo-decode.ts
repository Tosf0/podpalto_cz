/**
 * Dekódování kompaktních prstenců hranic (src/data/geo/*): celá čísla v 1e-5 stupně,
 * delta kódování [x0, y0, dx1, dy1, …] → pole [lng, lat].
 */
export function decodeRing(encoded: number[]): [number, number][] {
  const out: [number, number][] = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i < encoded.length; i += 2) {
    x += encoded[i];
    y += encoded[i + 1];
    out.push([x / 1e5, y / 1e5]);
  }
  return out;
}
