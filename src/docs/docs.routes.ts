import { Router } from 'express';
import express from 'express';
import path from 'node:path';
import swaggerUiDist from 'swagger-ui-dist';
import { openApiDocument } from './openapi.js';

export const docsRoutes = Router();

const swaggerAssetsPath = swaggerUiDist.absolutePath();

docsRoutes.get('/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

docsRoutes.use('/assets', express.static(swaggerAssetsPath));

docsRoutes.get('/', (_req, res) => {
  const paths = Object.entries(openApiDocument.paths ?? {});
  const items = paths
    .map(([route, methods]) => {
      const methodEntries = Object.entries(methods as Record<string, unknown>);
      const badges = methodEntries
        .map(
          ([method]) =>
            `<span style="display:inline-block;margin-right:8px;padding:2px 6px;border-radius:4px;background:#2563eb;color:#fff;font-size:12px;text-transform:uppercase;">${method}</span>`,
        )
        .join('');
      return `<li style="margin-bottom:12px;"><strong>${route}</strong><br />${badges}</li>`;
    })
    .join('');

  res.type('html').send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>SIVA API — Documentação</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.5; color: #111827; }
      code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
      a { color: #2563eb; }
      ul { padding-left: 1.2rem; }
    </style>
  </head>
  <body>
    <h1>SIVA API — Documentação</h1>
    <p>Esta página mostra os endpoints disponíveis na API mockada.</p>
    <p>Health check: <code>/api/health</code></p>
    <p>OpenAPI JSON: <a href="/docs/openapi.json">/docs/openapi.json</a></p>
    <h2>Endpoints</h2>
    <ul>${items}</ul>
  </body>
</html>`);
});
