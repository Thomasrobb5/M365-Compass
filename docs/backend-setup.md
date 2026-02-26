# M365 Compass — Azure Backend Setup Guide

> **Module:** Enterprise App Governance — Backend Worker  
> **Audience:** IT Administrators or Azure Engineers responsible for deploying the backend infrastructure.

---

## Why is the Backend Required?

The Enterprise App Governance module needs to aggregate data across every enterprise app in your tenant — resolving nested group memberships and cross-referencing global sign-in logs. For any tenant with more than a few hundred users or apps, this process takes several minutes and exceeds browser timeout limits.

The Azure backend solves this by:
- Running the aggregation automatically on a schedule (e.g. every 4 hours)
- Saving the result as a single pre-compiled `data.json` file in Azure Blob Storage
- Allowing the portal to download this file in seconds instead of waiting for live Graph queries

> **Without the backend**, the App Governance module will still attempt a live client-side query, but may time out or return incomplete data on larger tenants. All other modules (Licence Governance, Device Governance) are **not affected** and do not require this backend.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   Azure (Your Tenant)                │
│                                                      │
│  ┌─────────────────────┐      ┌──────────────────┐  │
│  │  Azure Function App  │─────►│  Azure Blob       │  │
│  │  (Timer Trigger)     │      │  Storage         │  │
│  │  Node.js 18+         │      │  appgov-data/    │  │
│  └──────────┬──────────┘      │  data.json       │  │
│             │                 └────────┬─────────┘  │
│             ▼                          │             │
│  Microsoft Graph API (App-Only)       │             │
│  - servicePrincipals                  │ HTTP GET    │
│  - appRoleAssignedTo                  │             │
│  - transitiveMembers                  │             │
│  - auditLogs/signIns                  │             │
└──────────────────────────────────────┼─────────────┘
                                        │
                                        ▼
                              M365 Compass Portal
                              (Browser — fetches JSON)
```

---

## What You Will Create

| Resource | Purpose |
|---|---|
| App Registration (`M365Compass-BackendWorker`) | Server-side identity for the Azure Function to authenticate to Graph without a user |
| Client Secret | Credential for the App Registration |
| Azure Storage Account | Hosts the output `data.json` blob |
| Blob Container (`appgov-data`) | Public read container inside the Storage Account |
| Azure Function App | Runs the aggregation script on a schedule |

**Estimated Azure Cost:** ~£2–8/month (Consumption plan + Standard storage — varies by tenant size and run frequency)

---

## Part 1 — Create the Backend App Registration

The backend uses **Application permissions** (not Delegated) so it can operate without a signed-in user.

### 1.1 Register the Application

1. Sign in to [https://portal.azure.com](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID → App registrations → New registration**
3. Fill in:
   - **Name:** `M365Compass-BackendWorker`
   - **Supported account types:** `Accounts in this organisational directory only (Single tenant)`
   - **Redirect URI:** Leave blank (not needed for backend apps)
4. Click **Register**

### 1.2 Add API Permissions

1. In your new App Registration, go to **API permissions → Add a permission → Microsoft Graph → Application permissions**
2. Search for and add the following permissions:

   | Permission | Purpose |
   |---|---|
   | `Application.Read.All` | Read all enterprise apps (service principals) |
   | `AuditLog.Read.All` | Read sign-in logs for activity cross-referencing |
   | `GroupMember.Read.All` | Expand group membership for assigned users |
   | `User.Read.All` | Read user display names and UPNs |

3. Click **Add permissions**
4. Click **Grant admin consent for [Your Tenant]** — all four should show a green ✅

> **Important:** These are **Application** permissions (not Delegated). Do not select Delegated when adding these.

### 1.3 Create a Client Secret

1. Go to **Certificates & secrets → New client secret**
2. Add a description (e.g. `M365 Compass Backend Worker`) and set an expiry (e.g. 24 months)
3. Click **Add**
4. **Immediately copy the `Value`** — this is shown only once. Store it securely (e.g. in Azure Key Vault or a password manager)

### 1.4 Note Your Credentials

Go to **Overview** and copy:

| Value | Where to Find It |
|---|---|
| **Application (client) ID** | App Registration → Overview → Application (client) ID |
| **Directory (tenant) ID** | App Registration → Overview → Directory (tenant) ID |
| **Client Secret Value** | Copied in Step 1.3 above |

Keep these — you will need all three in Part 3.

---

## Part 2 — Create the Azure Storage Account

### 2.1 Create the Storage Account

1. In the Azure Portal, navigate to **Storage accounts → Create**
2. Fill in:
   - **Subscription:** Your Azure subscription
   - **Resource group:** Create new or use existing (e.g., `rg-M365 Compass`)
   - **Storage account name:** A globally unique lowercase name (e.g., `M365 Compassdata`)
   - **Region:** Your preferred Azure region
   - **Performance:** Standard
   - **Redundancy:** LRS (Locally Redundant Storage) — sufficient for this use case
3. Click **Review → Create**

### 2.2 Create the Blob Container

1. Once the Storage Account is created, go to **Containers** in the left menu
2. Click **+ Container** and fill in:
   - **Name:** `appgov-data`
   - **Public access level:** `Blob (anonymous read access for blobs only)`
3. Click **Create**

> **Note:** Setting the container to `Blob` access allows the portal to fetch `data.json` without authentication. The JSON contains aggregated governance data (app names, user counts, last sign-in dates) — not passwords, tokens, or sensitive account data. If this is unacceptable for your security policy, you can use a **SAS token** instead — see the _Advanced: SAS Token Authentication_ section at the end of this document.

### 2.3 Configure CORS

The portal (running in the browser) needs permission to download the JSON across origins.

1. In your Storage Account, go to **Resource sharing (CORS)** under **Settings**
2. Under the **Blob service** tab, add a new CORS rule:

   | Setting | Value |
   |---|---|
   | Allowed origins | Your portal URL (e.g. `https://M365 Compass.mycompany.com`) or `*` for development |
   | Allowed methods | `GET, OPTIONS` |
   | Allowed headers | `*` |
   | Exposed headers | `*` |
   | Max age (seconds) | `86400` |

