'use client';

import React from 'react';
import { PriceSummary } from '@/lib/data/price-service';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { TrendingDown, TrendingUp, Minus, Info } from 'lucide-react';

interface PriceChartProps {
  summary: PriceSummary;
}

export function PriceChart({ summary }: PriceChartProps) {
  const {
    currentPrice,
    originalPrice,
    isDiscounted,
    previousPrice,
    lowestObservedPrice,
    highestObservedPrice,
    priceChangeAmount,
    priceChangePercent,
    hasHistoricalFluctuation,
    snapshots,
  } = summary;

  return (
    <div className="space-y-4">
      {/* Stat Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-surface-elevated/40 border border-white/5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
            Harga Saat Ini
          </span>
          <span className="text-sm sm:text-base font-mono font-bold text-editorial-title mt-0.5 block">
            {formatRupiah(currentPrice)}
          </span>
        </div>

        {isDiscounted && originalPrice && originalPrice > currentPrice ? (
          <>
            <div className="p-3 rounded-2xl bg-surface-elevated/40 border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                Harga Normal
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-editorial-muted mt-0.5 block">
                {formatRupiah(originalPrice)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-elevated/40 border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                Terendah Dicatat
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-400 mt-0.5 block">
                {formatRupiah(lowestObservedPrice)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-elevated/40 border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                Status Harga
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent/20 text-accent border border-accent/30">
                  Diskon {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}%
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-2xl bg-surface-elevated/40 border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                Terendah Dicatat
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-400 mt-0.5 block">
                {formatRupiah(lowestObservedPrice)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-elevated/40 border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                Tertinggi Dicatat
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-amber-400 mt-0.5 block">
                {formatRupiah(highestObservedPrice)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-elevated/40 border border-white/5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
                Perubahan Terakhir
              </span>
              <div className="flex items-center gap-1 mt-0.5">
                {priceChangeAmount > 0 ? (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-xs sm:text-sm font-mono font-bold text-rose-400">
                      +{formatRupiah(priceChangeAmount)} ({priceChangePercent}%)
                    </span>
                  </>
                ) : priceChangeAmount < 0 ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">
                      {formatRupiah(priceChangeAmount)} ({priceChangePercent}%)
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="w-3.5 h-3.5 text-editorial-faint" />
                    <span className="text-xs sm:text-sm font-mono text-editorial-muted">Stabil</span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Chart Canvas or Clean Real State */}
      {hasHistoricalFluctuation && snapshots.length >= 2 ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-elevated/30 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs text-editorial-muted">
            <span className="font-mono text-[11px]">Linimasa Fluktuasi Harga Resmi</span>
            <span className="font-mono text-[10px] text-editorial-faint">
              {snapshots.length} observasi tercatat
            </span>
          </div>

          {/* Render SVG Line Chart */}
          <div className="relative w-full h-36">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="priceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#E54D2E" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#E54D2E" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area & Line */}
              {(() => {
                const prices = snapshots.map((s) => s.currentPrice ?? s.price);
                const minP = Math.min(...prices) * 0.9;
                const maxP = Math.max(...prices) * 1.1;
                const range = maxP - minP || 1;
                const points = snapshots.map((s, idx) => {
                  const pVal = s.currentPrice ?? s.price;
                  const x = (idx / (snapshots.length - 1)) * 400;
                  const y = 120 - ((pVal - minP) / range) * 110;
                  return { x, y, ...s };
                });

                const pathD = points.reduce(
                  (acc, p, i) => (i === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`),
                  ''
                );
                const areaD = `${pathD} L 400,120 L 0,120 Z`;

                return (
                  <>
                    <path d={areaD} fill="url(#priceGrad)" />
                    <path d={pathD} fill="none" stroke="#E54D2E" strokeWidth="2.5" strokeLinecap="round" />
                    {points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill="#E54D2E"
                        stroke="#0A0D14"
                        strokeWidth="1.5"
                      />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-editorial-faint pt-2 border-t border-white/5">
            <span>{formatDateWIB(snapshots[0]?.observedAt)}</span>
            <span>{formatDateWIB(snapshots[snapshots.length - 1]?.observedAt)}</span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-surface-elevated/20 border border-white/5 flex items-center gap-3 text-editorial-muted text-xs">
          <Info className="w-4 h-4 text-editorial-faint shrink-0" />
          <span>
            Belum cukup data historis untuk menampilkan fluktuasi grafik. Harga saat ini ({formatRupiah(currentPrice)}) merupakan harga resmi yang tercatat.
          </span>
        </div>
      )}
    </div>
  );
}
