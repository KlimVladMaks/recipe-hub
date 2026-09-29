/**
 * Тонкая обёртка над fetch для E2E-тестов RecipeHub.
 *
 * Все запросы идут в API-шлюз (по умолчанию http://localhost:3000/api).
 * Адрес можно переопределить переменной окружения TEST_BASE_URL.
 */
import assert from 'node:assert/strict';

export const BASE_URL = (
    process.env.TEST_BASE_URL ?? 'http://localhost:3000/api'
).replace(/\/+$/, '');

export interface ApiResponse<T = any> {
    status: number;
    body: T;
    headers: Headers;
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    token?: string;
    body?: unknown;
    headers?: Record<string, string>;
}

function safeJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

/** Выполнить запрос к API. Возвращает статус и разобранное тело. */
export async function api<T = any>(
    path: string,
    options: RequestOptions = {}
): Promise<ApiResponse<T>> {
    const { method = 'GET', token, body, headers = {} } = options;
    const init: RequestInit = { method, headers: { ...headers } };

    if (body !== undefined) {
        (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
    }
    if (token) {
        (init.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, init);
    const text = await response.text();
    return {
        status: response.status,
        body: (text ? safeJson(text) : undefined) as T,
        headers: response.headers,
    };
}

export const get = <T = any>(path: string, token?: string) =>
    api<T>(path, { method: 'GET', token });

export const post = <T = any>(path: string, body?: unknown, token?: string) =>
    api<T>(path, { method: 'POST', body, token });

export const put = <T = any>(path: string, body?: unknown, token?: string) =>
    api<T>(path, { method: 'PUT', body, token });

export const patch = <T = any>(path: string, body?: unknown, token?: string) =>
    api<T>(path, { method: 'PATCH', body, token });

export const del = <T = any>(path: string, token?: string) =>
    api<T>(path, { method: 'DELETE', token });

/**
 * Проверить статус ответа. При несовпадении в сообщение попадает тело ответа,
 * что заметно упрощает отладку упавших тестов.
 */
export function expectStatus(response: ApiResponse, expected: number): void {
    assert.equal(
        response.status,
        expected,
        `Ожидался статус ${expected}, получен ${response.status}. Тело: ${JSON.stringify(response.body)}`
    );
}

/** Дождаться готовности стека (polling health-эндпоинта шлюза). */
export async function waitForStack(
    timeoutMs = 90_000,
    intervalMs = 1_500
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown;

    while (Date.now() < deadline) {
        try {
            const response = await fetch(`${BASE_URL}/api-gateway-health`);
            if (response.ok) return;
            lastError = new Error(`health вернул ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
        `Стек не поднялся за ${timeoutMs} мс (${BASE_URL}). ` +
            `Последняя ошибка: ${String(lastError)}`
    );
}
