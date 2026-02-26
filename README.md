# 🧭 M365 Compass

### **Microsoft 365 Governance & Licence Optimization Platform**

![M365 Compass Logo](android-chrome-192x192.png)

M365 Compass is a modern, single-page application (SPA) designed to provide deep insights into your Microsoft 365 environment. It focuses on **Licence Governance**, **Enterprise Application Management**, and **Cost Optimization** by leveraging the Microsoft Graph API.

---

## 🚀 Key Features

- **📊 Comprehensive Dashboard**: Real-time KPIs for total licences, user assignments, and inactivity.
- **📦 Licence Inventory**: Detailed breakdown of purchased vs. assigned SKUs with utilization percentages.
- **👥 User Governance**: Searchable user directory with sign-in activity and departmental filters.
- **🕒 Inactive User Tracking**: Identify users who haven't signed in within a configurable threshold (e.g., 30, 60, 90 days).
- **📱 Device Insights**: Analyze device types and OS versions used across the organization.
- **💰 Optimization Recommendations**: Automatic identification of potential cost savings based on under-utilized licences.
- **📂 Exportable Reports**: Generate CSV reports for inventory, inactive users, and optimization findings.
- **🎨 Modern Interface**: Premium dark mode design with responsive layouts and interactive charts.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Authentication**: MSAL.js (Microsoft Authentication Library)
- **Data Visualization**: Chart.js
- **Icons**: Lucide Icons
- **Data Handling**: Microsoft Graph API & localForage for client-side persistence

---

## ⚙️ Azure AD App Registration Setup

To use M365 Compass with your own tenant, you must register an application in the [Azure Portal](https://portal.azure.com):

1. **New Registration**:
   - **Name**: LicenseGuard Portal (or M365 Compass)
   - **Supported account types**: Single tenant (or Multi-tenant if applicable)
   - **Redirect URI**: Select **Single-page application (SPA)** and set to `http://localhost:5500` (or your production URL).

2. **API Permissions** (Grant Admin Consent):
   - `User.Read`
   - `User.Read.All`
   - `Organization.Read.All`
   - `Directory.Read.All`
   - `AuditLog.Read.All`
   - `Reports.Read.All`
   - `Application.Read.All`

3. **Get Identifiers**:
   - Note the **Application (client) ID** and **Directory (tenant) ID** for the initial configuration.

---

## 💻 Local Development

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Thomasrobb5/M365-Compass.git
   cd "Licence Optimization Portal"
   ```

2. **Run Locally**:
   - Use the **VS Code Live Server** extension on port `5500`.
   - Or use `npx`:
     ```bash
     npx serve . -p 5500
     ```

3. **Demostration Mode**:
   - Don't have an Azure AD environment? Use the **Demo Mode** on the login screen to explore the platform with sample data.

---

## 🛡️ Governance & Security

M365 Compass is a client-side-only application. It interacts directly with the Microsoft Graph API using the user's delegated permissions. No data is stored on external servers, ensuring your organization's data remains within your control.

---

*Created by Thomas Robb — Solutions Engineer*
