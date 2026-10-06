import React, { createContext, useContext } from "react";
import { Rect, useLayout } from "./layout";

const StageContext = createContext<{ w: number; h: number } | null>(null);

/** The box a visual may draw in (below the TapeStrip/headline, above the caption band). */
export const useStage = () => {
  const s = useContext(StageContext);
  const L = useLayout();
  return s ?? { w: L.stage.w, h: L.stage.h };
};

export const Stage: React.FC<{ rect?: Rect; children: React.ReactNode; style?: React.CSSProperties }> = ({ rect, children, style }) => {
  const L = useLayout();
  const r = rect ?? L.stage;
  return (
    <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, ...style }}>
      <StageContext.Provider value={{ w: r.w, h: r.h }}>{children}</StageContext.Provider>
    </div>
  );
};
