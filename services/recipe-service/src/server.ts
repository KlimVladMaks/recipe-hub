import { createApp } from './app.js';

const app = createApp();
const PORT = parseInt(process.env.PORT || '3002');

app.listen(PORT, () => {
  console.log(`Recipe Service запущен на порту ${PORT}`);
});