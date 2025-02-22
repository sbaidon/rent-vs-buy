import pkg from "lz-string";

export const encodeState = <T extends object>(state: T): string =>
  pkg.compressToEncodedURIComponent(JSON.stringify(state));

export const decodeState = <T extends object>(s: string, d: T): T => {
  try {
    const decompressed = pkg.decompressFromEncodedURIComponent(s);
    if (!decompressed) throw new Error("Decompression failed");

    const decoded = JSON.parse(decompressed);
    return decoded && typeof decoded === "object"
      ? {
          ...d,
          ...Object.fromEntries(
            Object.entries(decoded).filter(
              ([k, v]) => typeof v === typeof d[k as keyof T]
            )
          ),
        }
      : d;
  } catch {
    return d;
  }
};
