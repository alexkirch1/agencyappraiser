(()=>{var a={};a.id=55,a.ids=[55],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},13466:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>D,patchFetch:()=>C,routeModule:()=>y,serverHooks:()=>B,workAsyncStorage:()=>z,workUnitAsyncStorage:()=>A});var d={};c.r(d),c.d(d,{GET:()=>x});var e=c(77094),f=c(74863),g=c(62310),h=c(57512),i=c(71174),j=c(261),k=c(46328),l=c(65338),m=c(82298),n=c(25641),o=c(57943),p=c(28253),q=c(71387),r=c(16892),s=c(86439),t=c(27906),u=c(71367),v=c(18095),w=c(63541);async function x(){if(!await (0,w.nm)())return u.NextResponse.json({error:"Unauthorized"},{status:401});try{let[a,b,c,d,e,f]=await Promise.all([(0,v.A)`
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
        `,(0,v.A)`
          SELECT
            primary_state                                              AS state,
            COUNT(*)::int                                              AS count,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_multiple)::numeric, 2) AS median_multiple
          FROM completed_deals
          WHERE final_multiple > 0 AND primary_state IS NOT NULL
          GROUP BY primary_state
          ORDER BY count DESC
          LIMIT 15
        `,(0,v.A)`
          SELECT
            COALESCE(deal_structure, 'Unknown')                        AS structure,
            COUNT(*)::int                                              AS count,
            ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY final_multiple)::numeric, 2) AS median_multiple,
            ROUND(AVG(earnout_pct)::numeric, 1)                        AS avg_earnout_pct
          FROM completed_deals
          WHERE final_multiple > 0
          GROUP BY deal_structure
          ORDER BY count DESC
        `,(0,v.A)`
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
        `,(0,v.A)`
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
        `,(0,v.A)`
          SELECT
            deal_name, deal_type, final_multiple, final_offer,
            deal_structure, earnout_pct, seller_stay_months,
            retention_rate, primary_state, closed_at
          FROM completed_deals
          WHERE final_multiple > 0
          ORDER BY COALESCE(closed_at, created_at::date) DESC
          LIMIT 5
        `]),g=a[0]??{},h=a=>null!=a?parseFloat(String(a)):null,i=a=>null!=a?parseInt(String(a)):0;return u.NextResponse.json({totalDeals:i(g.total_deals),medianMultiple:h(g.median_multiple),avgMultiple:h(g.avg_multiple),p25Multiple:h(g.p25_multiple),p75Multiple:h(g.p75_multiple),earnoutRate:h(g.earnout_rate),medianEarnoutPct:h(g.median_earnout_pct),medianSellerStay:h(g.median_seller_stay),avgOfferToEstimate:h(g.avg_offer_to_estimate),bySize:[{label:"Micro  (< $250k)",tier:"micro",count:i(g.micro_count),median:h(g.micro_median),p25:h(g.micro_p25),p75:h(g.micro_p75)},{label:"Small  ($250k–$750k)",tier:"small",count:i(g.small_count),median:h(g.small_median),p25:h(g.small_p25),p75:h(g.small_p75)},{label:"Mid    ($750k–$2M)",tier:"mid",count:i(g.mid_count),median:h(g.mid_median),p25:h(g.mid_p25),p75:h(g.mid_p75)},{label:"Large  ($2M–$5M)",tier:"large",count:i(g.large_count),median:h(g.large_median),p25:h(g.large_p25),p75:h(g.large_p75)},{label:"Enterprise  (> $5M)",tier:"enterprise",count:i(g.enterprise_count),median:h(g.enterprise_median),p25:h(g.enterprise_p25),p75:h(g.enterprise_p75)}],byState:b.map(a=>({state:a.state,count:i(a.count),medianMultiple:h(a.median_multiple)})),byStructure:c.map(a=>({structure:a.structure,count:i(a.count),medianMultiple:h(a.median_multiple),avgEarnoutPct:h(a.avg_earnout_pct)})),byRetention:d.map(a=>({bucket:a.bucket,count:i(a.count),medianMultiple:h(a.median_multiple)})),byPoliciesPerCx:e.map(a=>({bucket:a.bucket,count:i(a.count),medianMultiple:h(a.median_multiple)})),recentDeals:f.map(a=>({dealName:a.deal_name,dealType:a.deal_type,finalMultiple:h(a.final_multiple),finalOffer:h(a.final_offer),dealStructure:a.deal_structure,earnoutPct:h(a.earnout_pct),sellerStayMonths:null!=a.seller_stay_months?i(a.seller_stay_months):null,retentionRate:h(a.retention_rate),primaryState:a.primary_state,closedAt:a.closed_at}))})}catch(a){return console.error("[market-data/stats] error:",a),u.NextResponse.json({error:"Failed to load market data"},{status:500})}}let y=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/market-data/stats/route",pathname:"/api/market-data/stats",filename:"route",bundlePath:"app/api/market-data/stats/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/vercel/share/v0-project/app/api/market-data/stats/route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:z,workUnitAsyncStorage:A,serverHooks:B}=y;function C(){return(0,g.patchFetch)({workAsyncStorage:z,workUnitAsyncStorage:A})}async function D(a,b,c){var d;let e="/api/market-data/stats/route";"/index"===e&&(e="/");let g=await y.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:z,routerServerContext:A,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(z.dynamicRoutes[E]||z.routes[D]);if(F&&!x){let a=!!z.routes[D],b=z.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||y.isDev||x||(G="/index"===(G=D)?"/":G);let H=!0===y.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:z,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>y.onRequestError(a,b,d,A)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>y.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await y.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})},A),b}},l=await y.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:z,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await y.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},18095:(a,b,c)=>{"use strict";c.d(b,{A:()=>f});var d=c(82187);let e=process.env.DATABASE_URL;e||console.error("[v0] DATABASE_URL environment variable is not set. Please add it in Settings → Vars.");let f=(0,d.lw)(e??"")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},19463:()=>{},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},49727:()=>{},55511:a=>{"use strict";a.exports=require("crypto")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},63541:(a,b,c)=>{"use strict";c.d(b,{Sg:()=>h,gT:()=>j,gV:()=>i,nm:()=>k});var d=c(31580),e=c(55511);function f(){let a={};a.ADMIN="Secretpassword123";let b=process.env.ADMIN_USERNAME,c=process.env.ADMIN_PASSWORD;b&&c&&(a[b]=c);let d=process.env.ADMIN_USERNAME_2,e=process.env.ADMIN_PASSWORD_2;return d&&e&&(a[d]=e),a}function g(){let a=process.env.ADMIN_SESSION_SECRET;if(!a)throw Error("[admin-auth] ADMIN_SESSION_SECRET environment variable is not set. Admin sessions cannot be signed.");return a}function h(a){let b=g(),c=Buffer.from(a).toString("base64url"),d=(0,e.createHmac)("sha256",b).update(c).digest("base64url");return`${c}.${d}`}function i(a){try{let[b,c]=a.split(".");if(!b||!c)return null;let d=g(),h=(0,e.createHmac)("sha256",d).update(b).digest("base64url"),i=Buffer.from(h),j=Buffer.from(c);if(i.length!==j.length||!(0,e.timingSafeEqual)(i,j))return null;let k=Buffer.from(b,"base64url").toString("utf8"),l=f();if(!(k in l))return null;return k}catch{return null}}function j(a,b){let c=f()[a];if(!c)return!1;try{let a=Buffer.from(c),d=Buffer.from(b);if(a.length!==d.length)return!1;return(0,e.timingSafeEqual)(a,d)}catch{return!1}}async function k(){try{let a=(await (0,d.b3)()).get("Authorization");if(!a?.startsWith("Bearer "))return!1;let b=a.slice(7);return null!==i(b)}catch{return!1}}},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[1035,1884,2187,1580],()=>b(b.s=13466));module.exports=c})();