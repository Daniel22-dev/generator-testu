// P3 lazy loader: preview and visual editor stay outside the initial HTML payload.
function openTestPreview(){
  return ghrabGeneratorFeatureLoader('previewEditor','./features/preview-editor.js')
    .then(function(api){ return api.openPreview(); })
    .catch(function(error){ try{ uiAlert('N\u00e1hled se nepoda\u0159ilo na\u010d\u00edst: '+error.message); }catch(_){} });
}
function openTestEditor(){
  return ghrabGeneratorFeatureLoader('previewEditor','./features/preview-editor.js')
    .then(function(api){ return api.openEditor(); })
    .catch(function(error){ try{ uiAlert('Editor se nepoda\u0159ilo na\u010d\u00edst: '+error.message); }catch(_){} });
}
function enrichAltAnswers(){
  return ghrabGeneratorFeatureLoader('previewEditor','./features/preview-editor.js')
    .then(function(api){ return api.enrichAnswers(); })
    .catch(function(error){ try{ uiAlert('Roz\u0161\u00ed\u0159en\u00ed odpov\u011bd\u00ed se nepoda\u0159ilo na\u010d\u00edst: '+error.message); }catch(_){} });
}
