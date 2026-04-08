module.exports = [
"[project]/.next-internal/server/app/api/market-data/stats/route/actions.js [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__, module, exports) => {

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
"[project]/app/api/market-data/stats/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
        const [summary, byState, byStructure, byRetention, byPoliciesPerCx, recent] = await Promise.all([
            // ── Headline stats + multiples by revenue-tier bucket ──────────────
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          WITH buckets AS (
            SELECT
              final_multiple,
              earnout_pct,
              seller_stay_months,
              final_offer,
              (appraised_low + COALESCE(appraised_high, appraised_low)) / 2.0 AS mid_appraisal,
              CASE
                WHEN premium_base <  250000  THEN 'micro'
                WHEN premium_base <  750000  THEN 'small'
                WHEN premium_base <  2000000 THEN 'mid'
                WHEN premium_base <  5000000 THEN 'large'
                ELSE                              'enterprise'
              END AS size_tier
            FROM completed_deals
            WHERE final_multiple > 0
          )
          SELECT
            COUNT(*)::int                                              AS total_deals,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_multiple)::numeric, 2) AS median_multiple,
            ROUND(AVG(final_multiple)::numeric, 2)                     AS avg_multiple,
            ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY final_multiple)::numeric, 2) AS p25_multiple,
            ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY final_multiple)::numeric, 2) AS p75_multiple,
            ROUND(AVG(CASE WHEN earnout_pct > 0 THEN 1 ELSE 0 END)::numeric, 3) AS earnout_rate,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY earnout_pct)::numeric, 1) AS median_earnout_pct,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY seller_stay_months)::numeric, 0) AS median_seller_stay,
            ROUND(AVG(
              CASE WHEN mid_appraisal > 0 THEN final_offer / mid_appraisal ELSE NULL END
            )::numeric, 3)                                             AS avg_offer_to_estimate,

            -- per size tier
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN size_tier='micro'      THEN final_multiple END)::numeric, 2) AS micro_median,
            COUNT(CASE WHEN size_tier='micro'      THEN 1 END)::int    AS micro_count,
            ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CASE WHEN size_tier='micro'     THEN final_multiple END)::numeric, 2) AS micro_p25,
            ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CASE WHEN size_tier='micro'     THEN final_multiple END)::numeric, 2) AS micro_p75,

            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN size_tier='small'      THEN final_multiple END)::numeric, 2) AS small_median,
            COUNT(CASE WHEN size_tier='small'      THEN 1 END)::int    AS small_count,
            ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CASE WHEN size_tier='small'     THEN final_multiple END)::numeric, 2) AS small_p25,
            ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CASE WHEN size_tier='small'     THEN final_multiple END)::numeric, 2) AS small_p75,

            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN size_tier='mid'        THEN final_multiple END)::numeric, 2) AS mid_median,
            COUNT(CASE WHEN size_tier='mid'        THEN 1 END)::int    AS mid_count,
            ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CASE WHEN size_tier='mid'       THEN final_multiple END)::numeric, 2) AS mid_p25,
            ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CASE WHEN size_tier='mid'       THEN final_multiple END)::numeric, 2) AS mid_p75,

            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN size_tier='large'      THEN final_multiple END)::numeric, 2) AS large_median,
            COUNT(CASE WHEN size_tier='large'      THEN 1 END)::int    AS large_count,
            ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CASE WHEN size_tier='large'     THEN final_multiple END)::numeric, 2) AS large_p25,
            ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CASE WHEN size_tier='large'     THEN final_multiple END)::numeric, 2) AS large_p75,

            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN size_tier='enterprise' THEN final_multiple END)::numeric, 2) AS enterprise_median,
            COUNT(CASE WHEN size_tier='enterprise' THEN 1 END)::int    AS enterprise_count,
            ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY CASE WHEN size_tier='enterprise' THEN final_multiple END)::numeric, 2) AS enterprise_p25,
            ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY CASE WHEN size_tier='enterprise' THEN final_multiple END)::numeric, 2) AS enterprise_p75
          FROM buckets
        `,
            // ── Breakdown by state ─────────────────────────────────────────────
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT
            primary_state                                              AS state,
            COUNT(*)::int                                              AS count,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_multiple)::numeric, 2) AS median_multiple
          FROM completed_deals
          WHERE final_multiple > 0 AND primary_state IS NOT NULL
          GROUP BY primary_state
          ORDER BY count DESC
          LIMIT 15
        `,
            // ── Breakdown by deal structure ────────────────────────────────────
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT
            COALESCE(deal_structure, 'Unknown')                        AS structure,
            COUNT(*)::int                                              AS count,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_multiple)::numeric, 2) AS median_multiple,
            ROUND(AVG(earnout_pct)::numeric, 1)                        AS avg_earnout_pct
          FROM completed_deals
          WHERE final_multiple > 0
          GROUP BY deal_structure
          ORDER BY count DESC
        `,
            // ── Breakdown by retention rate bucket ────────────────────────────
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT
            CASE
              WHEN retention_rate <  75 THEN 'under_75'
              WHEN retention_rate <  85 THEN '75_to_84'
              WHEN retention_rate <  92 THEN '85_to_91'
              WHEN retention_rate <  96 THEN '92_to_95'
              ELSE                           '96_plus'
            END AS bucket,
            COUNT(*)::int                                              AS count,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_multiple)::numeric, 2) AS median_multiple
          FROM completed_deals
          WHERE final_multiple > 0 AND retention_rate IS NOT NULL
          GROUP BY bucket
          ORDER BY median_multiple ASC
        `,
            // ── Policies-per-customer distribution ────────────────────────────
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT
            CASE
              WHEN policies_per_cx < 1.5 THEN 'under_1_5'
              WHEN policies_per_cx < 2.0 THEN '1_5_to_2'
              WHEN policies_per_cx < 2.5 THEN '2_to_2_5'
              ELSE                           '2_5_plus'
            END AS bucket,
            COUNT(*)::int                                              AS count,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_multiple)::numeric, 2) AS median_multiple
          FROM completed_deals
          WHERE final_multiple > 0 AND policies_per_cx IS NOT NULL
          GROUP BY bucket
          ORDER BY median_multiple ASC
        `,
            // ── 5 most recent deals ────────────────────────────────────────────
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"]`
          SELECT
            deal_name, deal_type, final_multiple, final_offer,
            deal_structure, earnout_pct, seller_stay_months,
            retention_rate, primary_state, closed_at
          FROM completed_deals
          WHERE final_multiple > 0
          ORDER BY COALESCE(closed_at, created_at::date) DESC
          LIMIT 5
        `
        ]);
        const s = summary[0] ?? {};
        const n = (v)=>v != null ? parseFloat(String(v)) : null;
        const i = (v)=>v != null ? parseInt(String(v)) : 0;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            totalDeals: i(s.total_deals),
            medianMultiple: n(s.median_multiple),
            avgMultiple: n(s.avg_multiple),
            p25Multiple: n(s.p25_multiple),
            p75Multiple: n(s.p75_multiple),
            earnoutRate: n(s.earnout_rate),
            medianEarnoutPct: n(s.median_earnout_pct),
            medianSellerStay: n(s.median_seller_stay),
            avgOfferToEstimate: n(s.avg_offer_to_estimate),
            bySize: [
                {
                    label: "Micro  (< $250k)",
                    tier: "micro",
                    count: i(s.micro_count),
                    median: n(s.micro_median),
                    p25: n(s.micro_p25),
                    p75: n(s.micro_p75)
                },
                {
                    label: "Small  ($250k–$750k)",
                    tier: "small",
                    count: i(s.small_count),
                    median: n(s.small_median),
                    p25: n(s.small_p25),
                    p75: n(s.small_p75)
                },
                {
                    label: "Mid    ($750k–$2M)",
                    tier: "mid",
                    count: i(s.mid_count),
                    median: n(s.mid_median),
                    p25: n(s.mid_p25),
                    p75: n(s.mid_p75)
                },
                {
                    label: "Large  ($2M–$5M)",
                    tier: "large",
                    count: i(s.large_count),
                    median: n(s.large_median),
                    p25: n(s.large_p25),
                    p75: n(s.large_p75)
                },
                {
                    label: "Enterprise  (> $5M)",
                    tier: "enterprise",
                    count: i(s.enterprise_count),
                    median: n(s.enterprise_median),
                    p25: n(s.enterprise_p25),
                    p75: n(s.enterprise_p75)
                }
            ],
            byState: byState.map((r)=>({
                    state: r.state,
                    count: i(r.count),
                    medianMultiple: n(r.median_multiple)
                })),
            byStructure: byStructure.map((r)=>({
                    structure: r.structure,
                    count: i(r.count),
                    medianMultiple: n(r.median_multiple),
                    avgEarnoutPct: n(r.avg_earnout_pct)
                })),
            byRetention: byRetention.map((r)=>({
                    bucket: r.bucket,
                    count: i(r.count),
                    medianMultiple: n(r.median_multiple)
                })),
            byPoliciesPerCx: byPoliciesPerCx.map((r)=>({
                    bucket: r.bucket,
                    count: i(r.count),
                    medianMultiple: n(r.median_multiple)
                })),
            recentDeals: recent.map((r)=>({
                    dealName: r.deal_name,
                    dealType: r.deal_type,
                    finalMultiple: n(r.final_multiple),
                    finalOffer: n(r.final_offer),
                    dealStructure: r.deal_structure,
                    earnoutPct: n(r.earnout_pct),
                    sellerStayMonths: r.seller_stay_months != null ? i(r.seller_stay_months) : null,
                    retentionRate: n(r.retention_rate),
                    primaryState: r.primary_state,
                    closedAt: r.closed_at
                }))
        });
    } catch (err) {
        console.error("[market-data/stats] error:", err);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$15$2e$5$2e$12_$40$opentelemetry$2b$api$40$1$2e$9$2e$0_react$2d$dom$40$19$2e$2$2e$4_react$40$19$2e$2$2e$4_$5f$react$40$19$2e$2$2e$4$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Failed to load market data"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__02909455._.js.map