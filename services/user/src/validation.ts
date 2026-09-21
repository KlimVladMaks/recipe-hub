import { setGlobalOptions, setGlobalErrorHandler } from 'express-zod-safe';

setGlobalOptions({
    missingSchemaBehavior: 'any',
});

setGlobalErrorHandler((errors, _req, res) => {
    const details = errors.flatMap((error) =>
        error.errors.issues.map((issue) => ({
            path: [error.type, ...issue.path.map(String)].join('.'),
            message: issue.message,
        }))
    );
    res.status(400).json({ error: 'Ошибка валидации', details });
});
