const EMBED_VIEWPORT_FIX_STYLE =
  "<style id=\"iis-embed-viewport-fix\">html,body{margin:0!important;width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;overscroll-behavior:none!important;}body{display:block!important;}main,[data-overflow-policy],#root,#app,.app,.runtime-root,.game-root,.stage-shell,.stage,.play-stage,.play-area{width:100%!important;height:100%!important;max-width:none!important;max-height:100%!important;min-height:0!important;margin:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;}canvas#game,canvas{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;aspect-ratio:auto!important;display:block!important;}</style>";

const EMBED_VIEWPORT_FIX_SCRIPT = `<script id="iis-embed-viewport-script">(()=>{
const fit=(el)=>{if(!(el instanceof HTMLElement))return;el.style.minHeight='0';el.style.height='100%';el.style.maxHeight='100%';el.style.overflow='hidden';};
const recoverOverlay=()=>{
  const overlay=document.getElementById('overlay');
  const overlayText=(document.getElementById('overlay-text')?.textContent||'').toLowerCase();
  const shouldRecover=Boolean(overlay&&overlay.classList.contains('show')&&(overlayText.includes('game over')||overlayText.includes('최종')));
  if(!shouldRecover)return;
  overlay.classList.remove('show');
  if(typeof window.restartGame==='function'){try{window.restartGame();}catch(_){}}
  try{window.dispatchEvent(new KeyboardEvent('keydown',{key:'r'}));}catch(_){}
};
const apply=()=>{
  fit(document.documentElement);fit(document.body);
  const game=(document.getElementById('game')||document.querySelector('canvas'));
  if(game instanceof HTMLCanvasElement){
    game.style.width='100%';game.style.height='100%';game.style.maxWidth='100%';game.style.maxHeight='100%';game.style.aspectRatio='auto';
    let node=game.parentElement;let depth=0;while(node&&depth<8){fit(node);node=node.parentElement;depth+=1;}
  }
  const stage=document.querySelector('.stage,.stage-shell,.runtime-root,.game-root,main,[data-overflow-policy],.app,.play-stage');
  fit(stage);
  recoverOverlay();
};
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',apply,{once:true});}else{apply();}
window.addEventListener('resize',apply,{passive:true});
window.addEventListener('message',(event)=>{if(event?.data?.type==='iis:recover:start'){recoverOverlay();apply();}});
})();</script>`;

const LEGACY_THREE_NAMESPACE_REPAIRS: Array<[RegExp, string]> = [
  [/window\.__iis_addon_shims\.MathUtils\b/g, "THREE.MathUtils"],
  [/window\.__iis_addon_shims\.LoaderUtils\b/g, "THREE.LoaderUtils"],
  [/window\.__iis_addon_shims\.AnimationUtils\b/g, "THREE.AnimationUtils"],
  [/window\.__iis_addon_shims\.ShapeUtils\b/g, "THREE.ShapeUtils"],
];

export function patchHtmlForEmbeddedViewport(html: string): string {
  if (!html || html.includes("iis-embed-viewport-fix")) {
    return html;
  }

  let nextHtml = html;
  for (const [pattern, replacement] of LEGACY_THREE_NAMESPACE_REPAIRS) {
    nextHtml = nextHtml.replace(pattern, replacement);
  }
  if (/<\/head>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<\/head>/i, `${EMBED_VIEWPORT_FIX_STYLE}</head>`);
  } else {
    nextHtml = `${EMBED_VIEWPORT_FIX_STYLE}${nextHtml}`;
  }

  if (/<\/body>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<\/body>/i, `${EMBED_VIEWPORT_FIX_SCRIPT}</body>`);
  } else {
    nextHtml = `${nextHtml}${EMBED_VIEWPORT_FIX_SCRIPT}`;
  }
  return nextHtml;
}
