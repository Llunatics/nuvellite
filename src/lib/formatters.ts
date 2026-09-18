export function formatRupiah(amount: number): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'Rp -';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, ' ');
}

export function formatDateWIB(dateString?: string | null): string {
  if (!dateString) return 'Tanggal belum diumumkan';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getDayNameWIB(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  } catch {
    return '';
  }
}
