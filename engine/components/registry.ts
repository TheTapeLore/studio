// Spec beats name their visual by string: beats[].component. This is the whole vocabulary.
// A new component must be added here AND to gallery/entries.ts.
import React from "react";
import { Lockup, Mark } from "./brand";
import { CandleChart } from "./charts";
import { AssumptionsPanel, EndCard, MythCard, PollCard, QuoteCard, RuleCard, StatCard, TermCard, TitleCard } from "./layout/cards";
import * as M from "./metaphors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COMPONENTS: Record<string, React.FC<any>> = {
  ThePit: M.ThePit,
  PitCurve: M.PitCurve,
  RTower: M.RTower,
  Seesaw: M.Seesaw,
  MarketWeather: M.MarketWeather,
  TheRace: M.TheRace,
  Anatomy: M.Anatomy,
  FiveExits: M.FiveExits,
  Throttle: M.Throttle,
  Hourglass: M.Hourglass,
  Rope: M.Rope,
  PayoffDiagram: M.PayoffDiagram,
  InnerChart: M.InnerChart,
  CouncilArc: M.CouncilArc,
  LegendCard: M.LegendCard,
  CandleChart,
  EndCard,
  RuleCard,
  MythCard,
  PollCard,
  TermCard,
  QuoteCard,
  StatCard,
  AssumptionsPanel,
  TitleCard,
  Mark,
  Lockup,
};

export const componentNames = () => Object.keys(COMPONENTS);
