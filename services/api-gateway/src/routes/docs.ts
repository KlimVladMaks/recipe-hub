import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { parse as parseYaml } from 'yaml';

const candidates = [
    process.env.OPENAPI_PATH,
    path.resolve(process.cwd(), 'openapi.yaml'),
    path.resolve(process.cwd(), '../../docs/openapi.yaml'),
    path.resolve(__dirname, '../../../../docs/openapi.yaml'),
].filter((candidate): candidate is string => Boolean(candidate));

function loadSpec(): object | null {
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return parseYaml(fs.readFileSync(candidate, 'utf8')) as object;
        }
    }
    return null;
}

export const docsRouter = Router();

const spec = loadSpec();

if (spec) {
    docsRouter.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
    docsRouter.get('/api-docs/openapi.json', (_req, res) => {
        res.status(200).json(spec);
    });
} else {
    console.warn('[api-gateway] OpenAPI-спецификация не найдена — Swagger UI недоступен');
    docsRouter.get('/api-docs', (_req, res) => {
        res.status(503).json({ error: 'OpenAPI-спецификация не найдена' });
    });
}
