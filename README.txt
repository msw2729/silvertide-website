SILVERTIDE — STATIC WEBSITE RELEASE

Serve this folder as the root of any static web server. Open / for English or /es/ for Spanish.
The clean URLs use real folders with index.html; no single-page-app rewrite or build step is needed.
Do not open the files directly using file://: asset URLs are relative to the web server root.
For a local preview with Python installed: python -m http.server 8000 --directory .
Then open http://localhost:8000/ or http://localhost:8000/es/.

English: /, /what-we-do/, /about/, /careers/, /contact/
Spanish: /es/, /es/que-hacemos/, /es/quienes-somos/, /es/trabaja-con-nosotros/, /es/contacto/
Each EN/ES switch leads to the equivalent page. Existing section fragments are preserved.
Legacy .dc.html URLs redirect to these routes. Vercel also serves permanent redirects.
Vercel: use the static/Other preset, repository root as output, and no build command.

All required scripts, fonts, images and video are local. Assets carry content hashes for safe long-term caching.
Photographs have responsive WebP versions. Only referenced assets are packaged; original media remains in the authoring workspace.
The 45-second hero film is silent H.264 with desktop/mobile variants and first-frame WebP posters.
Reduced-motion and data-saving preferences use the poster until visitors choose to play.
Images, people and film scenes are illustrative industry content, not documented company-owned assets or employees.

Confirmed company: Silver Tide Global Inc; Unit 2, 2900 John Street, Markham, Ontario L3R 5G3, Canada.
Email: info@silvertideglobal.com. Phone: +1-416-764-5706.
The English and Spanish contact forms submit directly through Formspree; direct email links remain available. Endpoint acceptance does not verify inbox delivery.
Careers accepts general interest enquiries and does not advertise confirmed vacancies.
See Silvertide-Content-Next-Steps.txt and SPANISH-TRANSLATION-NOTES.txt for content and terminology notes.
route-manifest.json records the release's routes, asset identities and source mappings.
