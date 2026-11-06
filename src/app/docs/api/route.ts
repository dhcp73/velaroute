export const dynamic = "force-static";

/** Interactive API reference (Scalar), rendered from our OpenAPI 3.1 spec. */
export function GET() {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API reference · Velaroute</title>
  <link rel="icon" href="/favicon.svg" />
  <style>body{margin:0} .vr-bar{display:flex;align-items:center;gap:12px;padding:10px 16px;font:500 14px system-ui,sans-serif;border-bottom:1px solid #e6e4f0;background:#fff} .vr-bar a{color:#5a44c9;text-decoration:none}</style>
</head>
<body>
  <div class="vr-bar"><a href="/docs">← Velaroute docs</a><span style="color:#888">·</span><span>Demo key: <code>vr_demo_7Kq2Lm9Xp4Rt8Wz3</code></span></div>
  <script id="api-reference" data-url="/api/v1/openapi.json"></script>
  <script>document.getElementById('api-reference').dataset.configuration = JSON.stringify({ theme: 'purple', hideDownloadButton: false, metaData: { title: 'Velaroute API' } });</script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
