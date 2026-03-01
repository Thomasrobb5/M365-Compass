/**
 * Security Governance - Demo Data Generator
 */

async function secLoadDemoData() {
    console.log("Generating demo security data...");

    // Simulate API delay
    await new Promise(r => setTimeout(r, 800));

    SEC.data.roles = [
        {
            displayName: "Global Administrator",
            description: "Has full access to all administrative features in the directory.",
            members: [
                { displayName: "Thomas Robb", userPrincipalName: "thomas@contoso.com" },
                { displayName: "Adele Vance", userPrincipalName: "adele@contoso.com" },
                { displayName: "Alex Wilber", userPrincipalName: "alex@contoso.com" },
                { displayName: "External Admin - MSP", userPrincipalName: "admin_msp#EXT#@domain.com" }
            ]
        },
        {
            displayName: "Authentication Administrator",
            description: "Can reset passwords for non-administrators and specific roles.",
            members: [
                { displayName: "Thomas Robb", userPrincipalName: "thomas@contoso.com" },
                { displayName: "Isaiah Langer", userPrincipalName: "isaiah@contoso.com" }
            ]
        },
        {
            displayName: "User Administrator",
            description: "Can manage all aspects of users and groups.",
            members: [
                { displayName: "Thomas Robb", userPrincipalName: "thomas@contoso.com" },
                { displayName: "Lidia Holloway", userPrincipalName: "lidia@contoso.com" }
            ]
        },
        {
            displayName: "SharePoint Administrator",
            description: "Full access to SharePoint settings and data.",
            members: [
                { displayName: "Megan Bowen", userPrincipalName: "megan@contoso.com" }
            ]
        },
        {
            displayName: "Teams Administrator",
            description: "Full access to Teams settings and data.",
            members: [
                { displayName: "Nestor Wilke", userPrincipalName: "nestor@contoso.com" },
                { displayName: "Thomas Robb", userPrincipalName: "thomas@contoso.com" }
            ]
        }
    ];

    SEC.data.grants = [
        {
            clientId: "00001111-2222-3333-4444-555566667777",
            consentType: "Principal",
            principalId: "user-id-1",
            scope: "Mail.Read User.Read Notes.Read",
            startTime: "2024-01-15T10:00:00Z",
            displayName: "AI Email Assistant (Free)"
        },
        {
            clientId: "88889999-0000-1111-2222-333344445555",
            consentType: "Principal",
            principalId: "user-id-2",
            scope: "Files.ReadWrite.All Sites.Read.All",
            startTime: "2024-02-10T14:30:00Z",
            displayName: "Smart PDF Converter Pro"
        },
        {
            clientId: "aaaa-bbbb-cccc-dddd-eeeeffff",
            consentType: "AllPrincipals",
            scope: "Directory.Read.All AuditLog.Read.All",
            startTime: "2024-05-01T09:00:00Z",
            displayName: "M365 Security Audit Tool"
        },
        {
            clientId: "cccc-dddd-eeee-ffff-00001111",
            consentType: "Principal",
            scope: "Calendar.ReadWrite",
            startTime: "2024-03-22T11:20:00Z",
            displayName: "Meeting Scheduler"
        }
    ];

    SEC.data.servicePrincipals = {
        "00001111-2222-3333-4444-555566667777": "AI Email Assistant (Free)",
        "88889999-0000-1111-2222-333344445555": "Smart PDF Converter Pro",
        "aaaa-bbbb-cccc-dddd-eeeeffff": "M365 Security Audit Tool",
        "cccc-dddd-eeee-ffff-00001111": "Meeting Scheduler"
    };
}
