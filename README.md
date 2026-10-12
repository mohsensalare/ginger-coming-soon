# Ginger — Coming Soon

لندینگ استاتیک با HTML، CSS و JavaScript؛ بدون npm، فریم‌ورک یا اطلاعات حساس کسب‌وکار. فایل‌های قابل انتشار فقط در `site/` قرار دارند.

ایندکس‌شدن فعلاً غیرفعال است: سایت پس از انتشار روی Pages هم `noindex` دارد. build این وضعیت را بررسی و اجباری می‌کند؛ push و اجرای خودکار Actions آن را فعال نمی‌کنند. فعال‌کردن ایندکس فقط با درخواست صریح شما در تغییر بعدی انجام می‌شود. canonical، Open Graph و JSON-LD همچنان آماده‌اند، اما sitemap فعلاً خالی است و در `robots.txt` معرفی نمی‌شود. خزیدن مسدود نیست تا موتور جست‌وجو بتواند دستور `noindex` را بخواند.

## پیش‌نمایش

در پوشه پروژه اجرا کنید و [پیش‌نمایش محلی](http://localhost:4173) را باز کنید:

```sh
python3 scripts/build.py --site-url https://example.github.io/ginger
python3 -m http.server 4173 --directory dist
```

آدرس بالا نمونه است. در انتشار واقعی، Actions آدرس Pages همین repository را جایگزین می‌کند. برای پیش‌نمایش هم فایل build‌شده را باز می‌کنیم تا متادیتا و سال footer کامل باشند.

## انتشار با GitHub Actions

1. `site/`، `scripts/` و پوشهٔ مخفی `.github/` را همراه این فایل‌ها در یک repository قرار دهید؛ شاخهٔ انتشار `main` یا `master` است. پوشه‌های `output/`، `.playwright-cli/` و `dist/` را آپلود نکنید.
2. در **Settings → Pages → Build and deployment → Source**، گزینهٔ **GitHub Actions** را انتخاب کنید.
3. فایل‌ها را روی `main` یا `master` push کنید یا در **Actions → Deploy Ginger to GitHub Pages → Run workflow** اجرای دستی را بزنید.
4. بعد از موفقیت job انتشار، لینک سایت در deployment نمایش داده می‌شود.

workflow به‌صورت پیش‌فرض آدرس واقعی Pages را می‌گیرد؛ آدرس‌های دارای نام repository، مانند `https://USERNAME.github.io/ginger/`، پشتیبانی می‌شوند. مسیر فایل‌ها نسبی است و URLهای canonical و Open Graph هنگام build تنظیم می‌شوند. وضعیت `noindex` در هر انتشار حفظ می‌شود.

برای دامنهٔ اختصاصی، ابتدا دامنه و DNS را در **Settings → Pages → Custom domain** تنظیم کنید. سپس در **Settings → Secrets and variables → Actions → Variables** متغیر repository به نام `SITE_URL` را با آدرس نهایی HTTPS، مثلاً `https://ginger.example`، بسازید. query، fragment و نام کاربری/رمز عبور مجاز نیست. این متغیر فقط URLهای سئو را تغییر می‌دهد؛ خودش دامنه را متصل نمی‌کند.

## بررسی build محلی

```sh
python3 scripts/build.py --site-url https://USERNAME.github.io/ginger
python3 -m http.server 4173 --directory dist
```

build وجود فایل‌ها، لینک‌های محلی، placeholderهای حل‌نشده، متادیتای پایهٔ سئو، `noindex` و JSON-LD را بررسی می‌کند و `dist/` را از نو می‌سازد. تصویر پیش‌فرض اشتراک‌گذاری `site/assets/og-image.jpg` است.

فایل‌های انتشار آماده هستند؛ تا زمان push و اجرای موفق Actions، این پروژه روی GitHub Pages منتشر نشده است.

مرجع workflow: [مستندات رسمی GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
