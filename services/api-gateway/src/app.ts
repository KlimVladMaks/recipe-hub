import express, { type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import yaml from 'yaml';

const AUTH = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const RECIPE = process.env.RECIPE_SERVICE_URL || 'http://recipe-service:3002';
const DIRECTORY = process.env.DIRECTORY_SERVICE_URL || 'http://directory-service:3003';
const SOCIAL = process.env.SOCIAL_SERVICE_URL || 'http://social-service:3004';

async function proxyRequest(req: Request, res: Response, targetBase: string) {
  const targetUrl = `${targetBase}/api${req.url}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }

    const options: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl, options);
    const contentType = response.headers.get('content-type') || '';

    if (response.status === 204) {
      res.status(204).send();
      return;
    }

    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error: any) {
    console.error(`Proxy error: ${targetUrl}`, error.message);
    res.status(502).json({ message: `Service unavailable: ${error.message}` });
  }
}

export const createApp = () => {
  const app = express();
  app.use(express.json());

  // Swagger
  try {
    const yamlFile = fs.readFileSync('openapi.yaml', 'utf8');
    const swaggerSpec = yaml.parse(yamlFile);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true, customSiteTitle: 'API Docs' }));
  } catch {
    console.log('Swagger файл не найден, пропускаем');
  }

  // Health
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime() });
  });

  // ===== Auth Service routes =====
  app.post('/api/auth/register', (req, res) => proxyRequest(req, res, AUTH));
  app.post('/api/auth/login', (req, res) => proxyRequest(req, res, AUTH));
  app.patch('/api/users/me/password', (req, res) => proxyRequest(req, res, AUTH));
  app.get('/api/users', (req, res) => proxyRequest(req, res, AUTH));
  app.get('/api/users/me', (req, res) => proxyRequest(req, res, AUTH));
  app.patch('/api/users/me', (req, res) => proxyRequest(req, res, AUTH));
  app.delete('/api/users/me', (req, res) => proxyRequest(req, res, AUTH));
  app.get('/api/users/:userId', (req, res) => proxyRequest(req, res, AUTH));
  app.delete('/api/users/:userId', (req, res) => proxyRequest(req, res, AUTH));
  app.patch('/api/users/:userId/role', (req, res) => proxyRequest(req, res, AUTH));

  // ===== Recipe Service routes =====
  app.get('/api/users/me/recipes', (req, res) => proxyRequest(req, res, RECIPE));
  app.get('/api/users/me/saved-recipes', (req, res) => proxyRequest(req, res, RECIPE));
  app.get('/api/users/:userId/recipes', (req, res) => proxyRequest(req, res, RECIPE));
  app.get('/api/users/:userId/saved-recipes', (req, res) => proxyRequest(req, res, RECIPE));
  app.get('/api/recipes', (req, res) => proxyRequest(req, res, RECIPE));
  app.post('/api/recipes', (req, res) => proxyRequest(req, res, RECIPE));
  app.get('/api/recipes/:recipeId', (req, res) => proxyRequest(req, res, RECIPE));
  app.patch('/api/recipes/:recipeId', (req, res) => proxyRequest(req, res, RECIPE));
  app.delete('/api/recipes/:recipeId', (req, res) => proxyRequest(req, res, RECIPE));
  app.get('/api/recipes/:recipeId/rating', (req, res) => proxyRequest(req, res, RECIPE));
  app.put('/api/recipes/:recipeId/rating', (req, res) => proxyRequest(req, res, RECIPE));
  app.delete('/api/recipes/:recipeId/rating', (req, res) => proxyRequest(req, res, RECIPE));
  app.get('/api/recipes/:recipeId/save', (req, res) => proxyRequest(req, res, RECIPE));
  app.post('/api/recipes/:recipeId/save', (req, res) => proxyRequest(req, res, RECIPE));
  app.delete('/api/recipes/:recipeId/save', (req, res) => proxyRequest(req, res, RECIPE));
  app.get('/api/recipes/:recipeId/steps', (req, res) => proxyRequest(req, res, RECIPE));
  app.post('/api/recipes/:recipeId/steps', (req, res) => proxyRequest(req, res, RECIPE));
  app.get('/api/recipes/:recipeId/steps/:stepId', (req, res) => proxyRequest(req, res, RECIPE));
  app.patch('/api/recipes/:recipeId/steps/:stepId', (req, res) => proxyRequest(req, res, RECIPE));
  app.delete('/api/recipes/:recipeId/steps/:stepId', (req, res) => proxyRequest(req, res, RECIPE));

  // ===== Directory Service routes =====
  app.get('/api/dish-types', (req, res) => proxyRequest(req, res, DIRECTORY));
  app.post('/api/dish-types', (req, res) => proxyRequest(req, res, DIRECTORY));
  app.get('/api/dish-types/:dishTypeId', (req, res) => proxyRequest(req, res, DIRECTORY));
  app.patch('/api/dish-types/:dishTypeId', (req, res) => proxyRequest(req, res, DIRECTORY));
  app.delete('/api/dish-types/:dishTypeId', (req, res) => proxyRequest(req, res, DIRECTORY));
  app.get('/api/ingredients', (req, res) => proxyRequest(req, res, DIRECTORY));
  app.post('/api/ingredients', (req, res) => proxyRequest(req, res, DIRECTORY));
  app.get('/api/ingredients/:ingredientId', (req, res) => proxyRequest(req, res, DIRECTORY));
  app.patch('/api/ingredients/:ingredientId', (req, res) => proxyRequest(req, res, DIRECTORY));
  app.delete('/api/ingredients/:ingredientId', (req, res) => proxyRequest(req, res, DIRECTORY));

  // ===== Social Service routes =====
  app.get('/api/recipes/:recipeId/comments', (req, res) => proxyRequest(req, res, SOCIAL));
  app.post('/api/recipes/:recipeId/comments', (req, res) => proxyRequest(req, res, SOCIAL));
  app.get('/api/recipes/:recipeId/comments/:commentId', (req, res) => proxyRequest(req, res, SOCIAL));
  app.patch('/api/recipes/:recipeId/comments/:commentId', (req, res) => proxyRequest(req, res, SOCIAL));
  app.delete('/api/recipes/:recipeId/comments/:commentId', (req, res) => proxyRequest(req, res, SOCIAL));
  app.get('/api/recipes/:recipeId/comments/:commentId/like', (req, res) => proxyRequest(req, res, SOCIAL));
  app.post('/api/recipes/:recipeId/comments/:commentId/like', (req, res) => proxyRequest(req, res, SOCIAL));
  app.delete('/api/recipes/:recipeId/comments/:commentId/like', (req, res) => proxyRequest(req, res, SOCIAL));
  app.get('/api/users/me/subscriptions', (req, res) => proxyRequest(req, res, SOCIAL));
  app.get('/api/users/me/subscribers', (req, res) => proxyRequest(req, res, SOCIAL));
  app.get('/api/users/me/feed', (req, res) => proxyRequest(req, res, SOCIAL));
  app.get('/api/users/:userId/subscribe', (req, res) => proxyRequest(req, res, SOCIAL));
  app.post('/api/users/:userId/subscribe', (req, res) => proxyRequest(req, res, SOCIAL));
  app.delete('/api/users/:userId/subscribe', (req, res) => proxyRequest(req, res, SOCIAL));
  app.get('/api/users/:userId/subscriptions', (req, res) => proxyRequest(req, res, SOCIAL));
  app.get('/api/users/:userId/subscribers', (req, res) => proxyRequest(req, res, SOCIAL));

  return app;
};