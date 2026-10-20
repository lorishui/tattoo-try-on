# Tattoo Try-On

Independent React/TypeScript/Vite application. Do not import commercial template
code or the Stencil My Tattoo account, payment, or generation services.

- Run `pnpm install`, then `pnpm dev` on 127.0.0.1:4207.
- Before delivery: `pnpm test`, `pnpm format:check`, `pnpm build`, `git diff --check`.
- Check the real app in the user's existing Chrome session, including 390px width.
- Keep image uploads in browser memory; no analytics, image upload endpoint or
  third-party runtime requests. Maintain local model/WASM loading.
- Preserve third-party notices and the separate body-image license.
- Do not commit or push until the owner authorizes those steps.
