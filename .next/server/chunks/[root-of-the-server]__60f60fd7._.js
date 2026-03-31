module.exports = [
"[project]/.next-internal/server/app/api/submit-lead/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/db.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$neondatabase$2b$serverless$40$1$2e$0$2e$2$2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/@neondatabase+serverless@1.0.2/node_modules/@neondatabase/serverless/index.mjs [app-route] (ecmascript)");
;
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("[v0] DATABASE_URL environment variable is not set. Please add it in Settings → Vars.");
}
const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f40$neondatabase$2b$serverless$40$1$2e$0$2e$2$2f$node_modules$2f40$neondatabase$2f$serverless$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["neon"])(DATABASE_URL ?? "");
const __TURBOPACK__default__export__ = sql;
}),
"[project]/app/api/submit-lead/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.12_@opentelemetry+api@1.9.0_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
;
;
const PIPEDRIVE_TOKEN = process.env.PIPEDRIVE_API_TOKEN;
const PIPEDRIVE_DOMAIN = "rocky" // your Pipedrive subdomain
;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = "mergers@rockyquote.com";
// We'll look up the pipeline + stage IDs dynamically on first call
let cachedStageId = null;
async function getPipedriveLeadsStageId() {
    if (cachedStageId) return cachedStageId;
    try {
        const res = await fetch(`https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/stages?api_token=${PIPEDRIVE_TOKEN}`);
        const json = await res.json();
        if (!json.success || !json.data) return null;
        // Find the "Leads" stage in the "Acquisitions" pipeline (pipeline_id = 7)
        const leadsStage = json.data.find((s)=>s.pipeline_id === 7 && s.name.toLowerCase() === "leads");
        if (leadsStage) {
            cachedStageId = leadsStage.id;
            return leadsStage.id;
        }
        // Fallback: get first stage of pipeline 7
        const anyStage = json.data.find((s)=>s.pipeline_id === 7);
        if (anyStage) {
            cachedStageId = anyStage.id;
            return anyStage.id;
        }
        return null;
    } catch  {
        return null;
    }
}
async function createPipedrivePerson(data) {
    try {
        const res = await fetch(`https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/persons?api_token=${PIPEDRIVE_TOKEN}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: data.name,
                email: [
                    {
                        value: data.email,
                        primary: true,
                        label: "work"
                    }
                ],
                phone: data.phone ? [
                    {
                        value: data.phone,
                        primary: true,
                        label: "work"
                    }
                ] : undefined,
                org_id: undefined
            })
        });
        const json = await res.json();
        if (json.success && json.data?.id) return json.data.id;
        return null;
    } catch  {
        return null;
    }
}
// Cache for Pipedrive custom field keys (fetched once per cold start)
let cachedFieldMap = null;
/**
 * Fetch all Pipedrive deal fields and build a logical-name → field-key mapping.
 * Uses multiple matching strategies per logical field (exact phrase, then partial).
 */ async function getPipedriveCustomFields() {
    if (cachedFieldMap) return cachedFieldMap;
    try {
        const res = await fetch(`https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/dealFields?api_token=${PIPEDRIVE_TOKEN}`);
        const json = await res.json();
        if (!json.success || !json.data) {
            return {};
        }
        const map = {};
        const fields = json.data;
        // Only match against custom fields (40-char hex key) — never Pipedrive system fields
        const customFields = fields.filter((f)=>/^[a-f0-9]{40}$/.test(f.key));
        // Build a helper to find a field by trying multiple patterns in order
        function findField(patterns) {
            for (const pattern of patterns){
                const match = customFields.find((f)=>{
                    const n = f.name.toLowerCase();
                    return n === pattern.toLowerCase() || n.includes(pattern.toLowerCase());
                });
                if (match) return match.key;
            }
            return null;
        }
        // Map each logical key with multiple search patterns (most specific first)
        const mappings = [
            [
                "revenue",
                [
                    "annual revenue",
                    "revenue ltm",
                    "revenue",
                    "total revenue"
                ]
            ],
            [
                "sde",
                [
                    "sde",
                    "ebitda",
                    "sde / ebitda",
                    "sde/ebitda",
                    "seller discretionary"
                ]
            ],
            [
                "retention",
                [
                    "retention rate",
                    "retention %",
                    "retention"
                ]
            ],
            [
                "policyMix",
                [
                    "commercial lines mix",
                    "commercial mix",
                    "policy mix",
                    "commercial %"
                ]
            ],
            [
                "concentration",
                [
                    "client concentration",
                    "concentration",
                    "top client %"
                ]
            ],
            [
                "state",
                [
                    "primary state",
                    "state",
                    "location"
                ]
            ],
            [
                "employees",
                [
                    "employee count",
                    "employees",
                    "number of employees",
                    "staff"
                ]
            ],
            [
                "carrierDiv",
                [
                    "carrier diversification",
                    "carrier div",
                    "top carrier %"
                ]
            ],
            [
                "scope",
                [
                    "scope of sale",
                    "scope",
                    "sale type",
                    "deal type"
                ]
            ],
            [
                "yearEstablished",
                [
                    "year established",
                    "year est",
                    "founded",
                    "established"
                ]
            ]
        ];
        for (const [logicalKey, patterns] of mappings){
            const key = findField(patterns);
            if (key) map[logicalKey] = key;
        }
        cachedFieldMap = map;
        return map;
    } catch (err) {
        console.error("[v0] Failed to fetch Pipedrive fields:", err);
        return {};
    }
}
async function createPipedriveDeal(params) {
    try {
        // Get custom field keys
        const fieldMap = await getPipedriveCustomFields();
        // Build deal body with custom field values
        const dealBody = {
            title: params.title,
            person_id: params.personId,
            stage_id: params.stageId,
            value: Math.round(params.value),
            currency: "USD"
        };
        // Pipedrive system field keys that must never be set via the custom field mapper
        const SYSTEM_KEYS = new Set([
            "origin",
            "source",
            "status",
            "stage_id",
            "pipeline_id",
            "owner_id",
            "person_id",
            "org_id"
        ]);
        // Map valuation data to Pipedrive custom fields
        if (params.customFields) {
            for (const [logicalKey, value] of Object.entries(params.customFields)){
                const pipedriveKey = fieldMap[logicalKey];
                // Only write if the resolved key looks like a custom field (40-char hex) and is not a system field
                if (pipedriveKey && value != null && /^[a-f0-9]{40}$/.test(pipedriveKey) && !SYSTEM_KEYS.has(pipedriveKey)) {
                    dealBody[pipedriveKey] = value;
                }
            }
        }
        const res = await fetch(`https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/deals?api_token=${PIPEDRIVE_TOKEN}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dealBody)
        });
        const json = await res.json();
        if (!json.success || !json.data?.id) {
            return null;
        }
        const dealId = json.data.id;
        // Attach note with valuation details
        if (params.note) {
            await fetch(`https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1/notes?api_token=${PIPEDRIVE_TOKEN}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    deal_id: dealId,
                    content: params.note
                })
            });
        }
        return dealId;
    } catch  {
        return null;
    }
}
async function sendEmailNotification(data) {
    if (!RESEND_API_KEY) {
        console.log("[v0] RESEND_API_KEY not set, skipping email");
        return;
    }
    try {
        const adminRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: "Agency Appraiser <onboarding@resend.dev>",
                to: [
                    NOTIFY_EMAIL
                ],
                reply_to: data.leadEmail,
                subject: `New Lead: ${data.leadName} - ${data.toolUsed}`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">New Agency Appraiser Lead</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Name</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${data.leadName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Email</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;"><a href="mailto:${data.leadEmail}">${data.leadEmail}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Phone</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${data.leadPhone || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Agency</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${data.agencyName || "Not provided"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Tool Used</td>
                <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${data.toolUsed}</td>
              </tr>
            </table>
            <h3 style="margin-top: 24px;">Valuation Details</h3>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-size: 14px;">
${data.valuationSummary}
            </div>
            <p style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
              This lead was submitted via the Agency Appraiser calculator at ${new Date().toLocaleString()}.
            </p>
          </div>
        `
            })
        });
        await adminRes.json();
        // Send confirmation copy to the user
        const userRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: "Agency Appraiser <onboarding@resend.dev>",
                to: [
                    data.leadEmail
                ],
                reply_to: NOTIFY_EMAIL,
                subject: "We received your agency valuation request",
                html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #0f172a; font-size: 22px;">Thanks, ${data.leadName}!</h1>
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              We received your agency valuation request and our team will be in touch shortly.
            </p>
            ${data.valuationSummary ? `
            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 24px 0; white-space: pre-wrap; font-size: 14px; color: #475569;">
              ${data.valuationSummary}
            </div>` : ""}
            <p style="color: #334155; font-size: 16px; line-height: 1.6;">
              In the meantime, you can revisit your valuation anytime at
              <a href="https://agencyappraiser.com/calculator" style="color: #0ea5e9;">agencyappraiser.com/calculator</a>.
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 32px;">
              Talk soon,<br/>
              <strong>The Agency Appraiser Team</strong><br/>
              <a href="mailto:mergers@rockyquote.com" style="color: #0ea5e9;">mergers@rockyquote.com</a>
            </p>
            <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px;">You received this because you submitted a valuation request on Agency Appraiser.</p>
            </div>
          </div>
        `
            })
        });
        await userRes.json();
    } catch (err) {
        console.error("[v0] Email send failed:", err);
    }
}
async function POST(req) {
    try {
        const body = await req.json();
        const { name, email, phone, agencyName, toolUsed, valuationSummary, estimatedValue, // Structured valuation data for Pipedrive custom fields
        valuationData } = body;
        if (!name || !email) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Name and email are required"
            }, {
                status: 400
            });
        }
        // Input length limits to prevent DB abuse
        if (typeof name !== "string" || name.length > 200) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid name"
            }, {
                status: 400
            });
        }
        // Basic email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof email !== "string" || !emailRegex.test(email) || email.length > 320) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid email address"
            }, {
                status: 400
            });
        }
        if (phone && (typeof phone !== "string" || phone.length > 30)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid phone number"
            }, {
                status: 400
            });
        }
        if (agencyName && (typeof agencyName !== "string" || agencyName.length > 300)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Invalid agency name"
            }, {
                status: 400
            });
        }
        const results = {
            pipedrive: false,
            email: false,
            dealId: null,
            leadId: null
        };
        // Save lead to Neon
        try {
            const rows = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
        INSERT INTO leads (name, email, phone, agency_name, tool_used, estimated_value)
        VALUES (${name}, ${email}, ${phone || null}, ${agencyName || null}, ${toolUsed || null}, ${estimatedValue || null})
        RETURNING id
      `;
            results.leadId = rows[0]?.id ?? null;
        } catch (err) {
            console.error("[v0] Neon lead insert failed:", err);
        }
        // 1. Create Pipedrive person + deal
        if (PIPEDRIVE_TOKEN) {
            const stageId = await getPipedriveLeadsStageId();
            const personId = await createPipedrivePerson({
                name,
                email,
                phone,
                agencyName
            });
            if (personId && stageId) {
                const dealTitle = agencyName ? `${agencyName} - ${name}` : name;
                // Build custom field values from structured data
                // Numbers must be sent as actual numbers, strings as strings
                const customFields = {};
                if (valuationData) {
                    const num = (v)=>v != null && v !== "" ? Number(v) : null;
                    const revenueLTM = num(valuationData.revenueLTM);
                    const sdeEbitda = num(valuationData.sdeEbitda);
                    const retentionRate = num(valuationData.retentionRate);
                    const policyMix = num(valuationData.policyMix);
                    const clientConcentration = num(valuationData.clientConcentration);
                    const employeeCount = num(valuationData.employeeCount);
                    const carrierDiv = num(valuationData.carrierDiversification);
                    const yearEstablished = num(valuationData.yearEstablished);
                    if (revenueLTM) customFields.revenue = revenueLTM;
                    if (sdeEbitda) customFields.sde = sdeEbitda;
                    if (retentionRate) customFields.retention = retentionRate;
                    if (policyMix) customFields.policyMix = policyMix;
                    if (clientConcentration) customFields.concentration = clientConcentration;
                    if (valuationData.primaryState) customFields.state = String(valuationData.primaryState);
                    if (employeeCount) customFields.employees = employeeCount;
                    if (carrierDiv) customFields.carrierDiv = carrierDiv;
                    if (yearEstablished) customFields.yearEstablished = yearEstablished;
                    if (valuationData.scopeOfSale != null) {
                        const scopeLabels = {
                            1: "Full Agency",
                            0.95: "Book Purchase",
                            0.9: "Fragmented"
                        };
                        customFields.scope = scopeLabels[Number(valuationData.scopeOfSale)] || String(valuationData.scopeOfSale);
                    }
                // Note: "source" is intentionally omitted — Pipedrive's "origin" field is system-generated and cannot be set via the API
                }
                const dealId = await createPipedriveDeal({
                    title: dealTitle,
                    personId,
                    stageId,
                    value: estimatedValue || 0,
                    note: `Contact: ${name} (${email})\nAgency: ${agencyName || "N/A"}\nPhone: ${phone || "N/A"}\nTool: ${toolUsed || "Agency Valuation"}\n\n--- Valuation Summary ---\n${valuationSummary || "No valuation data"}`,
                    customFields
                });
                if (dealId) {
                    results.pipedrive = true;
                    results.dealId = dealId;
                    // Backfill Pipedrive deal ID on the lead row
                    if (results.leadId) {
                        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`UPDATE leads SET pipedrive_deal_id = ${dealId} WHERE id = ${results.leadId}`.catch(()=>{});
                    }
                }
            }
        }
        // 2. Send email notification to admin
        await sendEmailNotification({
            leadName: name,
            leadEmail: email,
            leadPhone: phone,
            agencyName,
            toolUsed: toolUsed || "Agency Valuation",
            valuationSummary: valuationSummary || "No valuation data yet (lead captured pre-calculation)"
        });
        results.email = true;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            ...results,
            leadId: results.leadId
        });
    } catch (err) {
        console.error("[v0] Lead submission error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Internal server error"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__60f60fd7._.js.map