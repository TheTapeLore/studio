// Spec beats name their visual by string: beats[].component. This is the whole vocabulary.
// A new component must be added here AND to gallery/entries.ts.
import React from "react";
import { Lockup, Mark } from "./brand";
import { CandleChart, Distribution, RunsFan } from "./charts";
import { AssumptionsPanel, EndCard, MythCard, PollCard, QuoteCard, RuleCard, StatCard, TermCard, TitleCard } from "./layout/cards";
import * as M from "./metaphors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const COMPONENTS: Record<string, React.FC<any>> = {
  ThePit: M.ThePit,
  PitCurve: M.PitCurve,
  RTower: M.RTower,
  RCompare: M.RCompare,
  RRuler: M.RRuler,
  Duel: M.Duel,
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
  PivotStep: M.PivotStep,
  CandleChart,
  RunsFan,
  Distribution,
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
