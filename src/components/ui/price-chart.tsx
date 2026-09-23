'use client';

import React from 'react';
import { PriceSummary } from '@/lib/data/price-service';
import { formatRupiah, formatDateWIB } from '@/lib/formatters';
import { TrendingDown, TrendingUp, Minus, Info, ArrowDownRight } from 'lucide-react';

interface PriceChartProps {
  summary: PriceSummary;
}

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

  return (
    <div className="space-y-4">
      {/* 1. Price Distinction Banner */}
      {isDiscounted && originalPrice && originalPrice > currentPrice ? (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-mono text-editorial-faint line-through">
                  {formatRupiah(originalPrice)}
                </span>
                <span className="text-xs font-mono text-editorial-faint">→</span>
                <span className="text-base sm:text-lg font-mono font-bold text-editorial-title">
                  {formatRupiah(currentPrice)}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-accent/20 text-accent border border-accent/30">
                  Diskon {Math.round(((originalPrice - currentPrice) / originalPrice) * 100)}%
                </span>
              </div>
              <span className="text-[11px] text-editorial-muted">
                Harga diskon promo aktif. Harga dasar (SRP) tetap {formatRupiah(originalPrice)}.
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Stat Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
            Harga Terkini
          </span>
          <span className="text-base font-mono font-bold text-editorial-title mt-1 block">
            {formatRupiah(currentPrice)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
            {isDiscounted && originalPrice ? 'Harga Normal' : 'Harga Terendah'}
          </span>
          <span className="text-base font-mono font-bold text-editorial-muted mt-1 block">
            {isDiscounted && originalPrice ? formatRupiah(originalPrice) : formatRupiah(lowestObservedPrice)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
            {isDiscounted ? 'Harga Terendah' : 'Harga Tertinggi'}
          </span>
          <span className="text-base font-mono font-bold text-emerald-400 mt-1 block">
            {isDiscounted ? formatRupiah(lowestObservedPrice) : formatRupiah(highestObservedPrice)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-editorial-faint block">
            Perubahan Terakhir
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            {priceChangeAmount > 0 ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-xs font-mono font-semibold text-rose-400">
                  +{formatRupiah(priceChangeAmount)} ({priceChangePercent}%)
                </span>
              </>
            ) : priceChangeAmount < 0 ? (
              <>
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-mono font-semibold text-emerald-400">
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

      {/* 3. Editorial Line Chart or Calm Notice */}
      {hasHistoricalFluctuation && snapshots.length >= 2 ? (
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-3">
          <div className="flex items-center justify-between text-xs text-editorial-muted">
            <span className="font-mono text-[11px]">Riwayat Fluktuasi Harga</span>
            <span className="font-mono text-[10px] text-editorial-faint">
              {snapshots.length} pencatatan harga
            </span>
          </div>

          {/* SVG Line Chart */}
          <div className="relative w-full h-32 pt-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="priceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.0" />
                </linearGradient>
              </defs>

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
                    <path d={areaD} fill="url(#priceGrad)" />
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
                        stroke="#090A0E"
                        strokeWidth="1.5"
                      />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-editorial-faint pt-2 border-t border-white/[0.04]">
            <span>Mulai: {formatDateWIB(snapshots[0]?.observedAt)}</span>
            <span>Terakhir: {formatDateWIB(snapshots[snapshots.length - 1]?.observedAt)}</span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center gap-3 text-editorial-muted text-xs">
          <Info className="w-4 h-4 text-editorial-faint shrink-0" />
          <span>
            Harga saat ini ({formatRupiah(currentPrice)}) adalah harga yang tercatat. Belum terjadi perubahan harga pada data historis buku ini.
          </span>
        </div>
      )}
    </div>
  );
}
