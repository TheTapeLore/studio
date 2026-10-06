// Safe-zone aware layout for every aspect. Positions come from brand/tokens.json + config/platforms.yaml.
import { createContext, useContext } from "react";
import { useVideoConfig } from "remotion";
import { LAYOUT } from "../../tokens";
import { Aspect } from "../../lib/spec";

export interface Rect { x: number; y: number; w: number; h: number }
export interface Layout {
  aspect: Aspect;
  W: number;
  H: number;
  /** Scale unit: 1 at 1080 on the short side. */
  u: number;
  safe: { left: number; right: number; top: number; bottom: number };
  tape: Rect;
  stage: Rect;
  caption: Rect;
  bug: { x: number; y: number; size: number };
}

export const aspectOf = (W: number, H: number): Aspect => (W > H ? "16x9" : H / W > 1.5 ? "9x16" : "4x5");

export const computeLayout = (W: number, H: number): Layout => {
  const aspect = aspectOf(W, H);
  const u = Math.min(W, H) / 1080;
  const safe =
    aspect === "9x16" ? LAYOUT.safe_9x16 : aspect === "4x5" ? LAYOUT.safe_4x5 : { left: 96, right: 96, top: 56, bottom: 72 };
  const bugSize = 72 * u;
  const tapeH = 64 * u;
  const tapeY = aspect === "9x16" ? safe.top + 10 * u : safe.top + 8 * u;
  const tape = { x: 0, y: tapeY, w: W, h: tapeH };
  const capH = (aspect === "16x9" ? 170 : aspect === "9x16" ? 250 : 230) * u;
  const capBottom = H - safe.bottom;
  const caption = {
    x: safe.left,
    y: capBottom - capH,
    w: W - safe.left - safe.right - (aspect === "16x9" ? 0 : bugSize + 24 * u),
    h: capH,
  };
  const stageTop = tapeY + tapeH + 34 * u;
  const stage = { x: safe.left, y: stageTop, w: W - safe.left - safe.right, h: caption.y - 24 * u - stageTop };
  const bug = { x: W - safe.right - bugSize, y: H - safe.bottom - bugSize, size: bugSize };
  return { aspect, W, H, u, safe, tape, stage, caption, bug };
};

export const LayoutContext = createContext<Layout | null>(null);
export const useLayout = (): Layout => {
  const ctx = useContext(LayoutContext);
  const { width, height } = useVideoConfig();
  return ctx ?? computeLayout(width, height);
};
