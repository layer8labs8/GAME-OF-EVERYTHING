# Security

## Keys

- API keys (NVIDIA, Kaggle, GitHub and others) never go in this repository.
- The NVIDIA key is read from the `NVIDIA_API_KEY` environment variable, or from the file named by `NVIDIA_KEY_FILE`, or from `nvidia.txt` in the folder that contains this repository (outside it).
- Enforcement: `npm run setup` installs a pre-commit hook that runs `tools/check_no_secrets.js --staged`, and CI runs `--all`. `.gitignore` also lists `nvidia.txt`, `.env*`, `kaggle.json` and key files.
- Do not paste keys into chat, issues, pull requests or commit messages.

## If a key leaks

1. Revoke or rotate the key at the provider first.
2. Removing it from a later commit is not enough; it stays in history. Rewrite history or recreate the repository after rotating.
3. Check the provider's usage page for use you do not recognise.

## Reporting

This is a private project. Tell the repository owner directly.
