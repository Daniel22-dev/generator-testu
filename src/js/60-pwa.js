(function(){
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', function(){
    // Sandboxed previews may expose the property but deny access to its getter.
    // An offline update can also reject asynchronously after registration succeeded.
    try {
      navigator.serviceWorker.register('./sw.js').then(function(reg){
        try {
          const update=reg.update();
          if(update&&typeof update.catch==='function')update.catch(function(err){console.warn('PWA service worker update unavailable:',err);});
        } catch (e) {}
      }).catch(function(err){
        console.warn('PWA service worker registration failed:', err);
      });
    } catch(err){console.warn('PWA service worker unavailable in this context:',err);}
  });
})();
