import express from 'express';
import morgan from 'morgan';

import routes from './routes';
import { docsRouter } from './routes/docs';
import { errorHandler } from './middleware/errorHandler';


export const createApp = () => {
    const app = express();

    app.use(morgan('dev'));
    app.use(docsRouter);
    app.use('/api', routes);
    app.use(errorHandler);
    return app;
}
