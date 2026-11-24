# nmatix-web

Frontend web application for the nMATIX platform, built with Next.js 16 and React 19.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Scripts

| Script                 | Description                   |
| ---------------------- | ----------------------------- |
| `npm run dev`          | Start development server      |
| `npm run build`        | Build static export to `out/` |
| `npm run start`        | Start production server       |
| `npm run lint`         | Run ESLint                    |
| `npm run lint:fix`     | Run ESLint with auto-fix      |
| `npm run format`       | Format code with Prettier     |
| `npm run format:check` | Check Prettier formatting     |
| `npm run test`         | Run tests with Vitest         |
| `npm run test:watch`   | Run tests in watch mode       |
| `npm run deploy:dev`   | Deploy to dev environment     |
| `npm run deploy:prod`  | Deploy to production          |

## Project Structure

```
nmatix-web/
├── app/                  # Next.js App Router pages and layouts
│   ├── layout.js         # Root layout
│   ├── page.js           # Home page
│   └── signup/           # Signup page and components
├── components/           # Reusable React components
├── public/               # Static assets
├── scripts/              # Build and deploy scripts
├── .github/
│   ├── workflows/        # GitHub Actions CI/CD
│   └── ISSUE_TEMPLATE/   # Issue templates
└── out/                  # Static export output (generated)
```

## CI/CD Pipeline

### Pull Requests

When a PR is opened against `main`:

1. **Lint** - ESLint and Prettier checks
2. **Test** - Vitest unit tests
3. **Build** - Verify static export builds

### Deployments

| Trigger         | Environment | URL                                      |
| --------------- | ----------- | ---------------------------------------- |
| Push to `main`  | Dev         | `https://{cloudfront-id}.cloudfront.net` |
| Manual dispatch | Production  | `https://nmatix.com`                     |

Deployments use AWS OIDC authentication (no long-lived credentials).
The deployment also publishes nested route pages at their trailing-slash paths
so direct requests such as `/about/` work with the private S3 origin.

### Branch Protection

The `main` branch requires:

- Pull request before merging
- Status checks: `lint`, `test`, `build`

## Testing

Tests use [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

Test files should be named `*.test.jsx` and placed alongside the components they test.

## Code Style

- **ESLint** - Linting with `eslint-config-next`
- **Prettier** - Code formatting

```bash
# Check formatting
npm run format:check

# Auto-fix formatting
npm run format
```

## Environment Variables

Create `.env.local` for local development:

```bash
# Example (not committed to git)
NEXT_PUBLIC_API_URL=/api
```

## Deployment

### Manual Deployment

```bash
# Deploy to dev
npm run deploy:dev

# Deploy to production
npm run deploy:prod
```

### Infrastructure

The S3 bucket and CloudFront distribution are managed by the [nmatix-infra](https://github.com/nmatix/nmatix-infra) repository using AWS CDK.

## Related Repositories

- [nmatix-infra](https://github.com/nmatix/nmatix-infra) - Backend infrastructure (Lambda, API, CDK)
- [interior-quote-generator-proj](https://github.com/nmatix/interior-quote-generator-proj) - Project documentation and issue tracking

## Legal documents

The Terms of Service and Privacy Notice are published at `/terms` and `/privacy`. Before
publishing an initial version or an update, have the text approved by the business owner and
reviewed by a qualified legal adviser. In particular, verify data handling, retention, contact
details, and the document's consistency with applicable Indian data protection law. Do not deploy
these documents as approved until those reviews are complete.

When changing either document:

1. Edit the relevant page and update its version and effective date in `data/legal.js`.
2. Update the matching terms and privacy versions in `REGISTRATION_SETTINGS` in
   `nmatix-infra/cdk/config.py` in the same release. The website and registration backend must
   advertise the same versions; the backend rejects acceptance of an older version.
3. Review the final rendered pages and registration flow, then deploy the website and infrastructure
   changes together. Record the effective date and version in both repositories.

The current website constants are `TERMS_VERSION` and `PRIVACY_VERSION` in `data/legal.js`.
