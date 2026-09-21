import 'dotenv/config';

import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
    console.log(`api-gateway запущен на порту ${config.port}`);
    console.log(`Swagger UI: http://localhost:${config.port}/api-docs`);
});
