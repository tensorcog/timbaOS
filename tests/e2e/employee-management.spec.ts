import { test, expect, APIRequestContext } from '@playwright/test';

test.describe('Employee Management API', () => {
    const adminEmail = 'admin@billssupplies.com';
    const adminPassword = 'password';
    const testUser = {
        name: 'Test Employee',
        email: `test.employee.${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'SALES',
        locationIds: [],
    };

    let apiContext: APIRequestContext;

    test.beforeAll(async ({ playwright }) => {
        apiContext = await playwright.request.newContext({
            baseURL: 'http://localhost:3000',
        });

        // 1. Login to get cookies
        const loginRes = await apiContext.post('/api/auth/callback/credentials', {
            form: {
                csrfToken: await (await apiContext.get('/api/auth/csrf')).json().then(r => r.csrfToken),
                email: adminEmail,
                password: adminPassword,
                json: 'true',
            },
        });
        expect(loginRes.ok()).toBeTruthy();

        // Cleanup: Ensure test user doesn't exist from a previous failed run
        // With dynamic email, this is less critical, but good practice if we were using static email.
        // For now, we'll rely on the dynamic email to ensure a clean state.
    });

    test.afterAll(async () => {
        await apiContext.dispose();
    });

    test('should create, update, and verify a user', async () => {
        // 2. Create User
        const createRes = await apiContext.post('/api/users', {
            data: testUser,
        });
        if (!createRes.ok()) {
            console.log('Create User Failed:', createRes.status(), await createRes.text());
        }
        expect(createRes.ok()).toBeTruthy();
        const createdUser = await createRes.json();
        expect(createdUser.email).toBe(testUser.email);
        expect(createdUser.name).toBe(testUser.name);
        expect(createdUser.role).toBe(testUser.role);

        const userId = createdUser.id;

        // 3. Update User
        const updateRes = await apiContext.patch(`/api/users/${userId}`, {
            data: {
                name: 'Updated Name',
                role: 'MANAGER',
            },
        });
        expect(updateRes.ok()).toBeTruthy();

        // 4. Verify Update
        const verifyRes = await apiContext.get('/api/users');
        expect(verifyRes.ok()).toBeTruthy();
        const users = await verifyRes.json();
        const updatedUser = users.find((u: any) => u.id === userId);

        expect(updatedUser).toBeDefined();
        expect(updatedUser.name).toBe('Updated Name');
        expect(updatedUser.role).toBe('MANAGER');

        // Cleanup this specific user at the end of the test
        await apiContext.delete(`/api/users/${userId}`);
    });

    test('should block unauthorized access', async ({ request, playwright }) => {
        // 5. Test Unauthorized Access
        // Create a fresh context without admin cookies
        const salesContext = await playwright.request.newContext();

        // Try to access users API without logging in (or we could log in as sales user if we had one)
        // The original script logged in as sales1@billssupplies.com. Let's try that if we want to be exact,
        // but for now, let's just verify that unauthenticated access is blocked or a non-admin is blocked.

        // Let's try to login as a sales user to match the original script's intent
        const salesLoginRes = await salesContext.post('/api/auth/callback/credentials', {
            form: {
                csrfToken: await (await salesContext.get('/api/auth/csrf')).json().then(r => r.csrfToken),
                email: 'sales1@billssupplies.com',
                password: 'password',
                json: 'true',
            },
        });
        expect(salesLoginRes.ok()).toBeTruthy();

        const failRes = await salesContext.get('/api/users');
        // Expect 401 or 403
        expect([401, 403]).toContain(failRes.status());
    });
});
