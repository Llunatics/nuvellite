import urllib.request
import urllib.parse
import json
import time
import re
from datetime import datetime, timezone
from abc import ABC, abstractmethod

HEADERS = {
    'User-Agent': 'nuvellite-engine/2.0 (Official Manga & Light Novel Tracker; https://nuvelll.id)',
    'Accept': 'application/json'
}

MONTH_MAP = {
    'jan': '01', 'januari': '01', 'january': '01',
    'feb': '02', 'februari': '02', 'february': '02',
    'mar': '03', 'maret': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'mei': '05', 'may': '05',
    'jun': '06', 'juni': '06', 'june': '06',
    'jul': '07', 'juli': '07', 'july': '07',
    'agu': '08', 'ags': '08', 'agustus': '08', 'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'okt': '10', 'oktober': '10', 'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'des': '12', 'desember': '12', 'dec': '12', 'december': '12'
}

class BaseAdapter(ABC):
    def __init__(self, publisher_id, publisher_name, publisher_short):
        self.publisher_id = publisher_id
        self.publisher_name = publisher_name
        self.publisher_short = publisher_short
        self.base_api_url = 'https://api-service.gramedia.com/api/v2/public'

    def fetch_json(self, url, retries=3, timeout=8):
        req = urllib.request.Request(url, headers=HEADERS)
        for attempt in range(retries):
            try:
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    if resp.status == 200:
                        return json.loads(resp.read().decode('utf-8'))
            except Exception as e:
                backoff = 0.2 * (attempt + 1)
                time.sleep(backoff)
        return None

    def parse_indonesian_date(self, date_str):
        if not date_str or not isinstance(date_str, str):
            return None
        date_str = date_str.strip()
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return date_str
        m = re.match(r'^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$', date_str)
        if m:
            day = int(m.group(1))
            month_name = m.group(2).lower()
            year = int(m.group(3))
            month_num = MONTH_MAP.get(month_name[:3], '01')
            return f'{year:04d}-{month_num}-{day:02d}'
        m2 = re.match(r'^([A-Za-z]+)\s+(\d{4})$', date_str)
        if m2:
            month_name = m2.group(1).lower()
            year = int(m2.group(2))
            month_num = MONTH_MAP.get(month_name[:3], '01')
            return f'{year:04d}-{month_num}-15'
        return None

    def fetch_product_specs(self, slug):
        url = f'{self.base_api_url}/product-detail-variants/{slug}'
        data = self.fetch_json(url)
        if data and data.get('data') and len(data['data']) > 0:
            first = data['data'][0]
            specs = {s.get('label'): s.get('value') for s in first.get('specifications', [])}
            img = None
            if first.get('image') and len(first['image']) > 0:
                img = first['image'][0].get('image')
            isbn = specs.get('ISBN') or ''
            cleaned_isbn = re.sub(r'[^0-9Xx]', '', str(isbn))
            if not re.match(r'^(?:97[89]\d{10}|\d{9}[\dXx]|\d{10,13})$', cleaned_isbn):
                cleaned_isbn = ''

            final_p = first.get('final_price') or 0
            slice_p = first.get('slice_price') or 0
            curr_p = final_p if final_p > 0 else slice_p
            orig_p = slice_p if slice_p > curr_p else curr_p

            return {
                'publisher': specs.get('Penerbit'),
                'releaseDate': self.parse_indonesian_date(specs.get('Tanggal Terbit')),
                'isbn13': cleaned_isbn,
                'price': curr_p,
                'original_price': orig_p,
                'coverImage': img,
                'category_slugs': first.get('category_slugs', ''),
                'is_oos': first.get('is_oos', False)
            }
        return None

    def fetch_product_synopsis(self, slug):
        url = f'{self.base_api_url}/product-detail-meta/{slug}'
        data = self.fetch_json(url, retries=2, timeout=4)
        if data and data.get('data'):
            desc = data['data'].get('description', '')
            if desc:
                desc = re.sub(r'Disclaimer\s*[:\-]?\s*.*?(?:\n\s*\n|\Z)', '', desc, flags=re.DOTALL | re.IGNORECASE)
                desc = re.sub(r'\b(?:Detail (?:Buku|Informasi|Produk)|Informasi Tambahan)\s*[:\-]?\s*.*?(?:\n\s*\n|\Z)', '', desc, flags=re.DOTALL | re.IGNORECASE)
                desc = re.sub(r'(?:Ada komik|Yuk segera|Dapatkan segera|Selamat membaca|Jangan sampai kehabisan|Segera miliki|Beli sekarang|Tersedia di Gramedia).*$', '', desc, flags=re.DOTALL | re.IGNORECASE)
                paragraphs = [p.strip() for p in desc.split('\n') if p.strip()]
                return '\n\n'.join(paragraphs)
        return ''

    @abstractmethod
    def fetch_vendor_products(self, max_pages=15):
        """Fetch raw products from publisher's vendor endpoint."""
        pass