3. Click **Save**

### 2.4 Copy the Connection String

1. Go to **Access keys** in the left menu
2. Click **Show** under **key1**
3. Copy the **Connection string** — you will need this in Part 3

---

## Part 3 — Create the Azure Function App

### 3.1 Create the Function App Resource

1. In the Azure Portal, navigate to **Function App → Create**
2. Fill in:
   - **Subscription:** Your subscription
   - **Resource group:** Same as the Storage Account (e.g., `rg-M365 Compass`)
   - **Function App name:** A unique name (e.g., `M365 Compass-appgov-worker`)
   - **Publish:** Code
   - **Runtime stack:** Node.js
   - **Version:** 18 LTS *(or 20 LTS)*
   - **Region:** Same as your Storage Account
   - **Operating System:** Linux *(recommended for Node.js on Consumption plan)*
   - **Plan type:** Consumption (Serverless)
3. On the **Storage** tab, select **Use existing** and choose the Storage Account created in Part 2
4. Click **Review → Create**

### 3.2 Configure Application Settings (Environment Variables)

Once the Function App is deployed:

1. Go to **Settings → Environment variables** (or **Configuration** in older portal views)
2. Click **+ Add** and add the following Application Settings:

   | Name | Value |
   |---|---|
   | `TENANT_ID` | Directory (tenant) ID from Part 1 |
   | `CLIENT_ID` | Application (client) ID from Part 1 |
   | `CLIENT_SECRET` | Client secret value from Part 1 |
   | `BLOB_CONTAINER` | `appgov-data` |

3. Verify that `AzureWebJobsStorage` is already present and pointing to your Storage Account connection string. If it is missing, add it with the connection string copied in Step 2.4.
4. Click **Apply → Confirm**

---

## Part 4 — Deploy the Backend Worker Code

The backend worker code is located in the `backend-worker/` folder of your M365 Compass project.

### Option A — Deploy via VS Code (Recommended)

1. Open the `backend-worker/` folder in **Visual Studio Code** (or the full project root)
2. Install the **Azure Functions** extension from the VS Code Marketplace
3. Sign in to your Azure account via the **Azure** panel in the sidebar
4. Click the **⚡ Azure Functions** panel → right-click your Function App → **Deploy to Function App...**
5. Select the Function App created in Part 3
6. Confirm when prompted — VS Code will upload and restart the function

### Option B — Deploy via ZIP Upload (No VS Code required)

1. Open the `backend-worker/` folder and **Zip** its entire contents (not the folder itself — select all files inside and zip them)
2. In the Azure Portal, navigate to your Function App → **Advanced Tools (Kudu)** → Go
3. In the Kudu panel, navigate to **Tools → Zip Push Deploy**
4. Drag and drop your zip file onto the page
5. Once uploaded, open a **CMD** session in Kudu and run:
   ```bash
   cd site/wwwroot
   npm install
   ```

### Option C — Deploy via Azure CLI

