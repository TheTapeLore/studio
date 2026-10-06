import { createContext, useContext } from "react";
import { Episode } from "./spec";

export const EpisodeContext = createContext<Episode | null>(null);
export const useEpisode = () => useContext(EpisodeContext);
