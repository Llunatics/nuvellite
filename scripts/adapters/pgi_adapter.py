from .base_adapter import BaseAdapter
import time

class PGIAdapter(BaseAdapter):
    def __init__(self):
        super().__init__('pub_pgi', 'Phoenix Gramedia Indonesia', 'PGI')
        self.vendor_slug = 'phoenix-gramedia-indonesia'

    def fetch_vendor_products(self, max_pages=15):
        products = []
        page = 1
        while page <= max_pages:
            url = f'{self.base_api_url}/vendor/{self.vendor_slug}/products?page={page}'
            data = self.fetch_json(url)
            items = data.get('data', []) if data else []
            if not items:
                break
            for it in items:
                products.append(it)
            total_page = (data.get('meta') or {}).get('total_page') or max_pages
            if page >= total_page:
                break
            page += 1
            time.sleep(0.05)
        return products
