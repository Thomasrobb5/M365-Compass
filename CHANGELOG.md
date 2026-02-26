# 📋 Changelog — M365 Compass

All notable changes to the **M365 Compass** platform are documented here. This project has evolved from a targeted license tool into a multi-module governance platform.

---

## [1.2.0] - 2026-02-26 (Current)
### Added
- **Unified Documentation**: Consolidated architecture, overview, and quick-start guides into the `/docs` directory.
- **Professional README**: Created a feature-rich project landing page.
- **Git Security Hardening**: Implemented comprehensive `.gitignore` and purged historical secrets (Azure AD keys) from Git history to resolve push protection issues.

### Changed
- **Repository Setup**: Initialized and pushed the clean codebase to its new GitHub home on the `main` branch.

---

## [1.1.5] - 2026-02-26
### Added
- **Device Governance (Module 3)**: Introduced the `devicegov` module.
  - **Intune Integration**: Real-time connection to Microsoft Intune via Graph API.
  - **Compliance Monitoring**: Dashboard for non-compliant, unencrypted, and at-risk devices.
  - **Hardware Insights**: Slide-over panel for deep hardware/OS specs per device.
  - **Encryption Auditing**: Dedicated view for BitLocker (Windows) and FileVault (macOS) status.
- **Device & Usage Insights**: Added cross-module usage charts showing OS distribution and premium license access patterns.

---

## [1.1.0] - 2026-02-26
### Added
- **Enterprise App Governance (Module 2)**: Introduced the `appgov` module.
  - **SSO Coverage Auditing**: Visualization of SAML vs OIDC vs Password SSO across the tenant.
  - **Deep Group Expansion**: Implemented transitive member resolution (up to 5 levels) to audit true application access.
  - **Module Persistence**: Added local persistence for app data to handle large service principal payloads.
- **M365 Compass Hub**: Built the "Hub" view to allow administrators to switch seamlessly between Licence, App, and Device governance.

### Changed
- **Rebranding**: Transitioned product name from "LicenseGuard" to **M365 Compass** to reflect the broader governance scope.

---

## [1.0.5] - 2026-02-25
### Added
- **Analytics & Cost Optimization**:
  - **Departmental Cost Analysis**: Bar charts breaking down license spend by HR, Engineering, Sales, etc.
  - **Optimization Recommendations**: 7 automatic categories identification (e.g., reclaiming E5s from inactive users).
  - **Spend Mapping**: Interactive SKU rate management with dollar-savings projections.
- **Performance**: Integrated `localforage` (IndexedDB) for persistent client-side data caching.

---

## [1.0.0] - 2026-02-25
### Added
- **Initial Build (LicenseGuard)**: The foundation of the platform focusing on M365 License Optimization.
- **Core Engine**: Fully client-side SPA with no build step required.
- **MSAL.js v3**: Secure Entra ID authentication with PKCE and token management.
- **Dashboard**: Initial KPI cards and Chart.js distribution donuts.
- **User Governance**: Searchable/sortable table for all licensed users.
- **Inactivity Tracking**: Threshold-based monitoring for unused licenses.

---

*Note: History reconstructed from development logs and architectural documentation.*
