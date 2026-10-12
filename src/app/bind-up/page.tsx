import { getBindUpSeries, getPublishers } from '@/lib/catalog-service';
import { BindUpDirectoryView } from '@/components/bindup/bind-up-directory-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edisi Bind-Up & Omnibus — nuvellite',
  description:
    'Direktori edisi bind-up dan omnibus komik Indonesia: beberapa volume original digabung dalam satu buku tebal. Terbitan Elex Media, m&c!, dan Phoenix Gramedia Indonesia. Terdeteksi otomatis setiap ada rilisan bind-up baru.',
};

export default function BindUpPage() {
  const groups = getBindUpSeries();
  const publishers = getPublishers();

  return (
    <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-6">
      <BindUpDirectoryView groups={groups} publishers={publishers} />
    </div>
  );
}
