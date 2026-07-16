(function(){
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('./sw.js').then(function(reg){
      try { reg.update(); } catch (e) {}
    }).catch(function(err){
      console.warn('PWA service worker registration failed:', err);
    });
  });
})();
