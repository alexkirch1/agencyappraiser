module.exports = [
"[project]/.next-internal/server/app/api/admin/analytics/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

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
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[project]/lib/admin-auth.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isAdminAuthenticated",
    ()=>isAdminAuthenticated,
    "signSession",
    ()=>signSession,
    "validateAdminCredentials",
    ()=>validateAdminCredentials,
    "verifySession",
    ()=>verifySession
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.12_@opentelemetry+api@1.9.0_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
;
// ---------------------------------------------------------------------------
// Admin credentials — simple env vars, no JSON required.
// ADMIN_USERNAME and ADMIN_PASSWORD are the primary source.
// Falls back to hardcoded defaults so the app always works in dev.
// ---------------------------------------------------------------------------
function getAdminUsers() {
    const users = {};
    // Hardcoded master credential — always works
    users["ADMIN"] = "Secretpassword123";
    // Optional env-var overrides / additional admins
    const u1 = process.env.ADMIN_USERNAME;
    const p1 = process.env.ADMIN_PASSWORD;
    if (u1 && p1) users[u1] = p1;
    const u2 = process.env.ADMIN_USERNAME_2;
    const p2 = process.env.ADMIN_PASSWORD_2;
    if (u2 && p2) users[u2] = p2;
    return users;
}
// ---------------------------------------------------------------------------
// Session signing — HMAC-SHA256 with ADMIN_SESSION_SECRET
// Token format: base64(username):base64(hmac)
// ---------------------------------------------------------------------------
function getSecret() {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret) {
        throw new Error("[admin-auth] ADMIN_SESSION_SECRET environment variable is not set. Admin sessions cannot be signed.");
    }
    return secret;
}
function signSession(username) {
    const secret = getSecret();
    const payload = Buffer.from(username).toString("base64url");
    const hmac = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", secret).update(payload).digest("base64url");
    return `${payload}.${hmac}`;
}
function verifySession(token) {
    try {
        const [payload, hmac] = token.split(".");
        if (!payload || !hmac) return null;
        const secret = getSecret();
        const expected = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])("sha256", secret).update(payload).digest("base64url");
        // Timing-safe comparison to prevent timing attacks
        const expectedBuf = Buffer.from(expected);
        const providedBuf = Buffer.from(hmac);
        if (expectedBuf.length !== providedBuf.length) return null;
        if (!(0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["timingSafeEqual"])(expectedBuf, providedBuf)) return null;
        const username = Buffer.from(payload, "base64url").toString("utf8");
        // Validate that the username still exists in credentials
        const users = getAdminUsers();
        if (!(username in users)) return null;
        return username;
    } catch  {
        return null;
    }
}
function validateAdminCredentials(username, password) {
    const users = getAdminUsers();
    const expected = users[username];
    if (!expected) return false;
    // Timing-safe comparison to prevent username enumeration via timing attacks
    try {
        const expectedBuf = Buffer.from(expected);
        const providedBuf = Buffer.from(password);
        if (expectedBuf.length !== providedBuf.length) return false;
        return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["timingSafeEqual"])(expectedBuf, providedBuf);
    } catch  {
        return false;
    }
}
async function isAdminAuthenticated() {
    try {
        const headerStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])();
        const authHeader = headerStore.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) return false;
        const token = authHeader.slice(7);
        return verifySession(token) !== null;
    } catch  {
        return false;
    }
}
}),
"[project]/app/api/admin/analytics/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@15.5.12_@opentelemetry+api@1.9.0_react-dom@19.2.4_react@19.2.4__react@19.2.4/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$admin$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/admin-auth.ts [app-route] (ecmascript)");
;
;
;
async function GET() {
    if (!await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$admin$2d$auth$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["isAdminAuthenticated"])()) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unauthorized"
        }, {
            status: 401
        });
    }
    try {
        const [leadsPerMonth, avgValuationByMonth, riskGrades, scopeBreakdown, totals] = await Promise.all([
            // Leads grouped by month
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT TO_CHAR(created_at, 'Mon YY') AS month,
                 DATE_TRUNC('month', created_at) AS month_order,
                 COUNT(*)::int AS count
          FROM leads
          GROUP BY month, month_order
          ORDER BY month_order ASC
          LIMIT 12
        `,
            // Average multiple grouped by month — cast through varchar to safely skip non-numeric values
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT TO_CHAR(created_at, 'Mon YY') AS month,
                 DATE_TRUNC('month', created_at) AS month_order,
                 ROUND(AVG(
                   CASE WHEN calculated_multiple::varchar ~ '^-?[0-9]+(\.[0-9]+)?$'
                        THEN calculated_multiple::varchar::numeric
                        ELSE NULL END
                 ), 2) AS avg
          FROM full_valuations
          WHERE calculated_multiple IS NOT NULL
          GROUP BY month, month_order
          ORDER BY month_order ASC
          LIMIT 12
        `,
            // Risk grade breakdown — only single-letter grades
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT risk_grade::varchar AS grade, COUNT(*)::int AS count
          FROM full_valuations
          WHERE risk_grade IS NOT NULL
            AND risk_grade::varchar ~ '^[A-Za-z]{1,2}$'
          GROUP BY risk_grade
          ORDER BY grade ASC
        `,
            // Scope of sale breakdown — coerce to varchar to avoid implicit numeric cast
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT COALESCE(scope_of_sale::varchar, 'unknown') AS scope, COUNT(*)::int AS count
          FROM full_valuations
          GROUP BY scope_of_sale
          ORDER BY count DESC
        `,
            // Aggregate totals
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT
            (SELECT COUNT(*) FROM leads)::int AS total_leads,
            (SELECT COUNT(*) FROM full_valuations)::int AS total_valuations,
            (SELECT ROUND(AVG(
               CASE WHEN calculated_multiple::varchar ~ '^-?[0-9]+(\.[0-9]+)?$'
                    THEN calculated_multiple::varchar::numeric ELSE NULL END
             ), 2) FROM full_valuations WHERE calculated_multiple IS NOT NULL) AS avg_multiple,
            (SELECT ROUND(AVG(
               CASE WHEN revenue_ltm::varchar ~ '^-?[0-9]+(\.[0-9]+)?$'
                    THEN revenue_ltm::varchar::numeric ELSE NULL END
             ), 0) FROM full_valuations WHERE revenue_ltm IS NOT NULL) AS avg_revenue_ltm
        `
        ]);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            leadsPerMonth: leadsPerMonth.map((r)=>({
                    month: r.month,
                    count: r.count
                })),
            avgValuationByMonth: avgValuationByMonth.map((r)=>({
                    month: r.month,
                    avg: parseFloat(r.avg)
                })),
            riskGradeBreakdown: riskGrades,
            scopeBreakdown: scopeBreakdown.map((r)=>({
                    scope: r.scope === "full_agency" ? "Full Agency" : r.scope === "book_only" ? "Book Only" : r.scope,
                    count: r.count
                })),
            totalLeads: totals[0]?.total_leads ?? 0,
            totalValuations: totals[0]?.total_valuations ?? 0,
            avgMultiple: totals[0]?.avg_multiple ? parseFloat(totals[0].avg_multiple) : 0,
            avgRevenueLTM: totals[0]?.avg_revenue_ltm ? parseFloat(totals[0].avg_revenue_ltm) : 0
        });
    } catch (err) {
        console.error("[v0] Analytics error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to load analytics."
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__d4eb0ddb._.js.map