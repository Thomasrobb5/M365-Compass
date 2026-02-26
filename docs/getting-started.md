# M365 Compass — Getting Started & Prerequisites

> **Audience:** IT Administrators, Microsoft 365 Global Admins, or delegated Intune / Security Admins deploying M365 Compass for their organisation.

---

## Overview

M365 Compass is a browser-based Microsoft 365 governance portal. It requires:

- A Microsoft Azure tenant with an **App Registration** configured by an admin
- Appropriate **admin consent** granted for the required API permissions
- A web server (or static host) to serve the portal files

No backend infrastructure is required for the **Licence Governance** and **Device Governance** modules. The **Enterprise App Governance** module optionally uses an Azure Function and Blob Storage for large-tenant data aggregation.

---

## Step 1 — Prerequisites

| Requirement | Detail |
|---|---|
| Microsoft 365 Tenant | Any commercial M365 tenant (E1, E3, E5 etc.) |
| Admin Role | Global Admin *or* delegated: **Application Administrator + Intune Administrator** |
| Browser | Microsoft Edge, Google Chrome, or Firefox (modern versions) |
| Hosting | Any static web host (Azure Static Web Apps, GitHub Pages, local `serve`, etc.) |

---

## Step 2 — Create an Azure App Registration

1. Sign in to [https://portal.azure.com](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID → App Registrations → New Registration**
3. Fill in the following:
   - **Name:** `M365 Compass Portal` *(or any name you prefer)*
   - **Supported account types:** `Accounts in this organisational directory only (Single tenant)`
   - **Redirect URI:** Select `Single-page application (SPA)` and enter the URL where you will host the portal (e.g. `https://M365 Compass.mycompany.com` or `http://localhost:5500` for local testing)
4. Click **Register**
5. Note down the **Application (client) ID** and **Directory (tenant) ID** — you will need these when configuring the portal

---

## Step 3 — Configure API Permissions

Navigate to your new App Registration → **API Permissions → Add a permission → Microsoft Graph → Delegated permissions**.

Add **all** of the following permissions:

### Core (All Modules)
| Permission | Purpose |
|---|---|
| `User.Read` | Sign in the current admin user |
| `User.Read.All` | Read all users and their licence assignments |
| `Organization.Read.All` | Read tenant name and organisation details |
| `Directory.Read.All` | Read directory objects (groups, apps, users) |
| `AuditLog.Read.All` | Read sign-in activity and last sign-in timestamps |

### Licence Governance
| Permission | Purpose |
|---|---|
| `Reports.Read.All` | Read usage reports (email, Teams activity) |

### Enterprise App Governance
| Permission | Purpose |
|---|---|
| `Application.Read.All` | Read enterprise applications and service principals |

### Device Governance
| Permission | Purpose |
|---|---|
| `DeviceManagementManagedDevices.Read.All` | Read Intune managed device inventory and compliance data |

After adding all permissions, click **Grant admin consent for [Your Tenant]** and confirm. All permissions should show a green ✅ status.

> **Important:** `DeviceManagementManagedDevices.Read.All` is an Intune-specific permission. Your account must have an **Intune Administrator** role (or Global Admin) to grant this consent.

---

## Step 4 — Deploy the Portal

M365 Compass is a collection of static files. Host them on any web server:

### Option A — Azure Static Web Apps (Recommended for Production)
1. Create a new **Azure Static Web App** resource in the Azure Portal
2. Link it to your repository or upload the files directly
3. Set your redirect URI in your App Registration to match the provided Azure Static Web Apps URL (e.g. `https://green-ocean-abc123.azurestaticapps.net`)

### Option B — GitHub Pages
1. Push the project files to a GitHub repository
2. Enable GitHub Pages (Settings → Pages → Deploy from branch)
3. Set your redirect URI to `https://[your-username].github.io/[repo-name]`

### Option C — Local Development
```bash
npx -y serve . -p 5500
```
Redirect URI should be set to `http://127.0.0.1:5500`

---

## Step 5 — First Login

1. Open the hosted portal in your browser
2. Click **Connect to Microsoft 365**
3. Enter your **Tenant ID** and **Client (Application) ID** noted in Step 2
4. Click **Sign In** — you will be redirected to the Microsoft login page
5. Sign in with a user account that has at least **Global Reader + Intune Reader** permissions
6. On first login you may be prompted to consent to the requested permissions — click **Accept**
7. On return to the portal, M365 Compass will automatically begin loading your tenant data

> **Session Note:** If you encounter an `interaction_in_progress` error, open the browser console and run `sessionStorage.clear()`, then refresh and try again.

---

## Step 6 — (Optional) Enterprise App Governance — Backend Setup

For large tenants (1,000+ users, 100+ apps), the Enterprise App Governance module benefits from a backend Azure Function that pre-aggregates data nightly.

Refer to the **[Architecture Document](./architecture.md)** for full setup instructions.

---

## Permissions Summary Table

| Module | Permission | Type | Required? |
|---|---|---|---|
| All | `User.Read`, `User.Read.All`, `Organization.Read.All`, `Directory.Read.All`, `AuditLog.Read.All` | Delegated | ✅ Yes |
| Licence Governance | `Reports.Read.All` | Delegated | ✅ Yes |
| Enterprise App Gov | `Application.Read.All` | Delegated | ✅ Yes |
| Device Governance | `DeviceManagementManagedDevices.Read.All` | Delegated | ✅ Yes |

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `interaction_in_progress` | Stale MSAL session lock | Run `sessionStorage.clear()` in browser console and refresh |
| `400 Bad Request` (Graph) | Invalid `$select` field in API query | Update the portal to the latest version |
| `403 Forbidden` (Graph) | Missing or un-consented API permission | Re-grant admin consent in Entra ID for the affected permission |
| `AADSTS700016` | App Registration not found | Verify your Client ID and Tenant ID in the portal config |
| Blank screen after login | Auth redirect issue | Ensure the Redirect URI in App Registration exactly matches the portal URL |
