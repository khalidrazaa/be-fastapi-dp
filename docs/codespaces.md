# Develop all three repositories in GitHub Codespaces

Create the codespace from **khalidrazaa/be-fastapi-dp**. Its dev container provides
Python 3.12, Node.js 24, Bun 1.4.4, uv, Git, and the GitHub CLI. Node.js 24 meets
the frontend's Node.js 20.9 minimum. The setup clones the UI and packages
repositories beside the backend under the persistent `/workspaces` directory,
matching the paths in `data-plateform.code-workspace`.

The UI uses Next.js App Router and React, preserving the existing explorer,
detail panels, and mock workflows. The backend and packages repositories
currently have no runtime project manifests.
Setup prepares their Python environments and will install their declared
dependencies when manifests are added. It does not start an API that has not yet
been implemented.

## First launch

1. Commit and push the container/workspace changes in **be-fastapi-dp** and the
   Next.js migration, including `bun.lock`, in **ui-nextjs-dp** to their intended
   branches. Setup clones the UI's default branch unless `UI_REPO_REF` selects
   another branch. Either merge the migration into that default branch first,
   or create a Codespaces secret named `UI_REPO_REF` whose value is the branch
   containing the migration, granting it access to **be-fastapi-dp**, before
   creating the codespace.
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
before creation. Select the intended packages branch in the same way when
needed. Alternatively, switch branches in the relevant repository after setup,
then rerun `node .devcontainer/bootstrap.mjs` from the backend so dependencies
match the selected branches. Existing checkouts keep their branch, commits, and
local changes when setup is repeated.

GitHub's additional repository permissions apply when creating a new codespace.
Rebuilding an existing codespace does not grant new repository permissions. A
new codespace is needed if the existing one lacks the required sibling
repository permissions; save and push your work before recreating it and
authorize the requested repositories. The Next.js migration itself only needs
the existing codespace to be updated and rebuilt.

## Update an existing codespace

1. Save and commit or otherwise preserve local work in each repository. Fetch
   the intended branches, switch to the backend branch containing the updated
   container/workspace files and the UI branch containing the Next.js migration
   and lockfile, then pull the intended commits safely, for example with
   `git pull --ff-only` once the correct branch is active. Review `git status`
   in each repository first.
2. Use **Codespaces: Rebuild Container** to apply the container changes and
   pinned Bun 1.4.4. A dependency reinstall alone does not update the container's
   Bun executable.
3. Let setup finish, or rerun `node .devcontainer/bootstrap.mjs` from the backend
   to reinstall dependencies for the checked-out repositories. Stop any old UI
   server and restart **UI: dev**.

Bootstrap reuses existing sibling checkouts without pulling, resetting, or
switching branches. Setting `UI_REPO_REF` after the UI was cloned does not move
that checkout to the migration branch; update it yourself as described above.

## Start the UI

Use **Terminal → Run Task → UI: dev**, or run:

```bash
cd /workspaces/ui-nextjs-dp
bun run dev
```

Open port **3000** in the Ports panel. The task runs the UI's `bun run dev`
script; Next.js binds to `0.0.0.0:3000`. The UI's `next.config.mjs` allows the
exact origin of this codespace. Forwarded ports remain private by default.

Leave `DISABLE_HMR` unset for live reload. The optional legacy
`DISABLE_HMR=true` switch disables webpack file watching, so restart the server
to pick up source changes when it is enabled.

Next.js rewrites `/api/...` requests in both development and production to the
server-only `FASTAPI_URL`, which defaults to `http://127.0.0.1:8000`. It preserves
the `/api` prefix: `/api/files` reaches `http://127.0.0.1:8000/api/files` by
default. Set `FASTAPI_URL` to the backend origin without an `/api` suffix in the
UI's ignored `.env.local` or a Codespaces secret. Restart development or rebuild
production after changing it. When FastAPI is implemented, bind it to
`0.0.0.0:8000` and define its routes under `/api`. Browser code can request
`/api/...` through the UI's own origin. Port **8000** is also forwarded for
directly inspecting the API or its docs.

The current frontend has no live backend requests. An `/api` request will fail
until an API process is running; a forwarded port does not create that process.

For production-mode verification, use **UI: start**, which builds the frontend
and then starts its production server on port **3000**. Stop **UI: dev** first
so the port is available. The equivalent UI commands are `bun run build`
followed by `bun run start`.

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

Airflow, database servers, BigQuery resources, and the future Apache Superset
service have separate runtime/deployment requirements and are not provisioned
by this editor environment. Add port **8088** forwarding when a Superset runtime
is added; forwarding that port alone does not start Superset.

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
- [Next.js: CLI commands](https://nextjs.org/docs/app/api-reference/cli/next)
