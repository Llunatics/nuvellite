import { getAllBooks, getPublishers } from '@/lib/catalog-service';
import { CalendarView } from '@/components/calendar/calendar-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kalender Rilis Manga & Light Novel — nuvellite',
  description: 'Jadwal terbit komik dan light novel resmi Indonesia. Pantau jadwal terbit rutin hari Rabu untuk Elex Media dan m&c!.',
};

export default function CalendarPage() {
  const books = getAllBooks();
  const publishers = getPublishers();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <CalendarView books={books} publishers={publishers} />
    </div>
  );
}
