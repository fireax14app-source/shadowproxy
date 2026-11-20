# ShadowProxy

ShadowProxy opens public pages through a Vercel Function. Each request gets a randomized, encrypted `/r/…` address. The server fetches the page; the browser does not call public CORS relays. Supported images and stylesheets are routed through the same server. Scripts and forms in fetched pages are disabled, so sign-ins and complex apps will not work. Direct mode and cloaked windows bypass server routing.

## Run

Use the deployed Vercel app at `/RUNTHIS!.html`. Opening the downloaded HTML from `file://` shows the interface but **server routing requires the deployment**. Do not enter passwords or other private information.

## Deploy to Vercel

Connect this GitHub repository to a Vercel project. Set `ROUTE_SECRET` to a unique random value of at least 32 characters in Production and Preview. Deploy. The Vercel server needs outbound network access to public HTTP(S) sites. The static GitHub Pages guide is not a routing server.

## Checks

Run `node --test tests/*.test.js`, `node --check shadowproxy-app.js`, and `node --check api/route.js`.

## License

MIT for the original project code. Destination sites keep their own terms.
