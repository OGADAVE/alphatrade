/** Exponential moving average. Returns an array aligned 1:1 with `values`. */
export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  values.forEach((v, i) => {
    if (i === 0) {
      result.push(v);
      return;
    }
    result.push(v * k + result[i - 1] * (1 - k));
  });
  return result;
}

/**
 * RSI using Wilder's smoothing. Returns an array aligned 1:1 with `values`;
 * entries before `period` are NaN since there isn't enough data yet.
 */
export function rsi(values: number[], period = 14): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length <= period) return result;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += -diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}
