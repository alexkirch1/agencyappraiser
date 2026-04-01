import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { isAdminAuthenticated } from "@/lib/admin-auth"

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const [summary, byState, byStructure, byRetention, byPoliciesPerCx, recent] =
      await Promise.all([

        // ── Headline stats + multiples by revenue-tier bucket ──────────────
        sql`
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
        sql`
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
        sql`
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
        sql`
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
        sql`
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
        sql`
          SELECT
            deal_name, deal_type, final_multiple, final_offer,
            deal_structure, earnout_pct, seller_stay_months,
            retention_rate, primary_state, closed_at
          FROM completed_deals
          WHERE final_multiple > 0
          ORDER BY COALESCE(closed_at, created_at::date) DESC
          LIMIT 5
        `,
      ])

    const s = summary[0] ?? {}
    const n = (v: unknown) => (v != null ? parseFloat(String(v)) : null)
    const i = (v: unknown) => (v != null ? parseInt(String(v)) : 0)

    return NextResponse.json({
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
        { label: "Micro  (< $250k)", tier: "micro",      count: i(s.micro_count),      median: n(s.micro_median),      p25: n(s.micro_p25),      p75: n(s.micro_p75) },
        { label: "Small  ($250k–$750k)", tier: "small",  count: i(s.small_count),      median: n(s.small_median),      p25: n(s.small_p25),      p75: n(s.small_p75) },
        { label: "Mid    ($750k–$2M)", tier: "mid",      count: i(s.mid_count),        median: n(s.mid_median),        p25: n(s.mid_p25),        p75: n(s.mid_p75) },
        { label: "Large  ($2M–$5M)", tier: "large",      count: i(s.large_count),      median: n(s.large_median),      p25: n(s.large_p25),      p75: n(s.large_p75) },
        { label: "Enterprise  (> $5M)", tier: "enterprise", count: i(s.enterprise_count), median: n(s.enterprise_median), p25: n(s.enterprise_p25), p75: n(s.enterprise_p75) },
      ],

      byState: (byState as Array<Record<string, unknown>>).map((r) => ({
        state: r.state as string,
        count: i(r.count),
        medianMultiple: n(r.median_multiple),
      })),

      byStructure: (byStructure as Array<Record<string, unknown>>).map((r) => ({
        structure: r.structure as string,
        count: i(r.count),
        medianMultiple: n(r.median_multiple),
        avgEarnoutPct: n(r.avg_earnout_pct),
      })),

      byRetention: (byRetention as Array<Record<string, unknown>>).map((r) => ({
        bucket: r.bucket as string,
        count: i(r.count),
        medianMultiple: n(r.median_multiple),
      })),

      byPoliciesPerCx: (byPoliciesPerCx as Array<Record<string, unknown>>).map((r) => ({
        bucket: r.bucket as string,
        count: i(r.count),
        medianMultiple: n(r.median_multiple),
      })),

      recentDeals: (recent as Array<Record<string, unknown>>).map((r) => ({
        dealName: r.deal_name as string,
        dealType: r.deal_type as string,
        finalMultiple: n(r.final_multiple),
        finalOffer: n(r.final_offer),
        dealStructure: r.deal_structure as string | null,
        earnoutPct: n(r.earnout_pct),
        sellerStayMonths: r.seller_stay_months != null ? i(r.seller_stay_months) : null,
        retentionRate: n(r.retention_rate),
        primaryState: r.primary_state as string | null,
        closedAt: r.closed_at as string | null,
      })),
    })
  } catch (err) {
    console.error("[market-data/stats] error:", err)
    return NextResponse.json({ error: "Failed to load market data" }, { status: 500 })
  }
}
