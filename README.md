# Multi-Source MIS & Management Reporting Automation

## GitHub Codespaces

This repository is the development entry point for `be-fastapi-dp`, `packages-dp`,
and `ui-nextjs-dp`. Its dev container installs Python, Node.js, Bun, and uv; clones
the sibling repositories; and prepares their dependencies.

Create a codespace from this repository, authorize access to the two sibling
repositories, then open `data-plateform.code-workspace` with **File → Open Workspace
from File**. Start the frontend with **Terminal → Run Task → UI: dev** and open
port **3000**.

See [the Codespaces guide](docs/codespaces.md) for setup, branches, credentials,
Python environments, and troubleshooting. The UI uses Next.js App Router and
React; the FastAPI and packages repositories are development scaffolds.

An end-to-end consulting-style data solution for a fictional mid-sized company that currently prepares management MIS manually from multiple data sources.

The project demonstrates how fragmented operational and reporting data can be transformed into a reliable, automated management reporting platform.

## Business Problem

Apex Industrial Components Pvt. Ltd. currently prepares weekly and monthly MIS by manually combining:

- PostgreSQL ERP data
- Finance and Sales Excel/CSV files
- Logistics data from an external API

The process requires significant manual extraction, spreadsheet lookups, reconciliation, and report preparation.

Key problems include:

- 8–12 hours of manual work per reporting cycle
- inconsistent KPI definitions across departments
- delayed management reporting
- spreadsheet errors and version-control issues
- limited historical analysis
- no centralized source of trusted reporting data

## Proposed Solution

```text
PostgreSQL ──────┐
                 │
Excel / CSV ─────┼──> Python Ingestion
                 │          │
REST API ────────┘          ▼
                     BigQuery Staging
                            │
                            ▼
                    Transformations
                  + Data Quality Checks
                            │
                            ▼
                  Management Data Mart
                            │
                            ▼
                     Looker Studio
                            │
                            ▼
                       Management
```

The solution will automate ingestion, transformation, KPI calculation, data-quality validation, and dashboard refresh.

## Technology Stack

- PostgreSQL
- Python
- REST APIs
- Excel / CSV
- Google BigQuery
- SQL
- Looker Studio
- Git / GitHub

## Expected Outcome

The target is to move the reporting process from:

**manual extraction → spreadsheet consolidation → reconciliation → MIS preparation**

to:

**automated ingestion → validated data mart → management dashboard → exception review**

Target manual effort:

**8–12 hours → less than 1 hour per reporting cycle**

## Project Scope

The project covers the complete solution lifecycle:

**Business requirements → Source assessment → Architecture → Data ingestion → BigQuery modelling → Data quality → Dashboarding → Scheduling & monitoring → Documentation**

## Project Status

- [x] Client scenario and business problem
- [ ] Source-system assessment
- [ ] KPI and reporting requirements
- [ ] Solution architecture
- [ ] PostgreSQL source schema
- [ ] Ingestion pipelines
- [ ] BigQuery staging and data mart
- [ ] Transformations and data quality
- [ ] Looker Studio dashboard
- [ ] Scheduling and monitoring
- [ ] Final documentation and case study

## Documentation

Detailed design and implementation documentation is maintained under [`docs/`](docs/).

- [Client Scenario](docs/01-client-scenario.md)
- Source System Assessment
- Reporting & KPI Requirements
- Solution Architecture
- Data Model
- Data Quality Framework
- Operations Runbook

## Portfolio Context

This is a fictional consulting engagement using synthetic data. The business scenario and technical decisions are designed to reflect a realistic mid-sized enterprise MIS automation project.

The focus is not simply on building a dashboard, but on demonstrating the ability to understand a reporting problem and deliver the complete data solution end to end.
