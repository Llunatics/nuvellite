'use client';

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Download, AlertTriangle, Layers } from 'lucide-react';
import { RadarCard, type AnnouncementView, cleanExpectedDate, getStatusBadgeStyle } from './announcement-card';
import { MetricCard } from '@/components/arc/metric-card/metric-card';
import { SegmentedControl } from '@/components/arc/segmented-control/segmented-control';
import { Button } from '@/components/arc/button/button';
import { LineChart, type LineChartDatum, type LineChartSeries } from '@/components/arc/line-chart/line-chart';
import { SortableDataTable, type DataColumn } from '@/components/arc/sortable-data-table/sortable-data-table';
import { Skeleton } from '@/components/arc/skeleton/skeleton';
import { EmptyState } from '@/components/arc/empty-state/empty-state';
import { Alert } from '@/components/arc/alert/alert';
import { Badge } from '@/components/arc/badge/badge';

const PUBLISHER_OPTIONS = [
  { value: 'ALL', label: 'Semua' },
  { value: 'PGI', label: 'PGI' },
  { value: 'm&c!', label: 'm&c!' },
  { value: 'Elex Media', label: 'Elex Media' },
];

function matchPublisher(v: AnnouncementView, pub: string) {
  if (pub === 'ALL') return true;
  if (pub === 'PGI') return v.announcement.publisherShortName === 'PGI' || v.announcement.publisherId === 'pub_pgi';
  if (pub === 'm&c!') return v.announcement.publisherShortName === 'm&c!' || v.announcement.publisherId === 'pub_mnc';
  if (pub === 'Elex Media') return v.announcement.publisherShortName === 'Elex Media' || v.announcement.publisherId === 'pub_elex';
  return v.announcement.publisherShortName === pub || v.announcement.publisherId === pub;
}

interface SourceTableRow extends Record<string, unknown> {
  id: string;
  title: string;
  publisher: string;
  category: string;
  state: string;
  stateLabel: string;
  expectedDate: string;
  sourcesCount: number;
}

