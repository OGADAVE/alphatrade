import type { StrategyEngine } from "./types";
import { alphaMomentumEngine } from "./alpha-momentum-engine";
import { fxMomentumEngine } from "./fx-momentum-engine";

export const strategyEngines: StrategyEngine[] = [alphaMomentumEngine, fxMomentumEngine];
