// Release gate: fill only with the confirmed GA4 stream ID and approved notice URLs.
// Keep disabled until consent wording and GA stream settings have been reviewed.
window.silverTideAnalyticsConfig = Object.freeze({
  enabled: false,
  measurementId: 'G-MP521GB8WR',
  // Only reviewed, public campaign labels belong here; never customer identifiers.
  campaignNames: [],
  privacyNoticeEn: '',
  privacyNoticeEs: ''
});
