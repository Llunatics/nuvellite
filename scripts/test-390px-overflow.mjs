import { chromium } from 'playwright';

const routes = [
  { name: 'Katalog (/):', path: '/' },
  { name: 'Book Detail (/books/[slug]):', path: '/books/reliving-my-life-to-save-you-vol-1' },
  { name: 'Series Detail (/series/[slug]):', path: '/series/100-pacar-yang-sangat-sangat-sangat-sangat-sangat-mencintaimu' },
  { name: 'Publisher Detail (/publishers/[slug]):', path: '/publishers/elex' },
  { name: 'Search (/search):', path: '/search' },
  { name: 'Calendar (/calendar):', path: '/calendar' },
  { name: 'Library (/library):', path: '/library' },
  { name: 'Bind-Up (/bind-up):', path: '/bind-up' },
  { name: 'Radar (/radar):', path: '/radar' },
];

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });

  console.log('Testing 390px Viewport Horizontal Overflow on All 9 Routes...\n');
  let allClean = true;

    for (const route of routes) {
      const url = `http://localhost:3001${route.path}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(500);

      const overflowResult = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const innerWidth = window.innerWidth;

        // Check if page itself scrolls horizontally
        const hasPageOverflow = scrollWidth > docWidth || bodyScrollWidth > docWidth;

        // Find elements that visually stick out beyond viewport width
        const overflowingElements = [];
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          // Elements with rect.right > docWidth + 1px that are visible
          if (rect.right > docWidth + 1 && rect.width > 0 && rect.height > 0) {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
              // Check if parent clips it
              let parent = el.parentElement;
              let isClipped = false;
              while (parent && parent !== document.documentElement) {
                const parentStyle = window.getComputedStyle(parent);
                if (['hidden', 'clip', 'scroll', 'auto'].includes(parentStyle.overflowX)) {
                  isClipped = true;
                  break;
                }
                parent = parent.parentElement;
              }
              if (!isClipped) {
                overflowingElements.push({
                  tag: el.tagName,
                  className: (el.className || '').toString().slice(0, 50),
                  right: rect.right,
                  width: rect.width,
                });
              }
            }
          }
        }

        return {
          docWidth,
          scrollWidth,
          bodyScrollWidth,
          innerWidth,
          hasPageOverflow,
          overflowingCount: overflowingElements.length,
          overflowingElements: overflowingElements.slice(0, 3),
        };
      });

      const isClean = !overflowResult.hasPageOverflow && overflowResult.overflowingCount === 0;
      if (!isClean) {
        allClean = false;
        console.log(`❌ ${route.name} OVERFLOW DETECTED:`, overflowResult);
      } else {
        console.log(`✅ ${route.name} Clean (scrollWidth: ${overflowResult.scrollWidth}px, docWidth: ${overflowResult.docWidth}px, 0 overflowing elements)`);
      }
    } catch (err) {
      allClean = false;
      console.log(`❌ ${route.name} Error:`, err.message);
    }
  }

  await browser.close();

  if (!allClean) {
    console.error('\nOverflow check FAILED on one or more routes.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL 9 ROUTES VERIFIED CLEAN AT 390px VIEWPORT!');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
