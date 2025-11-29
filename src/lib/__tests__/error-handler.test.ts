import { Prisma } from '@prisma/client';
import { ZodError, z } from 'zod';
import { classifyError, logError } from '../error-handler';

describe('Error Handler', () => {
    describe('classifyError', () => {
        describe('ZodError classification', () => {
            it('should classify Zod validation errors as 400', () => {
                const schema = z.object({
                    email: z.string().email(),
                    age: z.number().min(18),
                });

                try {
                    schema.parse({ email: 'invalid', age: 10 });
                } catch (error) {
                    const result = classifyError(error);
                    expect(result.status).toBe(400);
                    expect(result.error).toBe('Validation failed');
                    expect(result.details).toBeDefined();
                }
            });

            it('should include formatted Zod error details', () => {
                const schema = z.object({ email: z.string().email() });

                try {
                    schema.parse({ email: 'not-an-email' });
                } catch (error) {
                    const result = classifyError(error);
                    expect(result.details).toHaveProperty('_errors');
                }
            });
        });

        describe('Prisma error classification', () => {
            it('should classify P2002 (unique constraint) as 409 Conflict', () => {
                const error = new Prisma.PrismaClientKnownRequestError(
                    'Unique constraint failed',
                    {
                        code: 'P2002',
                        clientVersion: '5.0.0',
                        meta: { target: ['email'] },
                    }
                );

                const result = classifyError(error);
                expect(result.status).toBe(409);
                expect(result.error).toBe('Conflict - Record already exists');
                expect(result.details).toContain('email');
            });

            it('should classify P2003 (foreign key) as 400 Bad Request', () => {
                const error = new Prisma.PrismaClientKnownRequestError(
                    'Foreign key constraint failed',
                    {
                        code: 'P2003',
                        clientVersion: '5.0.0',
                    }
                );

                const result = classifyError(error);
                expect(result.status).toBe(400);
                expect(result.error).toBe('Invalid reference');
                expect(result.details).toBe('Referenced record does not exist');
            });

            it('should classify P2025 (not found) as 404 Not Found', () => {
                const error = new Prisma.PrismaClientKnownRequestError(
                    'Record not found',
                    {
                        code: 'P2025',
                        clientVersion: '5.0.0',
                        meta: { cause: 'User with ID xyz not found' },
                    }
                );

                const result = classifyError(error);
                expect(result.status).toBe(404);
                expect(result.error).toBe('Record not found');
                expect(result.details).toBe('User with ID xyz not found');
            });

            it('should use default message for P2025 without cause', () => {
                const error = new Prisma.PrismaClientKnownRequestError(
                    'Record not found',
                    {
                        code: 'P2025',
                        clientVersion: '5.0.0',
                    }
                );

                const result = classifyError(error);
                expect(result.details).toBe('The requested resource was not found');
            });

            it('should classify P2014 (required relation) as 400 Bad Request', () => {
                const error = new Prisma.PrismaClientKnownRequestError(
                    'Required relation missing',
                    {
                        code: 'P2014',
                        clientVersion: '5.0.0',
                    }
                );

                const result = classifyError(error);
                expect(result.status).toBe(400);
                expect(result.error).toBe('Invalid data');
                expect(result.details).toBe('Required relation missing');
            });

            it('should classify unknown Prisma error codes as 500', () => {
                const error = new Prisma.PrismaClientKnownRequestError(
                    'Unknown error',
                    {
                        code: 'P9999',
                        clientVersion: '5.0.0',
                    }
                );

                const result = classifyError(error);
                expect(result.status).toBe(500);
                expect(result.error).toBe('Database error');
            });

            it('should hide error details in production for unknown Prisma errors', () => {
                const originalEnv = process.env.NODE_ENV;
                Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });

                const error = new Prisma.PrismaClientKnownRequestError(
                    'Secret database error',
                    {
                        code: 'P9999',
                        clientVersion: '5.0.0',
                    }
                );

                const result = classifyError(error);
                expect(result.details).toBeUndefined();

                Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
            });

            it('should expose error details in development for unknown Prisma errors', () => {
                const originalEnv = process.env.NODE_ENV;
                Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });

                const error = new Prisma.PrismaClientKnownRequestError(
                    'Database connection failed',
                    {
                        code: 'P9999',
                        clientVersion: '5.0.0',
                    }
                );

                const result = classifyError(error);
                expect(result.details).toBe('Database connection failed');

                Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
            });
        });

        describe('PrismaClientValidationError classification', () => {
            it('should classify validation errors as 400', () => {
                const error = new Prisma.PrismaClientValidationError(
                    'Invalid field type',
                    { clientVersion: '5.0.0' }
                );

                const result = classifyError(error);
                expect(result.status).toBe(400);
                expect(result.error).toBe('Invalid data format');
            });

            it('should hide validation details in production', () => {
                const originalEnv = process.env.NODE_ENV;
                Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });

                const error = new Prisma.PrismaClientValidationError(
                    'Invalid field type: expected number, got string',
                    { clientVersion: '5.0.0' }
                );

                const result = classifyError(error);
                expect(result.details).toBeUndefined();

                Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
            });
        });

        describe('Custom Error classification', () => {
            it('should classify "not found" errors as 404', () => {
                const error = new Error('User not found');
                const result = classifyError(error);

                expect(result.status).toBe(404);
                expect(result.error).toBe('Not found');
                expect(result.details).toBe('User not found');
            });

            it('should classify "does not exist" errors as 404', () => {
                const error = new Error('Resource does not exist');
                const result = classifyError(error);

                expect(result.status).toBe(404);
                expect(result.details).toBe('Resource does not exist');
            });

            it('should classify "unauthorized" errors as 403', () => {
                const error = new Error('unauthorized access');
                const result = classifyError(error);

                expect(result.status).toBe(403);
                expect(result.error).toBe('Forbidden');
                expect(result.details).toBe('unauthorized access');
            });

            it('should classify "permission" errors as 403', () => {
                const error = new Error('permission denied');
                const result = classifyError(error);

                expect(result.status).toBe(403);
                expect(result.details).toBe('permission denied');
            });

            it('should classify "invalid" errors as 400', () => {
                const error = new Error('invalid input provided');
                const result = classifyError(error);

                expect(result.status).toBe(400);
                expect(result.error).toBe('Bad request');
                expect(result.details).toBe('invalid input provided');
            });

            it('should classify "required" errors as 400', () => {
                const error = new Error('field is required');
                const result = classifyError(error);

                expect(result.status).toBe(400);
                expect(result.details).toBe('field is required');
            });

            it('should classify generic errors as 500', () => {
                const error = new Error('Something went wrong');
                const result = classifyError(error);

                expect(result.status).toBe(500);
                expect(result.error).toBe('Internal server error');
            });

            it('should hide generic error details in production', () => {
                const originalEnv = process.env.NODE_ENV;
                Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });

                const error = new Error('Internal database connection failed');
                const result = classifyError(error);

                expect(result.details).toBeUndefined();

                Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
            });

            it('should expose generic error details in development', () => {
                const originalEnv = process.env.NODE_ENV;
                Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });

                const error = new Error('Stack trace details here');
                const result = classifyError(error);

                expect(result.details).toBe('Stack trace details here');

                Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
            });
        });

        describe('Unknown error types', () => {
            it('should classify string errors as 500', () => {
                const error = 'Something broke';
                const result = classifyError(error);

                expect(result.status).toBe(500);
                expect(result.error).toBe('Internal server error');
            });

            it('should classify number errors as 500', () => {
                const error = 42;
                const result = classifyError(error);

                expect(result.status).toBe(500);
            });

            it('should classify object errors as 500', () => {
                const error = { code: 'CUSTOM_ERROR', message: 'Custom error' };
                const result = classifyError(error);

                expect(result.status).toBe(500);
            });

            it('should classify null as 500', () => {
                const error = null;
                const result = classifyError(error);

                expect(result.status).toBe(500);
            });

            it('should classify undefined as 500', () => {
                const error = undefined;
                const result = classifyError(error);

                expect(result.status).toBe(500);
            });

            it('should hide unknown error details in production', () => {
                const originalEnv = process.env.NODE_ENV;
                Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });

                const error = { sensitive: 'data' };
                const result = classifyError(error);

                expect(result.details).toBeUndefined();

                Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
            });

            it('should stringify unknown errors in development', () => {
                const originalEnv = process.env.NODE_ENV;
                Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', configurable: true });

                const error = { code: 'ERR', data: 'info' };
                const result = classifyError(error);

                expect(result.details).toBe('[object Object]');

                Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, configurable: true });
            });
        });

        describe('Error message matching', () => {
            it('should match lowercase "not found"', () => {
                const error = new Error('user not found');
                expect(classifyError(error).status).toBe(404);
            });

            it('should match "does not exist"', () => {
                const error = new Error('Resource does not exist');
                expect(classifyError(error).status).toBe(404);
            });

            it('should match lowercase "invalid"', () => {
                const error = new Error('invalid input');
                expect(classifyError(error).status).toBe(400);
            });

            it('should match lowercase "unauthorized"', () => {
                const error = new Error('unauthorized');
                expect(classifyError(error).status).toBe(403);
            });

            it('should be case-sensitive (uppercase NOT FOUND should be 500)', () => {
                const error = new Error('NOT FOUND');
                expect(classifyError(error).status).toBe(500);
            });
        });
    });

    describe('logError', () => {
        let consoleErrorSpy: jest.SpyInstance;

        beforeEach(() => {
            consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            consoleErrorSpy.mockRestore();
        });

        it('should log error with context', () => {
            const error = new Error('Test error');
            const context = 'User API';

            logError(error, context);

            expect(consoleErrorSpy).toHaveBeenCalledWith('[User API]', error);
        });

        it('should log Prisma errors', () => {
            const error = new Prisma.PrismaClientKnownRequestError('DB error', {
                code: 'P2002',
                clientVersion: '5.0.0',
            });
            const context = 'Database';

            logError(error, context);

            expect(consoleErrorSpy).toHaveBeenCalledWith('[Database]', error);
        });

        it('should log string errors', () => {
            const error = 'String error';
            const context = 'Test';

            logError(error, context);

            expect(consoleErrorSpy).toHaveBeenCalledWith('[Test]', error);
        });

        it('should log unknown error types', () => {
            const error = { custom: 'error' };
            const context = 'Custom';

            logError(error, context);

            expect(consoleErrorSpy).toHaveBeenCalledWith('[Custom]', error);
        });
    });
});
