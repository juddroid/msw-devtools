# Publishing v0.1.0

This repo is ready to publish. The remaining steps require external access and must be done manually.

## Version note: expect v0.1.0, not v1.0.0

The changeset in `.changeset/initial.md` uses `minor` bumps for both packages. During local dry-run the changesets CLI produced `1.0.0` instead of `0.1.0`. This appears to be related to the `linked` constraint in `.changeset/config.json` and how changesets resolves the highest version across linked packages from `0.0.0`. If the release PR shows `1.0.0`, there are two options:

- **Accept 1.0.0** — this is a valid first public release version.
- **Force 0.1.0** — before merging the Version Packages PR, manually edit `packages/core/package.json` and `packages/react/package.json` to set `"version": "0.1.0"` and update the dependency reference in the react package's `package.json` `dependencies` field accordingly. Update the CHANGELOG entries too.

---

## 1. Create GitHub repository

```bash
gh repo create juddroid/msw-devtools --public --source . --remote origin --description "Visual devtools for toggling MSW handlers at runtime"
git push -u origin main
```

If you do not have `gh` CLI, create the repo at https://github.com/new (owner: `juddroid`, name: `msw-devtools`, public, no README/license/gitignore — we already have them), then:

```bash
git remote add origin git@github.com:juddroid/msw-devtools.git
git push -u origin main
```

## 2. Create the `@juddroid` npm scope

```bash
npm login   # 2FA required
```

The scope is auto-created on first publish.

## 3. Create an npm Granular Access Token

1. Go to https://www.npmjs.com/settings/<your-username>/tokens/granular-access-tokens/new
2. Token name: `msw-devtools-ci`
3. Expiration: 365 days
4. Allowed scopes: `@juddroid/*`
5. Allowed permissions: `Read and write`
6. Copy the token.

## 4. Add token to GitHub Actions secrets

```bash
gh secret set NPM_TOKEN -b "<paste token here>"
```

or via the GitHub UI: Settings → Secrets and variables → Actions → New repository secret, name `NPM_TOKEN`.

## 5. Enable provenance / 2FA bypass for automation

The release workflow uses `--provenance` and `id-token: write`. No action needed beyond NPM_TOKEN.

## 6. Trigger the release

After the first push to `main`, the release workflow opens a "Version Packages" PR automatically. Review the PR (CHANGELOG entries, version bumps). Merge it.

The workflow then publishes both packages to npm. Verify:

```bash
npm view @juddroid/msw-devtools-core
npm view @juddroid/msw-devtools-react
```

Both should show v0.1.0 (or v1.0.0 — see version note above).

## 7. (Optional) Add a real screenshot

Replace the broken `./docs/screenshot.png` reference in README.md with a real GIF/PNG of the devtool in action.

## 8. (Optional) Announce

- Tweet / Bluesky / dev.to
- Add to https://awesome-msw or similar lists
- Update bubbletap-admin to use the published package (see design spec §16)
