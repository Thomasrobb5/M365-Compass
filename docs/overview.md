# M365 Compass — Product Overview & Capabilities

> **M365 Compass** is a Microsoft 365 governance and visibility platform for IT administrators. It surfaces actionable insights across licences, enterprise applications, and endpoint devices — entirely from your existing Microsoft tenant data, with no third-party data processing.

---

## What is M365 Compass?

M365 Compass is a zero-infrastructure, browser-based portal that connects to your Microsoft 365 tenant via the Microsoft Graph API. It provides a unified governance layer across three key domains:

| Module | Domain |
|---|---|
| 🔵 **Licence Governance** | M365 licence cost optimisation and user activity |
| 🟣 **Enterprise App Governance** | Enterprise application visibility, SSO coverage, and user assignment auditing |
| 🩵 **Device Governance** | Intune endpoint compliance, encryption, and Defender health |

All data is read directly from your tenant in real-time (or via a background aggregation service for large datasets). **No data ever leaves your Microsoft environment.**

---

## Module 1 — Licence Governance

### Overview
Helps organisations identify wasteful Microsoft 365 licence spend and take action on inactive or mis-assigned users.

### Key Capabilities

#### Licence Inventory
- View all subscribed SKUs (E1, E3, E5, Business Premium, etc.) with consumed vs. available seat counts
- Colour-coded utilisation indicators at a glance
- Real unit cost mapping per SKU for direct cost reporting

#### Inactive User Detection
- Identify users who have not signed in within a configurable inactivity window (default: 90 days)
- Configurable threshold (30, 60, 90, 120, 180 days)
- Displays last sign-in date, assigned licences, department, and job title
- Filter by department or licence type to prioritise remediation

#### Department Cost Analysis
- Break down total licence spend by department
- Identify departments with the highest inactive user rates
- Visualised as bar charts and sortable tables

#### Analytics Dashboard
- Licence utilisation rate across the tenant
- Active vs. inactive user distribution
- Top 10 most expensive departments
- SKU-level comparison and cost projection

#### Recommendations Engine
- Auto-generated actionable recommendations (e.g. "Reclaim 14 E5 licences from users inactive for 90+ days — estimated saving: £2,800/month")
- Recommendations are ranked by potential annual saving

#### CSV Export
- Export the full inactive user list as a CSV for remediation workflows or stakeholder reporting

---

## Module 2 — Enterprise App Governance

### Overview
Provides visibility into all enterprise applications registered in your Entra ID tenant, including SSO configuration, user assignments, and access patterns.

### Key Capabilities

#### Application Inventory
- View all enterprise apps (service principals) in your tenant
- Filter by SSO type (SAML, OIDC, Password SSO, None), publisher, or assignment status
- Search by app name or publisher
- All apps displayed in a sortable, filterable table

#### SSO Coverage Analysis
- Identify apps with no SSO configured (federation risk)
- Breakdown of SAML vs. OIDC vs. Password SSO vs. None
- Pie chart visualisation of SSO coverage across the estate

#### User Assignment Auditing
- See every user assigned to each application (including users assigned via nested groups)
- **Deep group membership expansion** — resolves nested groups up to 5 levels deep to give a true picture of who has access
- Assignment type shown (Direct vs. Group-based)
- Source group name displayed for group-assigned users

#### Audit Groups
- Purpose-built view for IT security reviews
- Shows all groups assigned to each application with their member counts
- Useful for access review and Joiner/Mover/Leaver (JML) processes

#### Inactive App Users
- Within each application's detail view, identify users who have not signed into that specific app in the last 30+ days
- Supports licence and access right-sizing at the per-app level

#### App Detail Panel
- Click any application to open a detailed side panel showing:
  - SSO configuration (entity ID, login URL, reply URLs for SAML)
  - Complete assigned user list with group attribution
  - Key metrics: total assigned, direct users, groups

#### CSV Export
- Export the full user assignment list for any application

---

## Module 3 — Device Governance

### Overview
Connects to Microsoft Intune to provide a real-time view of all managed endpoints, their compliance status, encryption health, and Microsoft Defender status.

### Key Capabilities

#### Overview Dashboard
- KPI cards showing: Total Devices, Non-Compliant count (with compliance rate %), Unencrypted device count (with BitLocker coverage %), and Defender At Risk count
- **OS Distribution** doughnut chart (Windows, macOS, iOS, Android)
- **Compliance by OS** stacked bar chart
- Action Required table highlighting the top 10 most critical devices (non-compliant, unencrypted, or at-risk)

#### Device Inventory
- Full searchable, filterable table of all Intune-managed devices
- Filter by: OS type, compliance state (Compliant / Non-Compliant / Grace Period)
- Real-time search across device name, assigned user, manufacturer, and model
- Multi-device selection with a bulk action bar
- Full CSV export of all device data

#### Device Detail Panel
- Click any device name to open a slide-over detail panel
- Shows device information, hardware specs (serial number, storage, IMEI), and assigned user
- Lazy-loads extended detail from the Intune API on click — no pre-loading required
- Includes: OS version, enrollment date, enrollment type, Azure AD Device ID, management agent

#### Compliance & Security View
- Focused view on all devices with active compliance or security issues
- Issue tagging per device: `Non-Compliant`, `In Grace Period`, `Unencrypted`, `Defender At Risk`
- Compliance state distribution doughnut chart
- High Risk / Medium Risk summary panels showing counts of non-compliant and unencrypted devices
- CSV export of all flagged devices

---

## General Platform Features

### Demo Mode
M365 Compass includes a built-in **Demo Mode** that generates realistic mock data without requiring a Microsoft 365 connection. Ideal for:
- Product demonstrations and evaluations
- Training new IT staff
- Presenting to stakeholders before go-live

### Security & Privacy
- **Read-only access only** — M365 Compass uses `*.Read.*` permissions exclusively and cannot modify any tenant data
- **No external data egress** — All data stays within your Microsoft tenant (IndexedDB in the browser, or your own Azure Blob Storage)
- **No telemetry** — The platform does not send any usage data to the developer

### Authentication
- Secured via **MSAL.js** (Microsoft Authentication Library) using the OAuth 2.0 Authorization Code Flow with PKCE
- Supports **Single Sign-On** with your existing Microsoft account
- Token refresh handled automatically in the background

### Data Caching
- Licence Governance data is cached locally in the browser's **IndexedDB** for instant subsequent loads
- Cache is invalidated when a manual refresh is triggered or a new session is started

---

## Supported Tenants

| Tenant Type | Supported |
|---|---|
| Microsoft 365 Business Basic / Standard / Premium | ✅ |
| Microsoft 365 E1 / E3 / E5 | ✅ |
| Microsoft 365 Government (GCC) | ⚠️ Supported with custom authority URL |
| Multi-tenant / Partner tenants | ⚠️ Requires per-tenant App Registration |
| Microsoft 365 Education | ✅ |
| Azure AD B2C | ❌ Not supported |
