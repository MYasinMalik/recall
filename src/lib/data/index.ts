import { apiData } from "./api";
import { fakeData } from "./fake";
import type { DataLayer } from "./types";

const SAMPLE_KEY = "recall.sample";

/** True when this browser has chosen the built-in sample lessons instead of signing in. */
export function usingSamples(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(SAMPLE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUsingSamples(on: boolean) {
  try {
    if (on) localStorage.setItem(SAMPLE_KEY, "1");
    else localStorage.removeItem(SAMPLE_KEY);
  } catch {
    // Storage is blocked; the app falls back to asking for sign-in.
  }
}

// The one place screens get data from. Each call goes to the sample layer or to the server,
// depending on what this browser chose on the sign-in page.
export const data: DataLayer = new Proxy({} as DataLayer, {
  get(_target, prop: keyof DataLayer) {
    if (prop === "subscribe") {
      return (listener: () => void) => {
        const a = apiData.subscribe(listener);
        const b = fakeData.subscribe(listener);
        return () => {
          a();
          b();
        };
      };
    }
    const layer = usingSamples() ? fakeData : apiData;
    return layer[prop];
  },
});

export * from "./types";
