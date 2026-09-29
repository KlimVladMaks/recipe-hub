/**
 * Фабрика тестовых данных и гарантированная очистка.
 *
 * Тесты не должны оставлять мусор в БД, поэтому каждый набор тестов создаёт
 * TestContext, а в after() вызывает ctx.cleanup().
 *
 * Очистка выполняется в порядке:
 *   1) удаляются созданные рецепты (каскадно уходят шаги, комментарии,
 *      лайки, рейтинги и сохранения);
 *   2) удаляются созданные пользователи (каскадно уходят подписки),
 *      через DELETE /users/me — это ещё и проверяет механизм удаления.
 */
import { api, expectStatus } from './api.ts';
import { uniqueName } from './unique.ts';

export const DEFAULT_PASSWORD = 'password123';

/** Учётные данные bootstrap-админа (см. ADMIN_USERNAME/ADMIN_PASSWORD в user-service). */
export const ADMIN_USERNAME = process.env.TEST_ADMIN_USERNAME ?? 'admin';
export const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'admin123';

export interface TestUser {
    id: number;
    username: string;
    password: string;
    token: string;
}

export interface RegisterOverrides {
    username?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    about?: string;
}

/** Зарегистрировать пользователя и сразу получить для него JWT. */
export async function registerUser(overrides: RegisterOverrides = {}): Promise<TestUser> {
    const username = overrides.username ?? uniqueName('user');
    const password = overrides.password ?? DEFAULT_PASSWORD;

    const registration = await api('/auth/register', {
        method: 'POST',
        body: {
            username,
            password,
            firstName: overrides.firstName ?? 'Тест',
            lastName: overrides.lastName ?? 'Тестов',
            ...(overrides.about !== undefined ? { about: overrides.about } : {}),
        },
    });
    expectStatus(registration, 201);

    const login = await api<{ jwtToken: string; user: { id: number } }>('/auth/login', {
        method: 'POST',
        body: { username, password },
    });
    expectStatus(login, 200);

    return { id: registration.body.id, username, password, token: login.body.jwtToken };
}

/**
 * Войти под bootstrap-админом (создаётся user-service из ADMIN_USERNAME/ADMIN_PASSWORD).
 * Возвращает id и JWT настоящего администратора.
 */
export async function loginAsAdmin(): Promise<TestUser> {
    const login = await api<{ jwtToken: string; user: { id: number } }>('/auth/login', {
        method: 'POST',
        body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
    });
    expectStatus(login, 200);
    return {
        id: login.body.user.id,
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        token: login.body.jwtToken,
    };
}

/** Контекст на один набор тестов: создаёт сущности и подчищает их за собой. */
export class TestContext {
    readonly users: TestUser[] = [];
    private readonly recipes = new Map<number, string>();
    private readonly dishTypes: number[] = [];
    private readonly ingredients: number[] = [];

    async createUser(overrides: RegisterOverrides = {}): Promise<TestUser> {
        const user = await registerUser(overrides);
        this.users.push(user);
        return user;
    }

    /** Создать тип блюда (нужен admin-токен) и запомнить его для очистки. */
    async createDishType(admin: TestUser, title: string): Promise<any> {
        const response = await api('/dish-types', {
            method: 'POST',
            token: admin.token,
            body: { title },
        });
        expectStatus(response, 201);
        this.dishTypes.push(response.body.id);
        return response.body;
    }

    /** Создать ингредиент (нужен admin-токен) и запомнить его для очистки. */
    async createIngredient(admin: TestUser, title: string): Promise<any> {
        const response = await api('/ingredients', {
            method: 'POST',
            token: admin.token,
            body: { title },
        });
        expectStatus(response, 201);
        this.ingredients.push(response.body.id);
        return response.body;
    }

    /** Создать рецепт и запомнить его для последующей очистки. */
    async createRecipe(user: TestUser, data: Record<string, unknown>): Promise<any> {
        const response = await api('/recipes', { method: 'POST', token: user.token, body: data });
        expectStatus(response, 201);
        this.recipes.set(response.body.id, user.token);
        return response.body;
    }

    /** Запомнить рецепт, созданный вручную (чтобы он тоже был удалён). */
    trackRecipe(recipeId: number, token: string): void {
        this.recipes.set(recipeId, token);
    }

    /**
     * Удалить всё созданное. Best-effort: ошибки логируются, но не бросаются,
     * чтобы падение очистки не затирало результаты тестов.
     */
    async cleanup(): Promise<void> {
        for (const [recipeId, token] of this.recipes) {
            const response = await api(`/recipes/${recipeId}`, { method: 'DELETE', token });
            if (response.status === 204 || response.status === 404) continue;

            // Рецепт, удалённый в самом тесте, при повторном DELETE отдаёт 403
            // (не срабатывает проверка автора). Убеждаемся, что его правда нет.
            const check = await api(`/recipes/${recipeId}`, { method: 'GET', token });
            if (check.status !== 404) {
                console.warn(
                    `[cleanup] рецепт ${recipeId} не удалён (DELETE ${response.status}, GET ${check.status})`
                );
            }
        }
        this.recipes.clear();

        // Справочники удаляем admin-токеном (нужен для isAdmin), но логинимся
        // только если действительно есть что удалять — чтобы наборы без
        // справочников не зависели от наличия bootstrap-админа.
        if (this.dishTypes.length > 0 || this.ingredients.length > 0) {
            const adminToken = (await loginAsAdmin()).token;

            for (const id of this.dishTypes) {
                const response = await api(`/dish-types/${id}`, { method: 'DELETE', token: adminToken });
                if (response.status !== 204 && response.status !== 404) {
                    console.warn(`[cleanup] не удалось удалить тип блюда ${id}: ${response.status}`);
                }
            }
            this.dishTypes.length = 0;

            for (const id of this.ingredients) {
                const response = await api(`/ingredients/${id}`, { method: 'DELETE', token: adminToken });
                if (response.status !== 204 && response.status !== 404) {
                    console.warn(`[cleanup] не удалось удалить ингредиент ${id}: ${response.status}`);
                }
            }
            this.ingredients.length = 0;
        }

        for (const user of this.users) {
            const response = await api('/users/me', { method: 'DELETE', token: user.token });
            if (response.status !== 204 && response.status !== 404) {
                console.warn(`[cleanup] не удалось удалить пользователя ${user.id}: ${response.status}`);
            }
        }
        this.users.length = 0;
    }
}
