/**
 * Уникальные имена для тестовых данных.
 *
 * Нужны, чтобы прогоны не зависели от уже существующих записей в БД
 * и не конфликтовали между собой (файлы тестов выполняются параллельно).
 */
export function uniqueName(prefix: string): string {
    const stamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${stamp}_${random}`;
}

export function uniqueTitle(prefix = 'recipe'): string {
    return uniqueName(prefix);
}
