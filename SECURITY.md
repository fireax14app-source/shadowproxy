# Security

ShadowProxy is a read-only viewer for public HTTP(S) documents. It is not an anonymity service and must not be used for passwords, private messages, payments, or other sensitive data.

## Enforced boundaries

- The browser requests an opaque, authenticated-encryption route from the same-origin Vercel API.
- Route tokens expire after 30 minutes.
- DNS is resolved before each outbound connection. The selected address is pinned to that connection, and any private, loopback, link-local, multicast, documentation, translation, or otherwise reserved answer rejects the request.
- Redirects are revalidated and limited to four hops.
- Only GET and HEAD retrievals are accepted. Credentials, cookies, request bodies, and destination response cookies are never forwarded.
- Responses are limited to 5 MB and ten seconds.
- Destination scripts, event handlers, forms, objects, embeds, and popups are disabled. The viewer iframe has an empty sandbox permission set.
- Route creation requires a same-origin JSON request. Per-instance request limits reduce casual abuse; the hosting firewall remains the correct place for distributed rate limits.
- The app and routed documents use restrictive CSP, permissions, referrer, MIME-sniffing, framing, and transport-security headers.

## Compatibility boundary

Arbitrary complex websites cannot be made both fully functional and safely executed under one shared proxy origin. Enabling their scripts, cookies, forms, WebSockets, and authentication would let untrusted destination code cross the viewer's trust boundary. Supporting those sites safely requires remote browser isolation with one ephemeral browser profile and network sandbox per session. Vercel Functions do not provide that persistent isolation model.

## Reporting

Do not include secrets or private URLs in a report. Open a private GitHub security advisory for a reproducible issue.
