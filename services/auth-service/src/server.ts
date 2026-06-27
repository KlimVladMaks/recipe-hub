import { createApp } from './app.js';

const app = createApp();
const PORT = parseInt(process.env.PORT || '3001');

app.listen(PORT, () => {
  console.log(`Auth Service запущен на порту ${PORT}`);
});