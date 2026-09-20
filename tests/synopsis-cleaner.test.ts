import { describe, it, expect } from 'vitest';
import { cleanStorySynopsis, getSynopsisPreview } from '../src/lib/data/synopsis-cleaner';

describe('Synopsis Cleaner & Narrative Extractor', () => {
  it('should remove "Keunggulan Buku" and keep narrative plot', () => {
    const raw = `“Maukah kamu jatuh cinta bersamaku... sekali lagi?”

Oriana, seorang murid akademi sihir berusia 17 tahun, tiba-tiba mati bersama kekasihnya, Vincent. Kemudian Oriana hidup kembali ke saat dirinya berusia 7 tahun bersama ingatan di kehidupan sebelumnya, kecuali ingatan terkait kematiannya. Bertahun-tahun ia membayangkan pertemuannya kembali dengan sang kekasih tercinta. Sayangnya, saat mereka bertemu Vincent sama sekali tidak memiliki ingatan tentang Oriana

Keunggulan Buku:

Berasal dari web novel populer yang diadaptasi jadi light novel dan manga.
Memadukan unsur time loop, romansa, fantasi, dan sekolah sihir
Seri ini telah mencapai 2 juta kopi secara kumulatif (cetak + digital) di Jepang`;

    const cleaned = cleanStorySynopsis(raw);
    expect(cleaned).toContain('Oriana, seorang murid akademi sihir');
    expect(cleaned).toContain('Sayangnya, saat mereka bertemu Vincent sama sekali tidak memiliki ingatan tentang Oriana');
    expect(cleaned).not.toContain('Keunggulan Buku:');
    expect(cleaned).not.toContain('Berasal dari web novel populer');
    expect(cleaned).not.toContain('2 juta kopi');
  });

  it('should remove "Selling Point" and Gramedia boilerplate paragraphs', () => {
    const raw = `Asa memilih akuarium sebagai tempat kencannya dengan Denji! Dia berencana memikat Denji, lalu mengubahnya jadi senjata. Di sisi lain, Denji hanya ingin melihat penguin. Namun, tiba-tiba muncul devil di hadapan pasangan tak serasi ini! Kencan mimpi buruk tanpa jalan keluar itu pun berakhir dengan cara tak terduga!

******

Anime Chainsaw Man yang tayang pada Oktober 2022 silam merupakan salah satu seri yang sudah ditunggu-tunggu oleh banyak orang.

Di antara jenis buku lainnya, komik memang disukai oleh semua kalangan mulai dari anak kecil hingga orang dewasa. Alasan komik lebih disukai oleh banyak orang karena disajikan dengan penuh dengan gambar dan cerita yang mengasyikan sehingga mampu menghilangkan rasa bosan di kala waktu senggang.`;

    const cleaned = cleanStorySynopsis(raw);
    expect(cleaned).toBe(
      'Asa memilih akuarium sebagai tempat kencannya dengan Denji! Dia berencana memikat Denji, lalu mengubahnya jadi senjata. Di sisi lain, Denji hanya ingin melihat penguin. Namun, tiba-tiba muncul devil di hadapan pasangan tak serasi ini! Kencan mimpi buruk tanpa jalan keluar itu pun berakhir dengan cara tak terduga!'
    );
    expect(cleaned).not.toContain('******');
    expect(cleaned).not.toContain('Anime Chainsaw Man');
    expect(cleaned).not.toContain('Di antara jenis buku lainnya');
  });

  it('should remove physical specifications and "Pilihan Edisi & Set Resmi"', () => {
    const raw = `SINOPSIS

Kosei Arima (9 tahun), anak ajaib! Di usia muda, ia sudah menjuarai berbagai kompetisi piano. Namun, saat usianya 11 tahun, ibunya yang juga pelatih pianonya, meninggal. Sejak saat itu, ia menjadi tak lagi mampu mendengar suara piano.

Judul m&c : Your Lie in April Vol. 1
Ukuran 11,2 cm x 17,6 cm
Japanese binding
Jumlah halaman: 224 halaman

Pilihan Edisi & Set Resmi: Regular, Special Set`;

    const cleaned = cleanStorySynopsis(raw);
    expect(cleaned).toContain('Kosei Arima (9 tahun), anak ajaib!');
    expect(cleaned).not.toContain('Judul m&c :');
    expect(cleaned).not.toContain('Japanese binding');
    expect(cleaned).not.toContain('Jumlah halaman: 224 halaman');
    expect(cleaned).not.toContain('Pilihan Edisi & Set Resmi:');
  });

  it('should handle "Pernahkah Anda terpikir" boilerplate', () => {
    const raw = `Kyoichiro minggat dari rumah dengan meninggalkan pesan! Karena merasa ini hanya kabur dari rumah seperti biasa, para adik-adiknya memanfaatkan saat ini untuk beristirahat. Namun begitu mengetahui bahwa Kyoichiro mengejar ayah mereka, para saudaranya pun segera menyusul. Yang mereka temukan di sana sangat mengejutkan.

***

Pernahkah Anda terpikir betapa menariknya dunia yang terbuka lebar melalui lembaran buku? Membaca bukan sekadar kegiatan rutin, melainkan sebuah petualangan tanpa batas ke dalam imajinasi dan pengetahuan.`;

    const cleaned = cleanStorySynopsis(raw);
    expect(cleaned).toBe(
      'Kyoichiro minggat dari rumah dengan meninggalkan pesan! Karena merasa ini hanya kabur dari rumah seperti biasa, para adik-adiknya memanfaatkan saat ini untuk beristirahat. Namun begitu mengetahui bahwa Kyoichiro mengejar ayah mereka, para saudaranya pun segera menyusul. Yang mereka temukan di sana sangat mengejutkan.'
    );
    expect(cleaned).not.toContain('Pernahkah Anda terpikir');
  });

  it('should extract preview properly and detect if text is long', () => {
    const shortText = 'Ini adalah sinopsis pendek komik aksi.';
    const shortRes = getSynopsisPreview(shortText, 100);
    expect(shortRes.preview).toBe(shortText);
    expect(shortRes.isLong).toBe(false);

    const longText =
      'Oriana, seorang murid akademi sihir berusia 17 tahun, tiba-tiba mati bersama kekasihnya, Vincent. Kemudian Oriana hidup kembali ke saat dirinya berusia 7 tahun bersama ingatan di kehidupan sebelumnya, kecuali ingatan terkait kematiannya. Bertahun-tahun ia membayangkan pertemuannya kembali dengan sang kekasih tercinta. Sayangnya, saat mereka bertemu Vincent sama sekali tidak memiliki ingatan tentang Oriana.';
    const longRes = getSynopsisPreview(longText, 150);
    expect(longRes.isLong).toBe(true);
    expect(longRes.preview.length).toBeLessThanOrEqual(155);
    expect(longRes.preview).toContain('Oriana');
  });
});
