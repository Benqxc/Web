# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | Yes       |

## Reporting a Vulnerability

If you discover a security issue, please report it privately:

1. Do **not** open a public GitHub issue for security bugs.
2. Contact the maintainer via GitHub: [@Benqxc](https://github.com/Benqxc).
3. Include steps to reproduce, impact, and suggested fix if possible.

## Security Model

- **Public endpoints:** `POST /api/track` — visitor analytics only.
- **Protected endpoints:** all admin APIs require `Authorization: Bearer <JWT>`.
- **Authentication:** JWT signed with `JWT_SECRET` (HS256, 24h TTL).
- **Passwords:** stored as bcrypt hashes; never logged or returned in API responses.

## Required Production Secrets

Set these environment variables before deploying:

| Variable | Purpose |
|----------|---------|
| `ADMIN_PASSWORD` | Initial admin password (required in production) |
| `JWT_SECRET` | Signs admin JWT tokens (required in production) |
| `DATABASE_URL` | PostgreSQL connection (Railway/self-hosted) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist |

## Deployment Checklist

- [ ] Set strong `ADMIN_PASSWORD` (12+ chars, not a dictionary word)
- [ ] Set random `JWT_SECRET` (32+ bytes)
- [ ] Restrict `ALLOWED_ORIGINS` to your domain
- [ ] Never commit `.env` files
- [ ] Rotate credentials if a token or password is exposed
- [ ] Enable HTTPS on your hosting provider

## Known Risks

- Visitor IPs and user agents are stored for analytics — treat exports as personal data (GDPR).
- Geo lookup uses `ip-api.com` — third-party service; review their privacy policy.
- `rejectUnauthorized: false` on PostgreSQL SSL is used for some cloud providers — prefer proper CA certs when possible.