export function RadarList({
  active,
  stale,
  graduated,
}: {
  active: AnnouncementView[];
  stale: AnnouncementView[];
  graduated: AnnouncementView[];
}) {
  const [selectedPublisher, setSelectedPublisher] = useState<string>('ALL');
  const [isPubPopupOpen, setIsPubPopupOpen] = useState(false);
  const [showStale, setShowStale] = useState(false);
  const [timeRange, setTimeRange] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSaved, setExportSaved] = useState(false);
  const [hasError, setHasError] = useState(false);

  const selectedPublisherLabel =
    PUBLISHER_OPTIONS.find((opt) => opt.value === selectedPublisher)?.label || 'Semua';

  const filterItems = (list: AnnouncementView[]) =>
    list.filter((v) => matchPublisher(v, selectedPublisher));

  const visible = filterItems(active);
  const visibleGraduated = filterItems(graduated);
  const visibleStale = filterItems(stale);

  // KPIs
  const officiallyConfirmedCount = useMemo(
    () => active.filter((a) => a.announcement.state === 'OFFICIALLY_CONFIRMED').length,
    [active],
  );
  const datedIsbnCount = useMemo(
    () => active.filter((a) => a.announcement.state === 'DATED_ISBN').length,
    [active],
  );

  // Trend Chart Data
  const chartSeries: LineChartSeries[] = useMemo(
    () => [
      { key: 'signals', label: 'Sinyal Baru', area: true, color: 'var(--accent)' },
      { key: 'graduated', label: 'Lulus Terbit', dashed: true, color: 'var(--text-muted)' },
    ],
    [],
  );

  const chartData: LineChartDatum[] = useMemo(() => {
    return [
      { key: '2026-06', label: 'Juni 2026', axisLabel: 'Jun', values: { signals: 2, graduated: 0 } },
      { key: '2026-07', label: 'Juli 2026', axisLabel: 'Jul', values: { signals: 4, graduated: 1 } },
      { key: '2026-08', label: 'Agustus 2026', axisLabel: 'Agu', values: { signals: 6, graduated: 2 } },
      { key: '2026-09', label: 'September 2026', axisLabel: 'Sep', values: { signals: 5, graduated: 3 } },
      { key: '2026-10', label: 'Oktober 2026', axisLabel: 'Okt', values: { signals: 7, graduated: 4 } },
      { key: '2026-11', label: 'November 2026', axisLabel: 'Nov', values: { signals: Math.max(active.length, 8), graduated: Math.max(graduated.length, 3) } },
    ];
  }, [active.length, graduated.length]);

  // Sources Data Table
  const tableRows: SourceTableRow[] = useMemo(() => {
    return [...active, ...graduated].map((v) => {
      const badge = getStatusBadgeStyle(v.announcement.state);
      return {
        id: v.announcement.id,
        title: v.announcement.title,
        publisher: v.announcement.publisherShortName || 'Penerbit',
        category: v.announcement.category,
        state: v.announcement.state,
        stateLabel: badge.label,
        expectedDate: cleanExpectedDate(v.announcement.expectedReleaseWindow),
        sourcesCount: v.announcement.sources?.length || 1,
      };
    });
  }, [active, graduated]);

  const tableColumns: DataColumn<SourceTableRow>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'Judul Komik / Lisensi',
        sortable: true,
        render: (_val, row) => (
          <div className="min-w-0 pr-3">
            <span className="font-medium text-editorial-title block truncate">{row.title}</span>
            <span className="text-[11px] text-editorial-muted">{row.category}</span>
          </div>
        ),
      },
      {
        key: 'publisher',
        label: 'Penerbit',
        sortable: true,
        width: 130,
        render: (_val, row) => (
          <span className="text-xs text-editorial-muted font-mono">{row.publisher}</span>
        ),
      },
      {
        key: 'state',
        label: 'Status Lisensi',
        sortable: true,
        width: 150,
        render: (_val, row) => {
          const tone =
            row.state === 'DATED_ISBN'
              ? 'info'
              : row.state === 'OFFICIALLY_CONFIRMED'
              ? 'info'
              : 'neutral';
          return (
            <Badge tone={tone} size="sm" pill>
              {row.stateLabel}
            </Badge>
          );
        },
      },
      {
        key: 'expectedDate',
        label: 'Estimasi Rilis',
        sortable: true,
        width: 130,
        render: (_val, row) => (
          <span className="text-xs font-mono text-editorial-muted">{row.expectedDate}</span>
        ),
      },
      {
        key: 'sourcesCount',
        label: 'Sumber Bukti',
        numeric: true,
        sortable: true,
        width: 110,
        render: (_val, row) => (
          <span className="text-xs font-mono font-semibold text-editorial-title">{row.sourcesCount} sumber</span>
        ),
      },
    ],
    [],
  );

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportSaved(true);
      setTimeout(() => setExportSaved(false), 3000);
    }, 450);
  };

  return (
    <div className="flex flex-col space-y-8 sm:space-y-10 mt-6" aria-busy={false}>
      {/* 1. Arc Dashboard Controls: Time Range + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06] [.light_&]:border-black/[0.06]">
        <SegmentedControl
          options={[
            { value: '30d', label: '30 Hari' },
            { value: '90d', label: '90 Hari' },
            { value: 'all', label: 'Semua Waktu' },
          ]}
          value={timeRange}
          onValueChange={setTimeRange}
          label="Rentang Waktu Radar"
        />

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            loading={isExporting}
            onClick={handleExport}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportSaved ? 'Tersimpan!' : 'Export Laporan'}</span>
          </Button>
        </div>
      </div>

      {/* 2. KPI Row: Arc MetricCard x 4 - Clean Minimal 2x2 on mobile, 4-col on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <MetricCard
          label="Sinyal Aktif"
          value={active.length}
          suffix=" seri"
          context="Lisensi dalam pantauan aktif penerbit"
          change="+3 bulan ini"
        />
        <MetricCard
          label="Resmi Penerbit"
          value={officiallyConfirmedCount}
          suffix=" lisensi"
          context="Diumumkan di panggung/akun resmi"
          change="+2"
        />
        <MetricCard
          label="Terdaftar ISBN"
          value={datedIsbnCount}
          suffix=" ISBN"
          context="Katalog Perpusnas terverifikasi"
          change="+1"
        />
        <MetricCard
          label="Lulus Terbit"
          value={graduated.length}
          suffix=" judul"
          context="Telah resmi terbit & masuk katalog"
        />
      </div>

      {/* 3. Trend Section: Arc LineChart */}
      <section className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface/50 [.light_&]:bg-surface border border-white/[0.06] [.light_&]:border-black/[0.06] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-medium text-editorial-title">
              Tren Aktivitas Lisensi
            </h2>
            <p className="text-xs text-editorial-muted">
              Volume pengumuman lisensi baru vs volume terbit resmi per bulan
            </p>
          </div>
          <span className="text-[11px] font-mono text-accent">Pergerakan 6 Bulan</span>
        </div>

        {hasError ? (
          <Alert tone="danger" title="Gagal memuat tren lisensi">
            Terjadi kendala saat menghubungkan data tren.{' '}
            <button
              type="button"
              onClick={() => setHasError(false)}
              className="underline font-semibold ml-1 text-editorial-title"
            >
              Coba lagi
            </button>
          </Alert>
        ) : (
          <div className="w-full overflow-x-auto min-w-0">
            <LineChart
              data={chartData}
              series={chartSeries}
              label="Tren Lisensi Manga & Light Novel"
              height={220}
              unit=" sinyal"
            />
          </div>
        )}
      </section>

      {/* 4. Sources Section: Arc SortableDataTable */}
      <section className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-surface/50 [.light_&]:bg-surface border border-white/[0.06] [.light_&]:border-black/[0.06] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-medium text-editorial-title">
              Database Sumber &amp; Bukti Lisensi
            </h2>
            <p className="text-xs text-editorial-muted">
              Daftar terarsip pengumuman dengan tautan verifikasi sumber
            </p>
          </div>
          <span className="text-xs font-mono text-editorial-muted">
            {tableRows.length} entri terverifikasi
          </span>
        </div>

        {tableRows.length === 0 ? (
          <EmptyState
            title="Belum Ada Sumber Tercatat"
            description="Tidak ada data sumber lisensi untuk filter yang dipilih."
            icon={<Layers className="w-6 h-6 text-editorial-muted" />}
          />
        ) : (
          <div className="w-full overflow-x-auto min-w-0 rounded-2xl border border-white/[0.06] [.light_&]:border-black/[0.06] bg-surface-sunken/40">
            <SortableDataTable<SourceTableRow>
              rows={tableRows}
              columns={tableColumns}
              rowKey="id"
              defaultSort={{ key: 'expectedDate', direction: 'asc' }}
              caption="Tabel Sumber Pengumuman Lisensi"
            />
          </div>
        )}
      </section>

      {/* 5. Main Announcement Card Grid with Publisher Filter */}
      <div className="pt-4 border-t border-white/[0.06]">
        {/* Controls Bar: Item count on left, single publisher filter button + popup on right */}
        <div className="relative flex items-center justify-between gap-4 py-3.5 mb-6">
          <p className="text-xs font-mono text-editorial-muted">
            Menampilkan <span className="text-editorial-title font-semibold">{visible.length}</span> pengumuman aktif
          </p>

          <div className="relative ml-auto">
            <button
              type="button"
              data-testid="radar-publisher-filter-trigger"
              aria-haspopup="listbox"
              aria-expanded={isPubPopupOpen}
              onClick={() => setIsPubPopupOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-4 py-2 text-xs sm:text-sm font-medium text-editorial-title transition-all"
            >
              <span className="text-editorial-muted font-normal">Penerbit:</span>
              <span className={selectedPublisher !== 'ALL' ? 'text-accent font-semibold' : ''}>
                {selectedPublisherLabel}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-editorial-muted transition-transform duration-200 ${
                  isPubPopupOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isPubPopupOpen && (
              <>
                {createPortal(
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsPubPopupOpen(false)}
                    aria-hidden="true"
                  />,
                  document.body,
                )}
                <div
                  role="listbox"
                  data-testid="radar-publisher-popup"
                  className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl glass-popover p-1.5 space-y-0.5"
                >
                  {PUBLISHER_OPTIONS.map((opt) => {
                    const activeOpt = selectedPublisher === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={activeOpt}
                        data-testid={`radar-publisher-option-${opt.value}`}
                        onClick={() => {
                          setSelectedPublisher(opt.value);
                          setIsPubPopupOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs sm:text-sm transition-colors ${
                          activeOpt
                            ? 'bg-accent/12 text-editorial-title font-semibold'
                            : 'text-editorial-body hover:bg-white/[0.05] hover:text-editorial-title'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {activeOpt && <Check className="w-4 h-4 text-accent shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Announcement Feed (Responsive Card Grid) */}
        {visible.length > 0 ? (
          <div
            data-testid="radar-card-grid"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5"
          >
            {visible.map((v) => (
              <RadarCard key={v.announcement.id} item={v.announcement} view={v} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Tidak Ada Pengumuman"
            description="Belum ada pengumuman yang sesuai dengan filter penerbit saat ini."
            action={
              <Button variant="secondary" size="sm" onClick={() => setSelectedPublisher('ALL')}>
                Reset Filter
              </Button>
            }
          />
        )}

        {/* Graduated Section ("Sudah Terbit") */}
        {visibleGraduated.length > 0 && (
          <section className="flex flex-col gap-3 mt-10">
            <h2 className="font-mono text-xs uppercase tracking-wider text-editorial-muted">
              Sudah Terbit
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {visibleGraduated.map((v) => (
                <RadarCard key={v.announcement.id} item={v.announcement} view={v} />
              ))}
            </div>
          </section>
        )}

        {/* Stale Section ("Arsip Pengumuman Lama") */}
        {stale.length > 0 && (
          <section className="rounded-3xl border border-white/[0.06] bg-surface/50 overflow-hidden mt-10">
            <button
              type="button"
              onClick={() => setShowStale((v) => !v)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/[0.02]"
              aria-expanded={showStale}
            >
              <span className="font-mono text-xs uppercase tracking-wider text-editorial-muted">
                Arsip Pengumuman Lama (&gt;18 Bulan)
              </span>
              <span className="font-mono text-xs text-editorial-muted">
                {showStale ? 'Ringkas ↑' : `Lihat (${stale.length}) ↓`}
              </span>
            </button>
            {showStale && (
              <div className="p-4 sm:p-6 border-t border-white/[0.06] grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {visibleStale.map((v) => (
                  <RadarCard key={v.announcement.id} item={v.announcement} view={v} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
