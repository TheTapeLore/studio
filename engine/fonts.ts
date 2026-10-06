// Brand fonts from @fontsource (SIL OFL 1.1). Rendering waits until every face is loaded.
import "@fontsource/big-shoulders-display/latin-800";
import "@fontsource/big-shoulders-display/latin-900";
import "@fontsource/martian-mono/latin-400";
import "@fontsource/martian-mono/latin-600";
import "@fontsource/atkinson-hyperlegible-next/latin-400";
import "@fontsource/atkinson-hyperlegible-next/latin-700";
import { continueRender, delayRender } from "remotion";
import { TYPE } from "./tokens";

const faces = [
  `800 40px "${TYPE.display.family}"`,
  `900 40px "${TYPE.display.family}"`,
  `400 40px "${TYPE.mono.family}"`,
  `600 40px "${TYPE.mono.family}"`,
  `400 40px "${TYPE.body.family}"`,
  `700 40px "${TYPE.body.family}"`,
];

let started = false;
export const loadBrandFonts = () => {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("Loading brand fonts");
  Promise.all(faces.map((f) => document.fonts.load(f, "Aa0%−+")))
    .then(() => document.fonts.ready)
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error("Font load failed", err);
      continueRender(handle);
    });
};
