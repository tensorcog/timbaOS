import { APIRequestContext, expect } from '@playwright/test';
import prisma from '@/lib/prisma';

export class TestHelper {
    private apiContext: APIRequestContext;
    private cookies: any[] = [];

    constructor(apiContext: APIRequestContext) {
        this.apiContext = apiContext;
    }

    async login(email: string, password: string) {
        // Get CSRF token
        const csrfRes = await this.apiContext.get('/api/auth/csrf');
        const { csrfToken } = await csrfRes.json();

        // Login
        const loginRes = await this.apiContext.post('/api/auth/callback/credentials', {
            form: {
                email,
                password,
                csrfToken,
                json: 'true',
            },
        });

        expect(loginRes.ok()).toBeTruthy();

        // Store cookies for subsequent requests if needed, 
        // though Playwright's APIRequestContext handles this automatically within the same context.
    }

    async get(endpoint: string) {
        return this.apiContext.get(endpoint);
    }

    async post(endpoint: string, data: any) {
        return this.apiContext.post(endpoint, { data });
    }

    async patch(endpoint: string, data: any) {
        return this.apiContext.patch(endpoint, { data });
    }

    async delete(endpoint: string) {
        return this.apiContext.delete(endpoint);
    }

    // Database Helpers
    static async getFirstQuoteId() {
        const quote = await prisma.quote.findFirst();
        return quote?.id;
    }

    static async getFirstOrderId() {
        const order = await prisma.order.findFirst();
        return order?.id;
    }

    static async getFirstLocationId() {
        const location = await prisma.location.findFirst();
        return location?.id;
    }

    static async getRetailCustomer() {
        return prisma.customer.findFirst({ where: { customerType: 'RETAIL' } });
    }
}
