'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { AnnouncementCard, type AnnouncementView } from './announcement-card';

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

/**
 * /radar list: calm editorial feed layout.
 * Single right-aligned publisher filter button and popup.
 * Items rendered inside a seamless divide-y editorial container without heavy box cages.
 */
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

  const selectedPublisherLabel =
    PUBLISHER_OPTIONS.find((opt) => opt.value === selectedPublisher)?.label || 'Semua';

  const filterItems = (list: AnnouncementView[]) =>
    list.filter((v) => matchPublisher(v, selectedPublisher));

  const visible = filterItems(active);
  const visibleGraduated = filterItems(graduated);
  const visibleStale = filterItems(stale);

  return (
    <div className="flex flex-col gap-8">
      {/* Controls Bar: Item count on left, single publisher filter button + popup on right */}
      <div className="relative flex items-center justify-between gap-4 border-y border-white/[0.06] py-3.5 my-6">
        <p className="text-xs font-mono text-editorial-muted">
          Menampilkan <span className="text-editorial-title font-semibold">{visible.length}</span> pengumuman
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
                document.body
              )}
              <div
                role="listbox"
                data-testid="radar-publisher-popup"
                className="absolute right-0 top-full mt-2 z-50 w-56 rounded-2xl border border-white/[0.09] bg-surface/95 backdrop-blur-2xl p-1.5 shadow-2xl space-y-0.5"
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

      {/* Main Announcement Feed (Calm Editorial Feed Container) */}
      {visible.length > 0 ? (
        <div className="divide-y divide-white/[0.06] rounded-3xl border border-white/[0.06] bg-surface/50 backdrop-blur-xl px-5 sm:px-8">
          {visible.map((v) => (
            <AnnouncementCard key={v.announcement.id} view={v} />
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-white/[0.06] bg-surface/50 backdrop-blur-xl px-6 py-12 text-center text-sm text-editorial-muted">
          Belum ada pengumuman yang sesuai dengan filter saat ini.
        </p>
      )}

      {/* Graduated Section ("Sudah Terbit") */}
      {visibleGraduated.length > 0 && (
        <section className="flex flex-col gap-3 pt-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-editorial-muted">
            Sudah Terbit
          </h2>
          <div className="divide-y divide-white/[0.06] rounded-3xl border border-white/[0.06] bg-surface/50 backdrop-blur-xl px-5 sm:px-8">
            {visibleGraduated.map((v) => (
              <AnnouncementCard key={v.announcement.id} view={v} />
            ))}
          </div>
        </section>
      )}

      {/* Stale Section ("Arsip Pengumuman Lama") */}
      {stale.length > 0 && (
        <section className="rounded-3xl border border-white/[0.06] bg-surface/50 overflow-hidden">
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
            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06] px-5 sm:px-8">
              {visibleStale.map((v) => (
                <AnnouncementCard key={v.announcement.id} view={v} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
