# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

If you discover a security vulnerability in timbaOS, please send an email to:

**security@timbaos.com** (or your company security email)

Please include the following information:

- **Type of vulnerability** (e.g., XSS, SQL injection, authentication bypass)
- **Full paths of source files** related to the vulnerability
- **Location of the affected code** (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact assessment** - how an attacker could exploit this
- **Potential fixes** (if you have suggestions)

### What to Expect

1. **Acknowledgment**: We'll acknowledge receipt of your report within **48 hours**
2. **Assessment**: We'll investigate and assess the severity within **1 week**
3. **Updates**: We'll keep you informed of our progress
4. **Fix & Disclosure**: We'll work on a fix and coordinate disclosure
5. **Credit**: We'll credit you in the security advisory (unless you prefer to remain anonymous)

### Response Timeline

- **Critical vulnerabilities**: Fix within 48-72 hours
- **High severity**: Fix within 1 week
- **Medium severity**: Fix within 2 weeks
- **Low severity**: Fix in next minor release

## Security Measures

timbaOS implements comprehensive security measures:

### Authentication & Authorization

- **NextAuth.js** with JWT session strategy
- **Bcrypt** password hashing (10 rounds)
- **Role-Based Access Control (RBAC)** with 5 permission levels
- **Location-based access restrictions**
- Session timeout and secure cookie handling

### API Security

- **Rate Limiting**:
  - 5 requests/min for authentication endpoints
  - 100 requests/min for standard API
  - Configurable per-endpoint limits
- **Input Validation**: Zod schemas on all inputs
- **Type Safety**: Strict TypeScript throughout
- **Authentication Required**: All endpoints except auth require valid session

### Data Protection

- **SQL Injection Protection**: Prisma ORM with parameterized queries
- **XSS Protection**: React's built-in escaping
- **CSRF Protection**: NextAuth CSRF tokens
- **Soft Deletes**: Business records preserved for audit compliance
- **Audit Logging**: Complete trail of entity changes

### Database Security

- **Constraints**: CHECK, UNIQUE, FOREIGN KEY
- **Indexes**: Optimized for performance and security
- **Decimal Precision**: Financial calculations use Decimal.js
- **Environment Isolation**: Separate databases for dev/prod

### Secrets Management

- **No hardcoded secrets** in source code
- **.env files** in .gitignore
- **.env.example** provided as template
- **Strong secrets**: Generated via `openssl rand -base64 32`

### Production Hardening

- **Debug mode** disabled in production
- **Error details** hidden from users in production
- **Stack traces** not exposed
- **Sensitive data** not logged

## Security Best Practices

### For Developers

1. **Never commit `.env` files** or secrets
2. **Always use parameterized queries** (Prisma handles this)
3. **Validate all user input** with Zod schemas
4. **Use type-safe code** - avoid `any` types
5. **Test security features** - write tests for auth/authz
6. **Review dependencies** - run `npm audit` regularly
7. **Follow OWASP Top 10** guidelines
8. **Use rate limiting** on sensitive endpoints
9. **Implement proper logging** for security events
10. **Keep dependencies updated**

### For Deployers

1. **Use HTTPS/TLS** in production (mandatory)
2. **Set strong `NEXTAUTH_SECRET`** (32+ random bytes)
3. **Use strong database passwords**
4. **Restrict database access** to application only
5. **Enable database SSL/TLS**
6. **Configure CORS** appropriately
7. **Set secure HTTP headers**:
   - `Strict-Transport-Security`
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Content-Security-Policy`
8. **Run as non-root user**
9. **Use read-only file systems** where possible
10. **Monitor logs** for suspicious activity

### Security Headers Example (nginx)

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

## Known Security Considerations

### Rate Limiting Storage

The current implementation uses **in-memory** rate limiting storage. For production deployments with multiple servers:

- **Recommendation**: Migrate to Redis-based rate limiting
- **Impact**: Current implementation won't share rate limits across servers
- **Mitigation**: Use a load balancer with sticky sessions or implement Redis

### Password Reset Tokens

- Tokens expire after **1 hour**
- Tokens are **single-use only**
- Tokens are **cryptographically random** (32 bytes)
- Old tokens are **automatically cleaned up**

### Session Management

- Sessions use **JWT** strategy for stateless authentication
- Session data includes: user ID, role, location IDs
- Sessions are **server-side validated**
- No sensitive data stored in JWT

## Compliance

timbaOS is designed with compliance in mind:

- **SOC 2**: Audit logging, soft deletes, access controls
- **GDPR**: Data retention policies, audit trails
- **PCI DSS**: (if handling payments) Secure data handling
- **HIPAA**: (if healthcare) Access controls and audit logs

## Security Changelog

### Version 0.1.0 (2025-11-29)

**Added**:
- Rate limiting middleware with configurable presets
- Soft deletes for data retention compliance
- Comprehensive input validation (Zod)
- Type-safe session handling
- Inventory validation before transactions
- Database CHECK constraints
- Composite indexes for audit queries

**Fixed**:
- Removed plain-text password migration backdoor
- Added authentication to POS checkout endpoint
- Conditional debug mode (development only)
- Removed all `any` types from security code

**Security Improvements**:
- 180 unit tests including security-critical code
- Professional error classification (no info leakage)
- Proper rate limit headers (X-RateLimit-*)
- Environment-based detail exposure

## Bug Bounty Program

*We do not currently have a bug bounty program, but we deeply appreciate security researchers who responsibly disclose vulnerabilities.*

If you've responsibly disclosed a security issue:
- We'll credit you in our security advisories
- We'll send you timbaOS swag (when available)
- Your name will be added to our Hall of Fame

## Security Hall of Fame

*Thank you to the following security researchers who have helped make timbaOS more secure:*

- (No reports yet - be the first!)

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/security)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

For security-related questions that are not vulnerabilities:
- **GitHub Discussions**: https://github.com/tensorcog/timbaOS/discussions
- **Email**: security@timbaos.com

---

**Remember**: Security is everyone's responsibility. Thank you for helping keep timbaOS secure!
