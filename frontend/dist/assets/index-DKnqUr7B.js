(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))o(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const n of t.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&o(n)}).observe(document,{childList:!0,subtree:!0});function i(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function o(e){if(e.ep)return;e.ep=!0;const t=i(e);fetch(e.href,t)}})();document.querySelector("#app").innerHTML=`
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Hackcrux</p>
      <h1>Vite frontend is ready.</h1>
      <p class="lead">
        This frontend is now running on Vite and ready for your UI components,
        API integration, and build pipeline.
      </p>
      <div class="actions">
        <a class="button primary" href="http://localhost:8080/api/health" target="_blank" rel="noreferrer">Check backend</a>
        <button class="button secondary" id="ping-button" type="button">Test frontend</button>
      </div>
      <p class="status" id="status">Frontend loaded successfully.</p>
    </section>
  </main>
`;const s=document.querySelector("#status"),c=document.querySelector("#ping-button");c?.addEventListener("click",()=>{s&&(s.textContent="Vite is serving this frontend correctly.")});
