# Develop all three repositories in GitHub Codespaces

Create the codespace from **khalidrazaa/be-fastapi-dp**. Its dev container provides
Python 3.12, Node.js 24, Bun, uv, Git, and the GitHub CLI. The setup clones the UI
and packages repositories beside the backend under the persistent `/workspaces`
directory, matching the paths in `data-plateform.code-workspace`.

The current UI is a Vite/React application, despite the repository name. The
backend and packages repositories currently have no runtime project manifests.
Setup prepares their Python environments and will install their declared
dependencies when manifests are added. It does not start an API that has not yet
been implemented.

## First launch

1. Commit and push the changes in **be-fastapi-dp** to the branch you want to
   develop. Commit and push the server configuration in **ui-nextjs-dp** too.
   Setup clones the UI's default branch, `main`. Either merge the UI changes
   into `main` first, or create a Codespaces secret named `UI_REPO_REF` with value
   `wiring-firing-d1` (the current UI branch), granting it access to
   **be-fastapi-dp**, before creating the codespace. This ensures first setup
   checks out the branch containing the Codespaces configuration.
2. On GitHub, open **be-fastapi-dp**, select that branch, and use
   **Code → Codespaces → Create codespace**. If GitHub offers multiple
   configurations, select **Data platform — all repositories**.
3. Authorize the requested contents access to **packages-dp** and **ui-nextjs-dp**.
   This lets you clone, edit, and push to each repository from the same codespace.
4. Wait for the post-create setup to finish.
5. In VS Code, use **File → Open Workspace from File**, then select
   `/workspaces/be-fastapi-dp/data-plateform.code-workspace`.

All three repositories should now appear in Explorer and Source Control:

```text
/workspaces/
├── be-fastapi-dp/       ← Codespaces entry repository
│   └── data-plateform.code-workspace
├── packages-dp/
└── ui-nextjs-dp/
```

Cloning uses each sibling repository's default branch unless `UI_REPO_REF` or
`PACKAGES_REPO_REF` selects a branch/tag for its first clone. Define these through
GitHub **Settings → Codespaces → Secrets**, with access to **be-fastapi-dp**,
before creation. The current packages feature branch is `wirinf-firing-d1`.
Alternatively, switch branches in the relevant repository after setup, then
rerun `node .devcontainer/bootstrap.mjs` from the backend so dependencies match
the selected branches. Existing checkouts keep their branch, commits, and local
changes when setup is repeated.

GitHub's additional repository permissions apply when creating a new codespace.
Rebuilding an existing codespace does not grant new repository permissions. If
one was created before this configuration, create a new codespace after saving
and pushing your work, and authorize the sibling repositories.

## Start the UI

Use **Terminal → Run Task → UI: dev**, or run:

```bash
cd /workspaces/ui-nextjs-dp
bun run dev
```

Open port **3000** in the Ports panel. Vite binds to all interfaces, stays on port
3000, and allows the exact hostname of this codespace. The configuration keeps
the existing `DISABLE_HMR` behavior. Forwarded ports remain private by default.

The Vite development server forwards requests starting with `/api` to
`http://127.0.0.1:8000`, preserving the `/api` prefix. When the FastAPI application
is implemented, bind it to `0.0.0.0:8000` and define its routes under `/api` to use
this proxy. Browser code can then request `/api/...` through the UI's own origin.
Port **8000** is also forwarded for directly inspecting the API or its docs.

The current frontend has no live backend requests. An `/api` request will fail
until an API process is running; a forwarded port does not create that process.

## Python projects

The setup script handles both the backend and packages repositories:

- With `pyproject.toml`, it runs `uv sync`; an existing `uv.lock` requires
  `uv sync --locked`.
- With requirements files, it installs them into the repository's `.venv`.
- With no dependency manifest, it creates an empty Python 3.12 `.venv` and reports
  that the project is a scaffold.
- An installable shared package is linked into the backend environment in
  editable mode for development.

Select the corresponding `.venv/bin/python` with **Python: Select Interpreter**.
The dev container's interpreter default uses the `.venv` directory so VS Code can
resolve the correct platform-specific executable.

Once the backend application exists, run it from a backend terminal using its
documented entry point. For example, if you later create `app/main.py` containing
`app = FastAPI()`, its development command would be:

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Airflow, database servers, and BigQuery resources have separate runtime/deployment
requirements and are not provisioned by this editor environment.

## Credentials and changes

Use GitHub **Settings → Codespaces → Secrets** for credentials. Select the
appropriate repository access when defining each secret. Local `.env` files are
not uploaded automatically, and setup does not copy credentials between
repositories. Existing `.env` files are preserved.

Each repository retains its own Git history. Commit and push each repository
separately in Source Control or its own terminal. Sibling clones live under
`/workspaces`, so they survive a container rebuild; commit and push before
deleting the codespace.

## Repeat setup and checks

From the backend directory:

```bash
node .devcontainer/bootstrap.mjs
node --test .devcontainer/bootstrap.test.mjs
```

Or use **Terminal → Run Task → Codespaces: set up all repositories**. Existing
Git checkouts are reused without pulling, resetting, or switching branches. A
conflicting non-Git directory causes a clear error. Dependency installation
failures stop setup instead of reporting success.

The setup uses the UI's existing Bun lockfile with `bun install --frozen-lockfile`.
If this reports an outdated lock, update the lock intentionally in the UI repo
with `bun install`, review the changes, and commit them before repeating setup.

Frontend checks are also available as **UI: build** and **UI: typecheck** tasks.

## References

- [GitHub: access to additional repositories](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-repository-access-for-your-codespaces)
- [GitHub: development container configuration](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers)
- [Vite: development server options](https://vite.dev/config/server-options)