```bash
# From the backend-worker directory
cd backend-worker
npm install
zip -r backend.zip .

az functionapp deployment source config-zip \
  --resource-group rg-M365 Compass \
  --name M365 Compass-appgov-worker \
  --src backend.zip
```

---

## Part 5 — Test and Verify

### 5.1 Manually Trigger the Function

1. In the Azure Portal, go to your Function App → **Functions**
2. Click on the function (e.g. `TimerTrigger1` or `AppGovWorker`)
3. Click **Code + Test → Test/Run**
4. Click **Run** (leave the body blank for a timer trigger)
5. Watch the **Logs** panel at the bottom — you should see output like:
   ```
   Fetching enterprise apps...
   Found 147 apps
   Expanding group memberships...
   Fetching sign-in logs...
   Writing data.json to blob storage...
   Done. 147 apps, 3,842 users processed.
   ```

> If you see `403 Forbidden` in the logs, verify that admin consent was granted correctly in Part 1.2.

### 5.2 Verify the Blob Output

1. Go to your **Storage Account → Containers → appgov-data**
2. You should see a file named `data.json`
3. Click on it and copy the **URL** from the properties panel — it will look like:
   ```
   https://M365 Compassdata.blob.core.windows.net/appgov-data/data.json
   ```

### 5.3 Link the Blob URL to the Portal

1. Open the M365 Compass Portal
2. Click the **Settings** (gear icon) in the top navigation
3. Paste the Blob URL from Step 5.2 into the **App Gov Blob URL** field
4. Click **Save & Connect**

The Enterprise App Governance module will now instantly load from the pre-aggregated blob on every visit.

---

## Part 6 — Configure the Automatic Schedule

By default, the function uses a timer trigger. To adjust when it runs:

1. In the Function App, navigate to your function → **Code + Test**
2. Open `function.json` (or check the `TimerTrigger` binding in the code)
3. Modify the `schedule` CRON expression:

   | Schedule | Expression |
   |---|---|
   | Every 4 hours | `0 0 */4 * * *` |
   | Nightly at 2:00 AM | `0 0 2 * * *` |
   | Every 6 hours | `0 0 */6 * * *` |
   | Twice daily (6am + 6pm) | `0 0 6,18 * * *` |

> **Recommendation:** Nightly at 2:00 AM UTC is sufficient for most organisations. App governance data does not change frequently enough to warrant more frequent runs, and it keeps Azure Function execution costs minimal.

---

## Cost Estimate

| Resource | Plan | Estimated Monthly Cost |
|---|---|---|
| Azure Function App | Consumption (first 1M executions free) | £0 — £1 |
| Azure Storage Account | Standard LRS (~10 MB data.json) | < £1 |
| Egress (portal downloading JSON) | Per download | Negligible |
| **Total** | | **~£1 – £3/month** |

---

## Advanced: SAS Token Authentication (Optional)

If your security policy prohibits anonymous public blob access, you can use a **Shared Access Signature (SAS) token** to restrict access to the JSON blob while still allowing the portal to download it.

### Generate a SAS Token

1. In your Storage Account, go to **Containers → appgov-data**
2. Click the `...` menu next to `data.json` → **Generate SAS**
3. Set:
   - **Permissions:** Read
   - **Expiry:** Far future date (e.g., 2 years) or regenerate periodically
   - **Allowed IP addresses:** Your portal's hosting IP (optional — adds extra restriction)
4. Click **Generate SAS token and URL**
5. Copy the **Blob SAS URL** (includes the token in the query string)

### Use the SAS URL in the Portal

Paste the full SAS URL (not just the blob URL) into the **App Gov Blob URL** field in the portal settings. The token is appended automatically and the container does not need to be public.

> **Note:** You will need to regenerate the SAS token before it expires and update the portal settings accordingly. For a more permanent solution, consider storing the SAS token in an Azure Key Vault and retrieving it via a small proxy API.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `403 Forbidden` in Function logs | Admin consent not granted | Re-check API Permissions → Grant admin consent in Entra ID |
| `AADSTS700016` in Function logs | Wrong CLIENT_ID or TENANT_ID | Verify environment variables in Function App settings |
| `data.json` not appearing in blob | Function completed but write failed | Check `AzureWebJobsStorage` connection string; verify container name |
| Portal shows "Failed to load App Gov data" | CORS misconfigured | Re-check CORS settings in Storage Account; verify Allowed Origins |
| Function times out after 10 minutes | Very large tenant | Split into multiple functions by app category, or increase timeout in `host.json` to 30 minutes |
| Old data showing in portal | Blob not updated | Trigger the function manually (Part 5.1) to force a refresh |
