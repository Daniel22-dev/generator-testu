
(function(){
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function(){
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if (reloading) return;
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker.register('./sw.js').then(function(reg){
      try { reg.update(); } catch (e) {}
    }).catch(function(err){
      console.warn('PWA service worker registration failed:', err);
    });
  });
})();
