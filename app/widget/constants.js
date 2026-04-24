/**
 * Parent → iframe postMessage for partner HS256 JWT handoff.
 * Payload: `{ source: "kavisha-widget-auth", type: WIDGET_SSO_MESSAGE_TYPE, token: "<jwt>" }`
 * (`source` must match `WIDGET_AUTH_POSTMESSAGE_SOURCE` in `app/lib/widget-session.js`.)
 * Handled by `WidgetPostMessageAuth` (mounted from `app/widget/page.js` while the panel is open or closed).
 */
export const WIDGET_SSO_MESSAGE_TYPE = "kavisha-sso";
