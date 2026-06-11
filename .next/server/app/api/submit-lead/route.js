(()=>{var a={};a.id=7829,a.ids=[7829],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},16125:(a,b,c)=>{"use strict";c.d(b,{T:()=>f,i:()=>e});let d=new Map;function e(a,b,c){let e=Date.now(),f=d.get(a);(!f||f.resetAt<e)&&(f={count:0,resetAt:e+c},d.set(a,f)),f.count++;let g=Math.max(0,b-f.count);return{allowed:f.count<=b,remaining:g,resetAt:f.resetAt}}function f(a){let b=a.headers;return b.get("x-forwarded-for")?.split(",")[0]?.trim()??b.get("x-real-ip")??"unknown"}"undefined"!=typeof setInterval&&setInterval(()=>{let a=Date.now();for(let[b,c]of d.entries())c.resetAt<a&&d.delete(b)},3e5)},18095:(a,b,c)=>{"use strict";c.d(b,{A:()=>f});var d=c(82187);let e=process.env.DATABASE_URL??"postgresql://placeholder:placeholder@placeholder/placeholder",f=(0,d.lw)(e)},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},19463:()=>{},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},49727:()=>{},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},86840:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>P,patchFetch:()=>O,routeModule:()=>K,serverHooks:()=>N,workAsyncStorage:()=>L,workUnitAsyncStorage:()=>M});var d={};c.r(d),c.d(d,{POST:()=>J,dynamic:()=>y});var e=c(77094),f=c(74863),g=c(62310),h=c(57512),i=c(71174),j=c(261),k=c(46328),l=c(65338),m=c(82298),n=c(25641),o=c(57943),p=c(28253),q=c(71387),r=c(16892),s=c(86439),t=c(27906),u=c(71367),v=c(18095),w=c(16125),x=c(99919);let y="force-dynamic",z=process.env.PIPEDRIVE_API_TOKEN,A="rocky",B=process.env.RESEND_API_KEY,C=null;async function D(){if(C)return C;try{let a=await fetch(`https://${A}.pipedrive.com/api/v1/stages?api_token=${z}`),b=await a.json();if(!b.success||!b.data)return null;let c=b.data.find(a=>7===a.pipeline_id&&"leads"===a.name.toLowerCase());if(c)return C=c.id,c.id;let d=b.data.find(a=>7===a.pipeline_id);if(d)return C=d.id,d.id;return null}catch{return null}}async function E(a){try{let b=await fetch(`https://${A}.pipedrive.com/api/v1/persons?api_token=${z}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:a.name,email:[{value:a.email,primary:!0,label:"work"}],phone:a.phone?[{value:a.phone,primary:!0,label:"work"}]:void 0,org_id:void 0})}),c=await b.json();if(c.success&&c.data?.id)return c.data.id;return null}catch{return null}}let F=null;async function G(){if(F)return F;try{let a=await fetch(`https://${A}.pipedrive.com/api/v1/dealFields?api_token=${z}`),b=await a.json();if(!b.success||!b.data)return{};let c={},d=b.data.filter(a=>/^[a-f0-9]{40}$/.test(a.key));for(let[a,b]of[["revenue",["annual revenue","revenue ltm","revenue","total revenue"]],["sde",["sde","ebitda","sde / ebitda","sde/ebitda","seller discretionary"]],["retention",["retention rate","retention %","retention"]],["policyMix",["commercial lines mix","commercial mix","policy mix","commercial %"]],["concentration",["client concentration","concentration","top client %"]],["state",["primary state","state","location"]],["employees",["employee count","employees","number of employees","staff"]],["carrierDiv",["carrier diversification","carrier div","top carrier %"]],["scope",["scope of sale","scope","sale type","deal type"]],["yearEstablished",["year established","year est","founded","established"]]]){let e=function(a){for(let b of a){let a=d.find(a=>{let c=a.name.toLowerCase();return c===b.toLowerCase()||c.includes(b.toLowerCase())});if(a)return a.key}return null}(b);e&&(c[a]=e)}return F=c,c}catch(a){return console.error("[v0] Failed to fetch Pipedrive fields:",a),{}}}async function H(a){try{let b=await G(),c={title:a.title,person_id:a.personId,stage_id:a.stageId,value:Math.round(a.value),currency:"USD"},d=new Set(["origin","source","status","stage_id","pipeline_id","owner_id","person_id","org_id"]);if(a.customFields)for(let[e,f]of Object.entries(a.customFields)){let a=b[e];a&&null!=f&&/^[a-f0-9]{40}$/.test(a)&&!d.has(a)&&(c[a]=f)}let e=await fetch(`https://${A}.pipedrive.com/api/v1/deals?api_token=${z}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)}),f=await e.json();if(!f.success||!f.data?.id)return null;let g=f.data.id;return a.note&&await fetch(`https://${A}.pipedrive.com/api/v1/notes?api_token=${z}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deal_id:g,content:a.note})}),g}catch{return null}}async function I(a){if(!B)return void console.log("[submit-lead] RESEND_API_KEY not set, skipping email");try{let{from:b,html:c,subject:d}=(0,x.Vc)({leadName:a.leadName,leadEmail:a.leadEmail,leadPhone:a.leadPhone,agencyName:a.agencyName,toolUsed:a.toolUsed,estimatedValue:a.estimatedValue,valuationSummary:a.valuationSummary});await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${B}`},body:JSON.stringify({from:b,to:["alex@rockyquote.com"],reply_to:a.leadEmail,subject:d,html:c})})}catch(a){console.error("[submit-lead] Admin email failed:",a)}}async function J(a){let{allowed:b}=(0,w.i)(`submit-lead:${(0,w.T)(a)}`,5,9e5);if(!b)return u.NextResponse.json({error:"Too many requests. Please try again later."},{status:429});try{let{name:b,email:c,phone:d,agencyName:e,toolUsed:f,valuationSummary:g,estimatedValue:h,valuationData:i}=await a.json();if(!b||!c)return u.NextResponse.json({error:"Name and email are required"},{status:400});if("string"!=typeof b||b.length>200)return u.NextResponse.json({error:"Invalid name"},{status:400});if("string"!=typeof c||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)||c.length>320)return u.NextResponse.json({error:"Invalid email address"},{status:400});if(d&&("string"!=typeof d||d.length>30))return u.NextResponse.json({error:"Invalid phone number"},{status:400});if(e&&("string"!=typeof e||e.length>300))return u.NextResponse.json({error:"Invalid agency name"},{status:400});let j={pipedrive:!1,email:!1,dealId:null,leadId:null};try{let a=await (0,v.A)`
        INSERT INTO leads (name, email, phone, agency_name, tool_used, estimated_value, valuation_summary)
        VALUES (${b}, ${c}, ${d||null}, ${e||null}, ${f||null}, ${h||null}, ${g||null})
        RETURNING id
      `;j.leadId=a[0]?.id??null}catch(a){console.error("[v0] Neon lead insert failed:",a)}if(z){let a=await D(),k=await E({name:b,email:c,phone:d,agencyName:e});if(k&&a){let l=e?`${e} - ${b}`:b,m={};if(i){let a=a=>null!=a&&""!==a?Number(a):null,b=a(i.revenueLTM),c=a(i.sdeEbitda),d=a(i.retentionRate),e=a(i.policyMix),f=a(i.clientConcentration),g=a(i.employeeCount),h=a(i.carrierDiversification),j=a(i.yearEstablished);b&&(m.revenue=b),c&&(m.sde=c),d&&(m.retention=d),e&&(m.policyMix=e),f&&(m.concentration=f),i.primaryState&&(m.state=String(i.primaryState)),g&&(m.employees=g),h&&(m.carrierDiv=h),j&&(m.yearEstablished=j),null!=i.scopeOfSale&&(m.scope=({1:"Full Agency",.95:"Book Purchase",.9:"Fragmented"})[Number(i.scopeOfSale)]||String(i.scopeOfSale))}let n=await H({title:l,personId:k,stageId:a,value:h||0,note:`Contact: ${b} (${c})
Agency: ${e||"N/A"}
Phone: ${d||"N/A"}
Tool: ${f||"Agency Valuation"}

--- Valuation Summary ---
${g||"No valuation data"}`,customFields:m});n&&(j.pipedrive=!0,j.dealId=n,j.leadId&&await (0,v.A)`UPDATE leads SET pipedrive_deal_id = ${n} WHERE id = ${j.leadId}`.catch(()=>{}))}}if(await I({leadName:b,leadEmail:c,leadPhone:d,agencyName:e,toolUsed:f||"Agency Valuation",estimatedValue:h?.toString(),valuationSummary:g||"No valuation data yet"}),j.email=!0,j.leadId){let a=new Date,b=new Date(a.getTime()+1728e5),c=new Date(a.getTime()+432e6);await (0,v.A)`
        INSERT INTO email_drip (lead_id, sequence, send_after)
        VALUES
          (${j.leadId}, 1, ${a.toISOString()}),
          (${j.leadId}, 2, ${b.toISOString()}),
          (${j.leadId}, 3, ${c.toISOString()})
        ON CONFLICT (lead_id, sequence) DO NOTHING
      `.catch(a=>console.error("[submit-lead] Failed to queue drip emails:",a));let d=process.env.NEXT_PUBLIC_BASE_URL??(process.env.VERCEL_URL?`https://${process.env.VERCEL_URL}`:"http://localhost:3000"),e={"Content-Type":"application/json"};process.env.CRON_SECRET&&(e.Authorization=`Bearer ${process.env.CRON_SECRET}`),fetch(`${d}/api/send-drip-email`,{method:"POST",headers:e}).catch(a=>console.error("[submit-lead] Failed to trigger drip:",a))}return u.NextResponse.json({success:!0,...j,leadId:j.leadId})}catch(a){return console.error("[v0] Lead submission error:",a),u.NextResponse.json({error:"Internal server error"},{status:500})}}let K=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/submit-lead/route",pathname:"/api/submit-lead",filename:"route",bundlePath:"app/api/submit-lead/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/vercel/share/v0-project/app/api/submit-lead/route.ts",nextConfigOutput:"",userland:d}),{workAsyncStorage:L,workUnitAsyncStorage:M,serverHooks:N}=K;function O(){return(0,g.patchFetch)({workAsyncStorage:L,workUnitAsyncStorage:M})}async function P(a,b,c){var d;let e="/api/submit-lead/route";"/index"===e&&(e="/");let g=await K.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,resolvedPathname:C}=g,D=(0,j.normalizeAppPath)(e),E=!!(y.dynamicRoutes[D]||y.routes[C]);if(E&&!x){let a=!!y.routes[C],b=y.dynamicRoutes[D];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let F=null;!E||K.isDev||x||(F="/index"===(F=C)?"/":F);let G=!0===K.isDev||!E,H=E&&!G,I=a.method||"GET",J=(0,i.getTracer)(),L=J.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:G,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:H,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>K.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>K.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=J.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${I} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${I} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&A&&B&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!E)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await K.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})},z),b}},l=await K.handleResponse({req:a,nextConfig:w,cacheKey:F,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:A,revalidateOnlyGenerated:B,responseGenerator:k,waitUntil:c.waitUntil});if(!E)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",A?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&E||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await J.withPropagatedContext(a.headers,()=>J.trace(m.BaseServerSpan.handleRequest,{spanName:`${I} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":I,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await K.onRequestError(a,b,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:H,isOnDemandRevalidate:A})}),E)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},99919:(a,b,c)=>{"use strict";c.d(b,{F1:()=>o,MD:()=>n,UI:()=>m,Vc:()=>l});let d=process.env.NEXT_PUBLIC_BASE_URL??"https://agencyappraiser.com",e=process.env.RESEND_FROM_EMAIL?`Agency Appraiser <${process.env.RESEND_FROM_EMAIL}>`:"Agency Appraiser <onboarding@resend.dev>",f="#0ea5e9",g="#0f172a",h="#64748b",i="#f8fafc",j="#e2e8f0";function k(a,b=""){return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agency Appraiser</title>
</head>
<body style="margin:0;padding:0;background:${i};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  ${b?`<div style="display:none;max-height:0;overflow:hidden;color:${i};">${b}</div>`:""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${i};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${g};border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Agency Appraiser</span>
            <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;letter-spacing:0.5px;text-transform:uppercase;">Independent Agency Valuation</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px 32px 24px;border-left:1px solid ${j};border-right:1px solid ${j};">
            ${a}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${i};border:1px solid ${j};border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:${h};">
              Agency Appraiser &mdash; Independent Insurance Agency Valuation Tool<br/>
              <a href="${d}" style="color:${f};text-decoration:none;">${d}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`}function l(a){let b=a.estimatedValue?`$${Number(a.estimatedValue).toLocaleString()}`:"Not calculated";return{from:e,html:k(`
    <div style="display:inline-block;background:${f}22;border:1px solid ${f}44;border-radius:20px;padding:4px 12px;font-size:12px;color:${f};font-weight:600;margin-bottom:16px;">
      NEW LEAD
    </div>
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;color:${g};">${a.leadName}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${h};">${a.agencyName||"Independent Agency"} &mdash; via ${a.toolUsed}</p>

    <!-- Value highlight -->
    <div style="background:linear-gradient(135deg,#0ea5e922,#0ea5e911);border:1px solid #0ea5e933;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:13px;color:${h};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Estimated Agency Value</div>
      <div style="font-size:36px;font-weight:800;color:${f};">${b}</div>
    </div>

    <!-- Contact info -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:10px 14px;background:${i};border:1px solid ${j};border-radius:6px 6px 0 0;display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:${h};font-weight:500;">Email</span>
          <span style="font-size:13px;color:${g};font-weight:600;">${a.leadEmail}</span>
        </td>
      </tr>
      <tr><td height="2"></td></tr>
      <tr>
        <td style="padding:10px 14px;background:${i};border:1px solid ${j};border-radius:0;display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:${h};font-weight:500;">Phone</span>
          <span style="font-size:13px;color:${g};font-weight:600;">${a.leadPhone||"Not provided"}</span>
        </td>
      </tr>
      <tr><td height="2"></td></tr>
      <tr>
        <td style="padding:10px 14px;background:${i};border:1px solid ${j};border-radius:0 0 6px 6px;display:flex;justify-content:space-between;">
          <span style="font-size:13px;color:${h};font-weight:500;">Agency</span>
          <span style="font-size:13px;color:${g};font-weight:600;">${a.agencyName||"Not provided"}</span>
        </td>
      </tr>
    </table>

    ${a.valuationSummary?`
    <div style="background:${i};border:1px solid ${j};border-left:3px solid ${f};border-radius:6px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:${h};text-transform:uppercase;letter-spacing:0.5px;">Valuation Summary</p>
      <p style="margin:0;font-size:13px;color:${g};line-height:1.6;white-space:pre-wrap;">${a.valuationSummary}</p>
    </div>`:""}

    <a href="mailto:${a.leadEmail}?subject=Your Agency Valuation - Agency Appraiser" 
       style="display:block;text-align:center;background:${f};color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">
      Reply to ${a.leadName}
    </a>

    <p style="margin:16px 0 0;font-size:12px;color:${h};text-align:center;">
      Submitted ${new Date().toLocaleString("en-US",{timeZone:"America/New_York",dateStyle:"medium",timeStyle:"short"})} ET
    </p>
  `,`New lead: ${a.leadName} from ${a.agencyName||"unknown agency"} — ${b}`),subject:`New Lead: ${a.leadName} — ${b}`}}function m(a){let b=a.estimatedValue?`$${Number(a.estimatedValue).toLocaleString()}`:null,c=`${d}/api/unsubscribe?lead=${a.leadId}&seq=all`;return{from:e,html:k(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${g};">Hi ${a.firstName},</h1>
    <p style="margin:0 0 24px;font-size:16px;color:${h};line-height:1.6;">
      Thanks for using Agency Appraiser. Your valuation request has been received and one of our team members will be in touch shortly.
    </p>

    ${b?`
    <div style="background:linear-gradient(135deg,#0ea5e922,#0ea5e911);border:1px solid #0ea5e933;border-radius:10px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:13px;color:${h};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Your Estimated Agency Value</div>
      <div style="font-size:40px;font-weight:800;color:${f};line-height:1;">${b}</div>
      ${a.agencyName?`<div style="margin-top:8px;font-size:13px;color:${h};">${a.agencyName}</div>`:""}
    </div>`:""}

    ${a.valuationSummary?`
    <div style="background:${i};border:1px solid ${j};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:${h};text-transform:uppercase;letter-spacing:0.5px;">Valuation Breakdown</p>
      <p style="margin:0;font-size:14px;color:${g};line-height:1.7;white-space:pre-wrap;">${a.valuationSummary}</p>
    </div>`:""}

    <div style="border-top:1px solid ${j};margin:24px 0;"></div>

    <h2 style="margin:0 0 12px;font-size:17px;font-weight:700;color:${g};">What happens next?</h2>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="width:32px;vertical-align:top;padding-top:2px;">
          <div style="width:24px;height:24px;background:${f};border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">1</div>
        </td>
        <td style="padding:0 0 16px 12px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${g};">We review your valuation</p>
          <p style="margin:4px 0 0;font-size:13px;color:${h};">Our team looks at your inputs and compares against recent comparable agency transactions.</p>
        </td>
      </tr>
      <tr>
        <td style="width:32px;vertical-align:top;padding-top:2px;">
          <div style="width:24px;height:24px;background:${f};border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">2</div>
        </td>
        <td style="padding:0 0 16px 12px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${g};">You receive a detailed breakdown</p>
          <p style="margin:4px 0 0;font-size:13px;color:${h};">We&apos;ll send you a more detailed analysis including what drives value in your specific agency.</p>
        </td>
      </tr>
      <tr>
        <td style="width:32px;vertical-align:top;padding-top:2px;">
          <div style="width:24px;height:24px;background:${f};border-radius:50%;text-align:center;line-height:24px;font-size:12px;font-weight:700;color:#fff;">3</div>
        </td>
        <td style="padding:0 0 0 12px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${g};">Decide on your next move</p>
          <p style="margin:4px 0 0;font-size:13px;color:${h};">Whether you&apos;re ready to sell now or just exploring, we can help you understand your options.</p>
        </td>
      </tr>
    </table>

    <div style="border-top:1px solid ${j};margin:24px 0;"></div>

    <a href="${d}/calculator"
       style="display:block;text-align:center;background:${f};color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;">
      Run Another Valuation
    </a>

    <p style="margin:24px 0 0;font-size:12px;color:${h};text-align:center;">
      Questions? Reply to this email — we read every one.<br/>
      <a href="${c}" style="color:${h};text-decoration:underline;">Unsubscribe from follow-up emails</a>
    </p>
  `,`Your agency valuation is ready${b?` — ${b}`:""}`),subject:b?`Your Agency Valuation: ${b} — Agency Appraiser`:"Your Agency Appraiser Valuation — Next Steps"}}function n(a){let b=a.estimatedValue?`$${Number(a.estimatedValue).toLocaleString()}`:"your agency",c=`${d}/api/unsubscribe?lead=${a.leadId}&seq=all`;return{from:e,html:k(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${g};">What actually drives your agency&apos;s value?</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${h};line-height:1.6;">
      Hi ${a.firstName} &mdash; following up on your valuation${a.agencyName?` for ${a.agencyName}`:""}.
      Most agency owners are surprised to learn that the number they got (${b}) can swing significantly
      based on just a few key factors.
    </p>

    <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:${g};">The 5 biggest value drivers</h2>

    ${[["Retention Rate","The #1 driver. Every 1% improvement in retention can add 5–10% to your valuation multiple. Agencies above 90% command premium prices."],["Revenue Mix (PL vs CL)","Commercial lines are valued higher — typically 1.8–2.5x revenue vs 1.2–1.8x for personal lines. A shift toward CL meaningfully increases value."],["Owner Dependency","Buyers discount agencies heavily if revenue walks out the door when the owner does. Documented processes and delegated relationships are worth real money."],["Carrier Diversification","Concentration with a single carrier is a risk flag. Spread across 5+ carriers with no single carrier above 30% of premium is ideal."],["Growth Trend","A flat book sells at a discount. Consistent 5–10% annual growth signals a healthy operation and justifies higher multiples."]].map(([a,b],c)=>`
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="width:36px;vertical-align:top;">
          <div style="width:28px;height:28px;background:${f}22;border:1px solid ${f}44;border-radius:8px;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:${f};">${c+1}</div>
        </td>
        <td style="padding-left:12px;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:700;color:${g};">${a}</p>
          <p style="margin:0;font-size:13px;color:${h};line-height:1.5;">${b}</p>
        </td>
      </tr>
    </table>`).join("")}

    <div style="background:${i};border:1px solid ${j};border-left:3px solid ${f};border-radius:6px;padding:16px;margin:24px 0;">
      <p style="margin:0;font-size:14px;color:${g};line-height:1.6;">
        <strong>Want a more precise valuation?</strong> The full calculator lets you model different scenarios —
        see exactly how improving retention or growing commercial lines affects your final number.
      </p>
    </div>

    <a href="${d}/calculator"
       style="display:block;text-align:center;background:${f};color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;margin-bottom:24px;">
      Try the Full Valuation Calculator
    </a>

    <p style="margin:0;font-size:12px;color:${h};text-align:center;">
      <a href="${c}" style="color:${h};text-decoration:underline;">Unsubscribe from follow-up emails</a>
    </p>
  `,"The 5 factors that move your agency valuation the most"),subject:`What moves your agency value — and what doesn&apos;t`}}function o(a){let b=a.estimatedValue?`$${Number(a.estimatedValue).toLocaleString()}`:"your agency",c=`${d}/api/unsubscribe?lead=${a.leadId}&seq=all`;return{from:e,html:k(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:${g};">Ready to explore your options?</h1>
    <p style="margin:0 0 24px;font-size:15px;color:${h};line-height:1.6;">
      Hi ${a.firstName} &mdash; this is my last follow-up. I just wanted to make sure you have everything you need
      to make a confident decision about ${a.agencyName?a.agencyName:"your agency"}${a.estimatedValue?`, which we estimated at ${b}`:""}.
    </p>

    <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:${g};">What can we help you with?</h2>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${[["I&apos;m ready to sell","Let&apos;s talk about timing, buyer types, and how to maximize your sale price.",`${d}/calculator`],["I want to grow value first","We can walk through the 3–5 changes that would move the needle most before a sale.",`${d}/calculator`],["I&apos;m just exploring","No pressure — run as many valuations as you like. The tool is always free.",`${d}/quick-value`]].map(([a,b,c])=>`
      <tr>
        <td style="padding-bottom:10px;">
          <a href="${c}" style="display:block;padding:16px;background:${i};border:1px solid ${j};border-radius:8px;text-decoration:none;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:${f};">${a} &rarr;</p>
            <p style="margin:0;font-size:13px;color:${h};">${b}</p>
          </a>
        </td>
      </tr>`).join("")}
    </table>

    <div style="border-top:1px solid ${j};margin:16px 0 24px;"></div>
    <p style="margin:0;font-size:14px;color:${h};line-height:1.6;text-align:center;">
      Or just reply to this email — I&apos;m happy to answer any questions personally.<br/>
      &mdash; The Agency Appraiser Team
    </p>

    <p style="margin:24px 0 0;font-size:12px;color:${h};text-align:center;">
      <a href="${c}" style="color:${h};text-decoration:underline;">Unsubscribe from follow-up emails</a>
    </p>
  `,`Ready to explore your options for ${a.agencyName||"your agency"}?`),subject:"One last thing about your agency valuation"}}}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[1035,1884,2187],()=>b(b.s=86840));module.exports=c})();