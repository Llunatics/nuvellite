'use client';

import React from 'react';
import { PriceSummary } from '@/lib/data/price-service';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface PriceChartProps {
  summary: PriceSummary;
}

/**
 * Price history (Round 2, Zone 5 de-duplication).
 *
 * The hero ledger already shows the current price and any discount, so this
 * component never repeats a promo banner. Without real historical
 * fluctuation it renders a single quiet monospace line; the stat strip and
 * SVG chart appear only when there are at least two recorded snapshots and
 * an actual fluctuation.
 */
export function PriceChart({ summary }: PriceChartProps) {
  const {
    currentPrice,
    originalPrice,
    isDiscounted,
    lowestObservedPrice,
    highestObservedPrice,
    priceChangeAmount,
    priceChangePercent,
    hasHistoricalFluctuation,
    snapshots,
  } = summary;

  if (!hasHistoricalFluctuation || snapshots.length < 2) {
    return (
      <div className="border-y border-white/[0.06] py-3 text-xs font-mono text-editorial-muted flex items-center justify-between">
        <span>
          Riwayat Harga: Stabil di {formatRupiah(currentPrice)} ({snapshots.length || 1} pencatatan)
        </span>
        <span className="text-editorial-faint">sejak tercatat</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 border border-white/[0.06]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
            Harga Terkini
          </span>
          <span className="text-base font-mono font-bold text-editorial-title mt-1 block tabular-nums">
            {formatRupiah(currentPrice)}
          </span>
        </div>

        <div className="p-3.5 border border-white/[0.06]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
            {isDiscounted && originalPrice ? 'Harga Normal' : 'Harga Terendah'}
          </span>
          <span className="text-base font-mono font-bold text-editorial-muted mt-1 block tabular-nums">
            {isDiscounted && originalPrice ? formatRupiah(originalPrice) : formatRupiah(lowestObservedPrice)}
          </span>
        </div>

        <div className="p-3.5 border border-white/[0.06]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
            {isDiscounted ? 'Harga Terendah' : 'Harga Tertinggi'}
          </span>
          <span className="text-base font-mono font-bold text-editorial-title mt-1 block tabular-nums">
            {isDiscounted ? formatRupiah(lowestObservedPrice) : formatRupiah(highestObservedPrice)}
          </span>
        </div>

        <div className="p-3.5 border border-white/[0.06]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
            Perubahan Terakhir
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {priceChangeAmount > 0 ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-mono font-semibold text-red-400 tabular-nums">
                  +{formatRupiah(priceChangeAmount)} ({priceChangePercent}%)
                </span>
              </>
            ) : priceChangeAmount < 0 ? (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-mono font-semibold text-accent tabular-nums">
                  {formatRupiah(priceChangeAmount)} ({priceChangePercent}%)
                </span>
              </>
            ) : (
              <>
                <Minus className="w-3.5 h-3.5 text-editorial-faint" />
                <span className="text-xs font-mono text-editorial-muted">Stabil (0%)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="p-5 border border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between text-xs text-editorial-muted">
          <span className="font-mono text-[11px]">Riwayat Fluktuasi Harga</span>
          <span className="font-mono text-[10px] text-editorial-faint">
            {snapshots.length} pencatatan harga
          </span>
        </div>

        <div className="relative w-full h-32 pt-2">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
            {(() => {
              const prices = snapshots.map((s) => s.currentPrice ?? s.price);
              const minP = Math.min(...prices) * 0.95;
              const maxP = Math.max(...prices) * 1.05;
              const range = maxP - minP || 1;
              const points = snapshots.map((s, idx) => {
                const pVal = s.currentPrice ?? s.price;
                const x = (idx / (snapshots.length - 1)) * 400;
                const y = 120 - ((pVal - minP) / range) * 105;
                return { x, y, ...s };
              });

              const pathD = points.reduce(
                (acc, p, i) => (i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`),
                ''
              );
              const areaD = `${pathD} L 400,120 L 0,120 Z`;

              return (
                <>
                  <path d={areaD} fill="rgb(var(--accent-rgb))" fillOpacity="0.08" />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="rgb(var(--accent-rgb))"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r="3"
                      fill="rgb(var(--accent-rgb))"
                      stroke="#09090B"
                      strokeWidth="1.5"
                    />
                  ))}
                </>
              );
            })()}
          </svg>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-editorial-faint pt-2 border-t border-white/[0.06]">
          <span>Mulai: {formatDateWIB(snapshots[0]?.observedAt)}</span>
          <span>Terakhir: {formatDateWIB(snapshots[snapshots.length - 1]?.observedAt)}</span>
        </div>
      </div>
    </div>
  );
}
