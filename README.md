# silvertide-website

Static bilingual site using the bundled DCLogic/React runtime. Serve this directory with a static web server; no build or external form SDK is required.

Analytics preparation is disabled pending the confirmed GA4 ID, consent choices and privacy notices. See [ANALYTICS-SETUP.txt](ANALYTICS-SETUP.txt) for the release gates and event contract. Run `node tests/analytics.cjs` for isolated tests with all Google and Formspree requests mocked.

## Contact forms

`/contact/` and `/es/contacto/` POST all seven existing fields to `https://formspree.io/f/xppqljkw`. The DCLogic submit handler uses native `fetch`, `FormData`, and `Accept: application/json`. Localized status text is announced in a live region and focused after completion. Required name, email and message fields retain native browser validation.

Submission is locked while pending and after success. Errors and the 30-second timeout retain inputs and allow a manual retry; there are no automatic retries. A timed-out request may have reached Formspree, so the error says confirmation was unavailable. After success, “Send another enquiry” clears the form deliberately. HTTP success confirms endpoint acceptance, not inbox delivery.

The endpoint's target inbox, verification, domain restrictions and spam/CAPTCHA settings are managed in the Formspree dashboard. No recipient override or private inbox address is embedded in the site. Michael confirmed receipt of the authorized live test on October 11, 2026; the dashboard settings were not separately inspected. All existing direct email links, including About and Careers, remain unchanged.

The form keeps standard HTML `action` and `method` attributes, but this exported site's DCLogic runtime is required to render the interactive site. Do not describe the whole site as a JavaScript-free fallback.

Official references: [HTML forms](https://help.formspree.io/articles/building-your-form/building-an-html-form), [AJAX handling](https://help.formspree.io/articles/building-your-form/submit-forms-with-javascript-ajax/), [email subjects](https://help.formspree.io/articles/building-your-form/email-subject-line).

## Mocked browser checks

With Node.js, Playwright and Chromium available, run `node tests/formspree.cjs`. Set `CHROME_PATH` to an installed Chrome executable if needed. Playwright is test tooling only; it is not a site dependency. The test starts its own local server, blocks external resources and intercepts every Formspree request. It never sends real inquiries.

Checks cover both languages, required fields, email validity, all submitted fields, localized pending/success/422/500/network states, repeated submits, retry, deliberate reset, accessibility focus, existing menu re-renders, mobile overflow and preservation of every original direct email link.

## Routes and media delivery

The English home is / and the Spanish home is /es/. Section URLs use real folders with index.html. Legacy .dc.html addresses redirect to matching clean routes. See README.txt and route-manifest.json for the full route map.

The hero keeps its full 45-second film. A responsive first-frame WebP appears before playback starts; phones receive a smaller H.264 video. Responsive photos and content-hashed assets reduce transfers and allow safe long-lived asset caching. Reduced-motion and data-saving preferences start with the still image and allow manual playback.
