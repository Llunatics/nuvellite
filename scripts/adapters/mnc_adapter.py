from .base_adapter import BaseAdapter
import time

class MCAdapter(BaseAdapter):
    def __init__(self):
        super().__init__('pub_mnc', 'm&c! Publishing', 'm&c!')
        self.vendor_slug = 'mc'

    def fetch_vendor_products(self, max_pages=20):
        products = []
        seen_slugs = set()
        page = 1
        while page <= max_pages:
            url = f'{self.base_api_url}/vendor/{self.vendor_slug}/products?page={page}'
            data = self.fetch_json(url)
            items = data.get('data', []) if data else []
            if not items:
                break
            for it in items:
                slug = it.get('slug')
                if slug and slug not in seen_slugs:
                    seen_slugs.add(slug)
                    products.append(it)
            total_page = (data.get('meta') or {}).get('total_page') or max_pages
            if page >= total_page:
                break
            page += 1
            time.sleep(0.05)

        # Also discover Clover imprint light novel products
        try:
            clover_items = self.search_products('clover', is_available_only=False, max_pages=5)
            for it in clover_items:
                slug = it.get('slug')
                if slug and slug not in seen_slugs:
                    seen_slugs.add(slug)
                    products.append(it)
        except Exception:
            pass

        return products
