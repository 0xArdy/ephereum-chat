# Deployment Guide

This guide covers deploying Ephereum Chat to Vercel.

## Prerequisites

- Node.js 20+
- pnpm 9.x
- Vercel account
- A Sepolia RPC endpoint

## Configuration

The repository includes `vercel.json` with:

- Build command: `pnpm run build`
- Output directory: `apps/web/dist`
- SPA fallback rewrite to `index.html`
- Proxy rewrite for `/blobscan-storage/*` to Google Cloud Storage
- Security headers and CSP

## Required Environment Variables

Set the following in Vercel project settings:

- `VITE_PUBLIC_RPC_URL` (required)

## Deploy Steps

1. Import the repository in Vercel.
2. Set `VITE_PUBLIC_RPC_URL`.
3. Trigger deployment.

Or deploy via CLI:

```bash
vercel
```

## Post-Deploy Verification

1. Open `/` and confirm landing page loads.
2. Navigate directly to `/chat` and `/settings` and verify SPA routing works.
3. Confirm message sync loads without runtime env errors.
4. Verify `/blobscan-storage/*` requests return upstream content.
5. Complete onboarding, unlock, and send flow smoke checks.
