// src/app/docs.ts
import type { Express, Request, Response } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type DocsOpts = {
  yamlPath?: string;
  routeJson?: string; // default: /openapi.json
  routeUi?: string;   // default: /docs
  title?: string;     // default: GrowGram API
};

export function attachDocs(app: Express, opts: DocsOpts = {}): void {
  const yamlPath = opts.yamlPath ?? path.join(__dirname, '..', 'docs', 'openapi.yaml');
  const routeJson = opts.routeJson ?? '/openapi.json';
  const routeUi   = opts.routeUi   ?? '/docs';
  const title     = opts.title     ?? 'GrowGram API';

  let cachedJson = '';
  let cachedEtag = '';

  async function loadSpec() {
    const raw = await readFile(yamlPath, 'utf8');
    const json = JSON.stringify(YAML.parse(raw));
    cachedJson = json;
    cachedEtag = createHash('sha1').update(json).digest('hex');
  }

  app.get(routeJson, async (req: Request, res: Response) => {
    try {
      await loadSpec();
      if (req.headers['if-none-match'] === cachedEtag) return res.status(304).end();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('ETag', cachedEtag);
      res.setHeader('Cache-Control', 'no-cache');
      res.status(200).send(cachedJson);
    } catch (e: any) {
      res.status(500).json({ error: 'spec_load_failed', message: e?.message || 'Failed to load spec' });
    }
  });

  app.get(routeUi, (_req: Request, res: Response) => {
    const html = `<!doctype html><html><head>
      <meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>${title}</title>
      <style>body{margin:0}.top{position:fixed;inset:0 0 auto 0;height:56px;background:#0b1f14;color:#A8FFB0;display:flex;align-items:center;padding:0 16px;font-family:system-ui,-apple-system,Segoe UI,Roboto} .wrap{margin-top:56px}</style>
    </head><body>
      <div class="top"><strong>${title}</strong>&nbsp;&nbsp;<a href="${routeJson}" target="_blank" rel="noopener" style="color:#A8FFB0">openapi.json</a></div>
      <div class="wrap"><redoc spec-url="${routeJson}" hide-loading></redoc></div>
      <script src="https://cdn.jsdelivr.net/npm/redoc/bundles/redoc.standalone.min.js" defer></script>
    </body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.status(200).send(html);
  });
}

export default attachDocs;