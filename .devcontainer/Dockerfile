FROM ghcr.io/astral-sh/uv:0.13.7 AS uv
FROM oven/bun:1.4.4 AS bun

FROM mcr.microsoft.com/devcontainers/python:1-3.12-bookworm

COPY --from=uv /uv /uvx /usr/local/bin/
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

ENV UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1
