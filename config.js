/* Chave PÚBLICA do Cloudflare Turnstile (site key). Enquanto estiver vazia, o login funciona sem CAPTCHA. */
window.TURNSTILE_SITE_KEY='0x4AAAAAAGQN8Kxfc8Ze662f';
/* Tema visual "Âmbar" (só aparência). Para voltar ao visual anterior, apague as duas linhas abaixo. */
document.write('<link rel="stylesheet" href="tema.css?v=2">');
(function(){var m=document.querySelector('meta[name="theme-color"]');if(!m||!window.matchMedia)return;var d=matchMedia('(prefers-color-scheme: dark)'),s=function(){m.setAttribute('content',d.matches?'#16120f':'#f6f1ea')};s();if(d.addEventListener)d.addEventListener('change',s)})();
