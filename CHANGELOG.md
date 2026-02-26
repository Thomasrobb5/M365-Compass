# 📋 Changelog

All notable changes to the **M365 Compass** project will be documented in this file.

---

## [1.2.0] - 2026-02-26
### Added
- **Professional Documentation**: Generated a comprehensive `README.md` and this `CHANGELOG.md`.
- **Git Security**: Implemented a robust `.gitignore` excluding `local.settings.json`, `.vscode`, `node_modules`, and other sensitive/temporary files.
- **Push Protection Resolution**: Purged secrets from Git history using `git filter-branch` to resolve GitHub's push protection flagging.

### Changed
- **Repository Management**: Successfully pushed the project to the `main` branch on GitHub.

---

## [1.1.0] - 2026-02-25
### Added
- **Optimization Insights**: Implementation of 7 auto-generated categories for cost savings.
- **Device Insights**: Added device type and OS breakdown charts for premium users.
- **Reports Hub**: Created 5 dedicated CSV export types (Inventory, Inactive, Utilization, Optimization, Device).
- **Hub Interface**: Integrated a high-level "Hub" view for navigating between different governance modules.

### Fixed
- Resolved `navigateTo` scoping issues for inline event handlers.
- Fixed demo data hoisting where `makeUser()` was called before definition.
- Cleaned up unused variables and placeholder code.

---

## [1.0.0] - 2026-02-25
### Added
- **Initial Release**: Core platform build-out.
- **Authentication**: MSAL.js v3 integration with redirect flow and silent refresh.
- **Dashboard**: 5 KPI cards and 4 interactive Chart.js visualizations.
- **Licence Inventory**: Detailed SKU management with utilization tracking.
- **User Directory**: Searchable, sortable, and paginated user view.
- **Inactive User Tracking**: Threshold-based inactivity monitoring with visual severity coding.
- **Dark Mode**: Persistent dark/light theme implementation using CSS variables and Tailwind.

---

*Note: History compiled from Antigravity conversation logs.*
