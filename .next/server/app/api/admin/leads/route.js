(()=>{var a={};a.id=7747,a.ids=[7747],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},17640:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>F,patchFetch:()=>E,routeModule:()=>A,serverHooks:()=>D,workAsyncStorage:()=>B,workUnitAsyncStorage:()=>C});var d={};c.r(d),c.d(d,{DELETE:()=>z,GET:()=>x,PATCH:()=>y});var e=c(77094),f=c(74863),g=c(62310),h=c(57512),i=c(71174),j=c(261),k=c(46328),l=c(65338),m=c(82298),n=c(25641),o=c(57943),p=c(28253),q=c(71387),r=c(16892),s=c(86439),t=c(27906),u=c(71367),v=c(18095),w=c(63541);async function x(){if(!await (0,w.nm)())return u.NextResponse.json({error:"Unauthorized"},{status:401});try{let a=await (0,v.A)`
      SELECT
        l.id,
        l.name,
        l.email,
        l.phone,
        l.agency_name,
        l.tool_used,
        l.estimated_value,
        l.pipedrive_deal_id,
        l.created_at,
        l.stage,
        l.last_activity,
        l.archived,
        l.archive_reason,
        l.archived_at,
        fv.low_offer,
        fv.high_offer,
        fv.core_score,
        fv.calculated_multiple,
        fv.risk_grade,
        fv.revenue_ltm,
        fv.revenue_y2,
        fv.revenue_y3,
        fv.retention_rate,
        fv.sde_ebitda,
        fv.year_established,
        fv.employee_count,
        fv.owner_compensation,
        fv.annual_payroll_cost,
        fv.revenue_per_employee,
        fv.client_concentration,
        fv.carrier_diversification,
        fv.scope_of_sale,
        fv.avg_client_tenure,
        fv.new_business_value,
        fv.staff_retention_risk,
        fv.office_structure,
        fv.top_carriers,
        fv.producer_agreements,
        fv.closing_timeline,
        fv.primary_state,
        fv.eo_claims,
        fv.policy_mix,
        fv.agency_description,
        qv.revenue        AS quick_revenue,
        qv.retention      AS quick_retention,
        qv.book_type,
        qv.growth,
        qv.policy_ratio,
        qv.policies       AS quick_policies,
        qv.customers      AS quick_customers,
        qv.multiplier     AS quick_multiplier,
        qv.suggested_mult,
        qv.low_value      AS quick_low,
        qv.mid_value      AS quick_mid,
        qv.high_value     AS quick_high,
        qv.tier,
        qs.total_score,
        qs.max_score,
        qs.percentage     AS quiz_pct,
        qs.grade          AS quiz_grade,
        qs.answers        AS quiz_answers
      FROM leads l
      LEFT JOIN full_valuations  fv ON fv.lead_id = l.id
      LEFT JOIN quick_valuations qv ON qv.lead_id = l.id
      LEFT JOIN quiz_submissions qs ON qs.lead_id = l.id
      ORDER BY l.created_at DESC
      LIMIT 200
    `,b=await (0,v.A)`
      SELECT
        (SELECT COUNT(*) FROM leads WHERE archived = false)              AS total_leads,
        (SELECT COUNT(*) FROM full_valuations)    AS full_valuations,
        (SELECT COUNT(*) FROM quick_valuations)   AS quick_valuations,
        (SELECT COUNT(*) FROM quiz_submissions)   AS quiz_submissions,
        (SELECT AVG(estimated_value) FROM leads WHERE estimated_value IS NOT NULL AND archived = false)::NUMERIC(15,2) AS avg_value,
        (SELECT SUM(estimated_value) FROM leads WHERE estimated_value IS NOT NULL AND archived = false)::NUMERIC(15,2) AS total_pipeline_value,
        (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '7 days' AND archived = false) AS leads_this_week,
        (SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '30 days' AND archived = false) AS leads_this_month,
        (SELECT COUNT(*) FROM leads WHERE stage = 'won' AND archived = false) AS won_leads,
        (SELECT COUNT(*) FROM leads WHERE stage = 'lost' AND archived = false) AS lost_leads,
        (SELECT COUNT(*) FROM leads WHERE stage NOT IN ('won', 'lost', 'new') AND archived = false) AS engaged_leads,
        (SELECT AVG(estimated_value) FROM leads WHERE stage = 'won' AND estimated_value IS NOT NULL AND archived = false)::NUMERIC(15,2) AS avg_won_value,
        (SELECT SUM(estimated_value) FROM leads WHERE stage = 'won' AND estimated_value IS NOT NULL AND archived = false)::NUMERIC(15,2) AS total_won_value
    `,c=await (0,v.A)`
      SELECT 
        stage,
        COUNT(*) as count,
        SUM(estimated_value)::NUMERIC(15,2) as value
      FROM leads
      WHERE archived = false
      GROUP BY stage
      ORDER BY 
        CASE stage
          WHEN 'new' THEN 1
          WHEN 'contacted' THEN 2
          WHEN 'qualified' THEN 3
          WHEN 'proposal' THEN 4
          WHEN 'negotiating' THEN 5
          WHEN 'won' THEN 6
          WHEN 'lost' THEN 7
          ELSE 8
        END
    `,d=await (0,v.A)`
      SELECT 
        COALESCE(tool_used, 'unknown') as source,
        COUNT(*) as count,
        SUM(estimated_value)::NUMERIC(15,2) as value
      FROM leads
      WHERE archived = false
      GROUP BY tool_used
      ORDER BY count DESC
    `,e=await (0,v.A)`
      SELECT 
        DATE_TRUNC('week', created_at) as week,
        COUNT(*) as count,
        SUM(estimated_value)::NUMERIC(15,2) as value
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '8 weeks' AND archived = false
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week ASC
    `;return u.NextResponse.json({leads:a,stats:b[0],stageStats:c,sourceStats:d,weeklyTrend:e})}catch(a){return console.error("[v0] admin leads fetch error:",a),u.NextResponse.json({error:"Failed to fetch leads"},{status:500})}}async function y(a){if(!await (0,w.nm)())return u.NextResponse.json({error:"Unauthorized"},{status:401});try{let{id:b,stage:c,archived:d,archive_reason:e}=await a.json();if(!b||isNaN(Number(b)))return u.NextResponse.json({error:"Invalid lead id"},{status:400});if("boolean"==typeof d)return await (0,v.A)`
        UPDATE leads 
        SET archived = ${d},
            archive_reason = ${e??null},
            archived_at = ${d?(0,v.A)`NOW()`:null},
            last_activity = NOW()
        WHERE id = ${Number(b)}
      `,u.NextResponse.json({success:!0});if(c&&!["new","contacted","qualified","proposal","negotiating","won","lost"].includes(c))return u.NextResponse.json({error:"Invalid stage"},{status:400});return await (0,v.A)`
      UPDATE leads 
      SET stage = ${c}, last_activity = NOW() 
      WHERE id = ${Number(b)}
    `,u.NextResponse.json({success:!0})}catch(a){return console.error("[v0] admin leads patch error:",a),u.NextResponse.json({error:"Failed to update lead"},{status:500})}}async function z(a){if(!await (0,w.nm)())return u.NextResponse.json({error:"Unauthorized"},{status:401});try{let{id:b}=await a.json();if(!b||isNaN(Number(b)))return u.NextResponse.json({error:"Invalid lead id"},{status:400});return await (0,v.A)`DELETE FROM full_valuations  WHERE lead_id = ${Number(b)}`,await (0,v.A)`DELETE FROM quick_valuations WHERE lead_id = ${Number(b)}`,await (0,v.A)`DELETE FROM quiz_submissions  WHERE lead_id = ${Number(b)}`,await (0,v.A)`DELETE FROM leads WHERE id = ${Number(b)}`,u.NextResponse.json({success:!0})}catch(a){return console.error("[v0] admin leads delete error:",a),u.NextResponse.json({error:"Failed to delete lead"},{status:500})}}let A=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/admin/leads/route",pathname:"/api/admin/leads",filename:"route",bundlePath:"app/api/admin/leads/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/vercel/share/v0-project/app/api/admin/leads/route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:B,workUnitAsyncStorage:C,serverHooks:D}=A;function E(){return(0,g.patchFetch)({workAsyncStorage:B,workUnitAsyncStorage:C})}async function F(a,b,c){var d;let e="/api/admin/leads/route";"/index"===e&&(e="/");let g=await A.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(y.dynamicRoutes[E]||y.routes[D]);if(F&&!x){let a=!!y.routes[D],b=y.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||A.isDev||x||(G="/index"===(G=D)?"/":G);let H=!0===A.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>A.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>A.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await A.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})},z),b}},l=await A.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await A.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},18095:(a,b,c)=>{"use strict";c.d(b,{A:()=>f});var d=c(82187);let e=process.env.DATABASE_URL;e||console.error("[v0] DATABASE_URL environment variable is not set. Please add it in Settings → Vars.");let f=(0,d.lw)(e??"")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},19463:()=>{},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},49727:()=>{},55511:a=>{"use strict";a.exports=require("crypto")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},63541:(a,b,c)=>{"use strict";c.d(b,{Sg:()=>h,gT:()=>j,gV:()=>i,nm:()=>k});var d=c(31580),e=c(55511);function f(){let a={};a.ADMIN="Secretpassword123";let b=process.env.ADMIN_USERNAME,c=process.env.ADMIN_PASSWORD;b&&c&&(a[b]=c);let d=process.env.ADMIN_USERNAME_2,e=process.env.ADMIN_PASSWORD_2;return d&&e&&(a[d]=e),a}function g(){let a=process.env.ADMIN_SESSION_SECRET;if(!a)throw Error("[admin-auth] ADMIN_SESSION_SECRET environment variable is not set. Admin sessions cannot be signed.");return a}function h(a){let b=g(),c=Buffer.from(a).toString("base64url"),d=(0,e.createHmac)("sha256",b).update(c).digest("base64url");return`${c}.${d}`}function i(a){try{let[b,c]=a.split(".");if(!b||!c)return null;let d=g(),h=(0,e.createHmac)("sha256",d).update(b).digest("base64url"),i=Buffer.from(h),j=Buffer.from(c);if(i.length!==j.length||!(0,e.timingSafeEqual)(i,j))return null;let k=Buffer.from(b,"base64url").toString("utf8"),l=f();if(!(k in l))return null;return k}catch{return null}}function j(a,b){let c=f()[a];if(!c)return!1;try{let a=Buffer.from(c),d=Buffer.from(b);if(a.length!==d.length)return!1;return(0,e.timingSafeEqual)(a,d)}catch{return!1}}async function k(){try{let a=(await (0,d.b3)()).get("Authorization");if(!a?.startsWith("Bearer "))return!1;let b=a.slice(7);return null!==i(b)}catch{return!1}}},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")}};var b=require("../../../../webpack-runtime.js");b.C(a);var c=b.X(0,[1035,1884,2187,1580],()=>b(b.s=17640));module.exports=c})();