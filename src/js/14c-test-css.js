// ─── Test CSS ──────────────────────────────────────────────────────────────────

function getTestBaseCSS() {
  return '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{font-size:16px}' +
'body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;padding:0 0 env(safe-area-inset-bottom,20px)}' +
'.hidden{display:none!important}.screen{padding:0}' +
/* Intro */
'.intro-card{max-width:560px;margin:0 auto;padding:24px 16px}' +
'.test-title{font-size:24px;font-weight:700;line-height:1.2;margin-bottom:4px}' +
'.test-sub{font-size:14px;color:var(--muted);margin-bottom:2px}' +
'.test-id-lbl{font-size:11px;color:var(--muted);font-family:monospace;margin-bottom:18px}' +
'.ex-ov{border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px}' +
'.ex-ov-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)}' +
'.ex-num-badge{background:var(--accent);color:#fff;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}' +
'.ex-ov-name{flex:1;font-size:14px}.ex-ov-pts{font-size:13px;color:var(--muted)}' +
'.ex-ov-total{display:flex;justify-content:space-between;padding:10px 14px;background:var(--card2);font-size:13px;font-weight:600}' +
'.cs-test-note{background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.45);border-radius:12px;padding:10px 12px;margin:12px 0 14px;font-size:13px;line-height:1.55;color:var(--text)}.cs-test-note strong{color:var(--accent)}' +
'.rules-box{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px}' +
'.rules-ttl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:8px}' +
'.rules-list{padding-left:16px;font-size:14px;line-height:1.9}' +
'.name-lbl{display:block;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}' +
'.name-inp{width:100%;padding:14px 12px;border:2px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:16px;margin-bottom:12px;outline:none;transition:border-color .15s;-webkit-appearance:none}' +
'.name-inp:focus{border-color:var(--accent)}' +
'.btn-start{width:100%;padding:16px;border:none;border-radius:12px;background:var(--accent);color:#fff;font-size:17px;font-weight:700;cursor:pointer;min-height:52px;margin-bottom:10px;transition:filter .15s}' +
'.btn-start:active{filter:brightness(.9)}' +
'.btn-teacher-lnk{width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--muted);font-size:14px;cursor:pointer;min-height:44px}' +
'.btn-fullscreen{width:100%;padding:13px;border:1.5px solid var(--border);border-radius:10px;background:transparent;color:var(--muted);font-size:14px;cursor:pointer;min-height:46px;margin-bottom:10px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:inherit}' +
'.fs-ico{display:inline-block;width:15px;height:15px;position:relative;flex-shrink:0}' +
'.fs-ico::before,.fs-ico::after{content:"";position:absolute;width:5px;height:5px;border-color:currentColor;border-style:solid}' +
'.fs-ico::before{top:0;left:0;border-width:2px 0 0 2px}' +
'.fs-ico::after{bottom:0;right:0;border-width:0 2px 2px 0}' +
/* Header */
'.t-header{position:sticky;top:0;z-index:10;background:var(--accent);color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-radius:0 0 14px 14px;box-shadow:0 2px 12px rgba(0,0,0,.2)}' +
'.t-header-title{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55%}' +
'.t-header-right{display:flex;align-items:center;gap:8px;flex-shrink:0}' +
'.timer-badge{font-size:16px;font-weight:700;font-family:monospace;background:rgba(255,255,255,.2);padding:4px 8px;border-radius:6px;min-width:54px;text-align:center}' +
'.timer-badge.t-warn{background:rgba(255,200,0,.35)}.timer-badge.t-danger{background:rgba(255,60,60,.45);animation:pulse 1s infinite}' +
'@keyframes pulse{50%{opacity:.6}}' +
'.a11y-note{position:sticky;top:0;z-index:24;margin:8px auto;max-width:720px;padding:7px 12px;border:2px solid var(--acc-b);border-radius:12px;background:var(--acc-d);color:var(--acc);font-weight:800;text-align:center;font-size:13px}' +
'body.a11y-large #exArea{font-size:19px}body.a11y-xlarge #exArea{font-size:22px}' +
'body.a11y-large #exArea input,body.a11y-large #exArea textarea,body.a11y-large #exArea button,body.a11y-large #exArea .opt,body.a11y-large #exArea .mc-opt,body.a11y-xlarge #exArea input,body.a11y-xlarge #exArea textarea,body.a11y-xlarge #exArea button,body.a11y-xlarge #exArea .opt,body.a11y-xlarge #exArea .mc-opt{font-size:1em}' +
'body.a11y-dys #exArea{font-family:Verdana,Tahoma,sans-serif;letter-spacing:.05em;word-spacing:.14em;line-height:1.95;text-align:left}body.a11y-dys #exArea .opt,body.a11y-dys #exArea .mc-opt,body.a11y-dys #exArea .question,body.a11y-dys #exArea p{line-height:1.95}' +
'.prog-badge{font-size:13px;background:rgba(255,255,255,.15);padding:4px 8px;border-radius:6px}' +
/* Tabs */
'.tabs-nav{display:flex;gap:6px;padding:10px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch;background:var(--card);border-bottom:1px solid var(--border);scrollbar-width:none}' +
'.tabs-nav::-webkit-scrollbar{display:none}' +
'.tab-btn{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--muted);font-size:12px;cursor:pointer;min-height:44px;min-width:58px;transition:all .15s}' +
'.tab-btn.tab-active{border-color:var(--accent);color:var(--accent)}' +
'.tab-name{font-size:10px;white-space:nowrap}.tab-done{color:var(--ok);font-size:10px}' +
/* Exercise area */
'.ex-area{padding:12px;max-width:720px;margin:0 auto}' +
'.ex-hdr{margin-bottom:16px;padding:12px 14px;background:var(--card);border-radius:12px;border:1px solid var(--border)}' +
'.ex-hdr-num{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);display:block;margin-bottom:2px}' +
'.ex-hdr-title{font-size:17px;font-weight:700;display:block;margin-bottom:4px}' +
'.ex-hdr-pts{font-size:12px;color:var(--muted)}' +
'.q-list{display:flex;flex-direction:column;gap:14px;margin-bottom:16px}' +
'.question{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:14px;position:relative}' +
'.question.joker-used{opacity:.65;border-style:dashed}' +
'.q-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}' +
'.q-num{width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0}' +
'.q-pts{font-size:11px;color:var(--muted)}.q-text{font-size:15px;line-height:1.5;margin-bottom:12px}' +
/* MC */
'.mc-opts{display:flex;flex-direction:column;gap:8px}' +
'.mc-opt{display:flex;align-items:center;gap:10px;padding:12px 14px;border:2px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:15px;cursor:pointer;text-align:left;min-height:48px;transition:all .12s;-webkit-tap-highlight-color:transparent;width:100%}' +
'.mc-opt:active{transform:scale(.98)}.mc-opt.mc-sel{border-color:var(--accent);background:var(--accent-bg);color:var(--accent)}' +
'.opt-ltr{font-weight:700;min-width:20px;color:var(--muted)}.mc-opt.mc-sel .opt-ltr{color:var(--accent)}' +
'.mc-opt .ms-box{flex:0 0 auto;width:20px;height:20px;border:2px solid var(--muted);border-radius:5px;position:relative;background:var(--card)}.mc-opt.mc-sel .ms-box{border-color:var(--accent);background:var(--accent)}.mc-opt.mc-sel .ms-box::after{content:"";position:absolute;left:5px;top:1px;width:6px;height:11px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}.ms-hint{font-size:12.5px;color:var(--muted);margin:6px 0}.ord-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.ord-row{display:flex;align-items:center;gap:12px;border:2px solid var(--border);border-radius:10px;padding:10px 14px;background:var(--card);color:var(--text);cursor:pointer;transition:border-color .15s,background .15s;user-select:none}.ord-row:hover{border-color:var(--accent);background:var(--card2)}.ord-row.ord-picked{border-color:var(--accent);background:var(--card2)}.ord-badge{flex-shrink:0;width:32px;height:32px;border-radius:50%;border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;color:var(--muted);background:var(--card2);transition:all .15s}.ord-row.ord-picked .ord-badge{background:var(--accent);border-color:var(--accent);color:#fff}.ord-txt{flex:1;text-align:left}.ord-hint{font-size:12px;color:var(--muted);margin-top:6px}.cb-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.cb-row{display:flex;flex-direction:column;gap:6px;border:2px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--card);color:var(--text)}.cb-txt{font-weight:600;text-align:left}.cb-sel{width:100%}.tc-wrap{overflow-x:auto;margin-top:10px;border:1px solid var(--border);border-radius:12px}.tc-table{width:100%;min-width:520px;border-collapse:collapse;background:var(--card)}.tc-table th,.tc-table td{border-bottom:1px solid var(--border);border-right:1px solid var(--border);padding:8px 10px;text-align:left;vertical-align:middle}.tc-table th{background:var(--card2);color:var(--text);font-size:13px}.tc-table td:last-child,.tc-table th:last-child{border-right:0}.tc-fixed{font-weight:700;color:var(--text)}.tc-inp{min-width:110px}.trch-base{margin:9px 0;padding:10px 12px;border-left:4px solid var(--accent);background:var(--card2);border-radius:10px;font-weight:800;color:var(--text)}.trch-list{display:flex;flex-direction:column;gap:9px;margin-top:10px}.trch-row{border:2px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--card);color:var(--text)}.trch-instr{font-weight:700;margin-bottom:6px}.trch-inp{width:100%}.he-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}.he-sent{align-items:flex-start;line-height:1.55;white-space:normal}.he-sent .opt-txt{text-align:left}' +
'.opt-txt{flex:1}' +
/* FiB */
'.fib-sent{font-size:15px;line-height:2.4}' +
'.fib-inp{border:none;border-bottom:2px solid var(--accent);background:transparent;color:var(--text);font-size:15px;padding:0 4px;min-width:80px;max-width:160px;outline:none;text-align:center;vertical-align:middle}' +
/* TF */
'.tf-opts{display:flex;gap:10px}' +
'.tf-btn{flex:1;padding:14px;border:2px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:15px;font-weight:600;cursor:pointer;min-height:48px;transition:all .12s}' +
'.tf-btn.tf-sel{border-color:var(--accent);background:var(--accent-bg);color:var(--accent)}' +
/* Matching */
'.match-grid{display:flex;flex-direction:column;gap:8px}' +
'.match-row{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center}' +
'.match-left{padding:10px 12px;background:var(--card2);border:1px solid var(--border);border-radius:8px;font-size:14px;min-height:44px;display:flex;align-items:center}' +
'.match-sel{padding:10px 8px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:14px;min-height:44px;cursor:pointer;-webkit-appearance:auto;width:100%}' +
'.match-sel:focus{border-color:var(--accent);outline:none}' +
/* Err / Open */
'.err-sent{font-style:italic;margin-bottom:8px;padding:8px;background:var(--card2);border-radius:6px}' +
'.err-lbl{font-size:12px;color:var(--muted);margin-bottom:6px}' +
'.err-inp,.open-inp{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:15px;outline:none;-webkit-appearance:none}' +
'.err-inp:focus,.open-inp:focus{border-color:var(--accent)}' +
'.open-inp{resize:vertical;min-height:80px;font-family:inherit}' +
/* Joker */
'.joker-choice{border:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 8%,transparent);border-radius:14px;padding:12px;margin:14px 0}' +
'.joker-choice-title{font-weight:800;color:var(--accent);margin-bottom:4px}.joker-choice-hint{font-size:12px;color:var(--muted);line-height:1.45;margin-bottom:10px}' +
'.joker-choice-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.joker-choice-btn{padding:12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-weight:700;cursor:pointer;min-height:46px}.joker-choice-btn.selected{border-color:var(--accent);background:var(--accent);color:#fff}.joker-choice-btn.selected::before{content:"✓ "}.joker-choice-risk.selected{box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 25%,transparent)}.joker-choice-confirm{margin-top:10px;padding:10px 12px;border-radius:10px;font-weight:800;text-align:center;font-size:14px}.joker-choice-confirm-ok{background:color-mix(in srgb,#16a34a 15%,var(--card));color:#16a34a;border:2px solid #16a34a}.joker-choice-confirm-risk{background:color-mix(in srgb,#f59e0b 15%,var(--card));color:#b45309;border:2px solid #f59e0b}' +
'.joker-watermark{position:sticky;top:58px;z-index:25;margin:8px auto;max-width:720px;padding:8px 12px;border:2px dashed var(--accent);border-radius:12px;background:color-mix(in srgb,var(--accent) 12%,var(--card));color:var(--accent);font-weight:900;text-align:center;letter-spacing:.04em}' +
'.practice-note,.cs-fb{margin-top:8px;border-left:4px solid var(--accent);background:var(--accent-bg);border-radius:10px;padding:9px 11px;font-size:13px;line-height:1.55;color:var(--text)}.cs-fb div+div{margin-top:3px}.cs-fb-ok{border-left-color:var(--ok);background:var(--ok-bg)}.cs-fb-bad{border-left-color:#ef4444;background:#fff1f2}.ap-feedback{margin-top:6px;border-radius:8px;padding:6px 8px;font-size:13px}.ap-ok{background:var(--ok-bg);color:var(--ok)}.ap-bad{background:#fff1f2;color:#991b1b}.ex-feedback-list{margin-top:8px;display:flex;flex-direction:column;gap:7px}.ex-feedback-item{border-top:1px solid var(--border);padding-top:7px}' +
'.joker-mode .ex-panel{position:relative}.joker-mode .ex-panel::after{content:"ŽOLÍK";position:absolute;right:18px;bottom:12px;font-size:36px;font-weight:900;color:var(--accent);opacity:.08;pointer-events:none;transform:rotate(-12deg)}.joker-mode .practice-note{display:none!important}' +
'.joker-result-box{border:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--card));color:var(--accent);border-radius:14px;padding:10px;margin:12px 0;font-size:16px;font-weight:900;text-align:center;letter-spacing:.04em}' +
'.report-seal-box{border:1.5px solid var(--border);background:var(--card2);border-radius:12px;padding:10px;margin:12px 0;text-align:center}.report-seal-label{font-size:11px;color:var(--muted);text-transform:uppercase;font-weight:800;letter-spacing:.06em}.report-seal-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:900;color:var(--accent);margin:4px 0}.report-seal-hint{font-size:11px;color:var(--muted);line-height:1.35}' +
/* Ex nav */
'.ex-nav{display:flex;justify-content:space-between;gap:10px;margin-top:16px}' +
'.btn-ex-nav{flex:1;padding:12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--muted);font-size:14px;cursor:pointer;min-height:44px}' +
'.btn-ex-nav-primary{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}' +
/* Submit */
'.submit-row{padding:12px;max-width:720px;margin:0 auto}' +
'.btn-submit{width:100%;padding:16px;border:none;border-radius:12px;background:var(--ok);color:#fff;font-size:17px;font-weight:700;cursor:pointer;min-height:52px;transition:filter .15s}' +
'.btn-submit:active{filter:brightness(.9)}' +
/* Result */
'.result-card{max-width:480px;margin:0 auto;padding:24px 16px}' +
'.result-details{max-width:480px;margin:16px auto 0}' +
'.result-grade-row{text-align:center;margin-bottom:8px}' +
'.result-grade-big{font-size:72px;font-weight:900;color:var(--accent);line-height:1}' +
'.result-name{text-align:center;font-size:20px;font-weight:700;margin-bottom:4px}' +
'.result-meta{text-align:center;font-size:11px;color:var(--muted);font-family:monospace;margin-bottom:16px}' +
'.result-score-row{display:flex;justify-content:center;align-items:baseline;gap:14px;margin-bottom:16px}' +
'.result-pct{font-size:40px;font-weight:700;color:var(--ok)}.result-pts{font-size:16px;color:var(--muted)}' +
'.result-breakdown{border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px}' +
'.bdown-row{display:flex;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);font-size:14px}' +
'.bdown-row:last-child{border-bottom:none}' +
'.verify-section{border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px}' +
'.btn-dl-txt{width:100%;padding:12px;border:1.5px solid var(--accent);border-radius:8px;background:transparent;color:var(--accent);font-size:14px;font-weight:600;cursor:pointer;min-height:44px;margin-bottom:8px}' +
'.verify-hint{font-size:12px;color:var(--muted);margin-bottom:8px}' +
'.security-summary{font-size:12px;color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin-bottom:12px}' +
'.verify-backup summary{font-size:12px;color:var(--muted);cursor:pointer;margin-bottom:6px}' +
'.verify-ta{width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--text);font-size:11px;font-family:monospace;resize:none;margin-bottom:6px;margin-top:6px}' +
'.btn-copy-verify{padding:6px 14px;border:1px solid var(--border);border-radius:6px;background:var(--card);color:var(--muted);font-size:12px;cursor:pointer}' +
'.result-actions{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}' +
'.btn-toggle-ans,.btn-teacher-lnk{padding:12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--muted);font-size:14px;cursor:pointer;min-height:44px;width:100%}' +
'.ans-panel{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:8px}' +
'.ap-sec{margin-bottom:12px}.ap-ex-title{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin-bottom:6px}' +
'.ap-item{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:14px}' +
'.ap-item:last-child{border-bottom:none}.ap-q{color:var(--muted);min-width:50px}.ap-a{flex:1}' +
/* Modals */
'.modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:env(safe-area-inset-top,20px) 16px 20px;z-index:100;overflow-y:auto}' +
'.modal-box{background:var(--card);border-radius:16px;padding:20px;width:100%;max-width:380px;margin-top:40px}' +
'.modal-title{font-size:18px;font-weight:700;margin-bottom:14px}' +
'.modal-body{font-size:15px;line-height:1.5;margin-bottom:16px}' +
'.modal-btn-row{display:flex;flex-direction:column;gap:8px}' +
'.btn-modal-ok{padding:14px;border:none;border-radius:10px;background:var(--accent);color:#fff;font-size:15px;font-weight:700;cursor:pointer;min-height:48px;width:100%}' +
'.btn-modal-cancel{padding:12px;border:1.5px solid var(--border);border-radius:10px;background:var(--card);color:var(--muted);font-size:15px;cursor:pointer;min-height:44px;width:100%}' +
/* Teacher */
'.teacher-box{max-width:500px}.modal-inp{width:100%;padding:12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:15px;margin-bottom:10px;outline:none;-webkit-appearance:none;display:block}' +
'.modal-inp:focus{border-color:var(--accent)}' +
'.t-err{font-size:13px;color:#ef4444;margin-bottom:10px;padding:8px 10px;background:rgba(239,68,68,.1);border-radius:6px}' +
'.t-summary{border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px}' +
'.t-row{font-size:14px;padding:4px 0;border-bottom:1px solid var(--border)}.t-row:last-child{border-bottom:none}' +
'.t-sec-title{font-size:11px;font-weight:700;text-transform:uppercase;color:var(--muted);margin:12px 0 6px}' +
'.t-ex-sec{margin-bottom:16px}.t-ex-title{font-size:14px;font-weight:700;margin-bottom:8px}' +
'.t-item.teacher-review-card{background:var(--card);border:1.5px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:6px}' +
'.t-qnum{font-size:12px;color:var(--muted)}.t-qtext{font-size:12px;color:var(--muted);margin:2px 0}' +
'.t-correct{color:var(--ok);font-weight:600;font-size:14px;margin-top:4px}' +
'.t-expl{color:var(--muted);font-size:12px;margin-top:3px;font-style:italic}' +
'.t-left{font-size:14px;margin-bottom:3px}.t-right{color:var(--ok);font-weight:600;font-size:14px}' +
/* Lock */
'.lock-ov{position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}' +
'.lock-card{background:var(--card);border-radius:16px;padding:24px;max-width:340px;width:100%;text-align:center}' +
'.lock-icon{font-size:48px;margin-bottom:12px}.lock-title{font-size:20px;font-weight:700;margin-bottom:8px}' +
'.lock-reason{font-size:14px;color:var(--muted);margin-bottom:16px}' +
'.lock-inp{width:100%;padding:12px;border:1.5px solid var(--border);border-radius:8px;background:var(--card);color:var(--text);font-size:15px;margin-bottom:10px;text-align:center;outline:none;-webkit-appearance:none;display:block}';
}

function getThemeVars(tema) {
  var themes = {
    examBlue:   {bg:'#f0f4f8',card:'#ffffff',card2:'#e8f0fb',text:'#1a2332',muted:'#6b7a8d',border:'#dde3ea',accent:'#1a3a6c',accentBg:'rgba(26,58,108,.10)',ok:'#2e7d32',okBg:'rgba(46,125,50,.10)',btnText:'#ffffff',warnBg:'#fff8e1',warnBorder:'#ffc107',warnText:'#7a4a00'},
    dark:       {bg:'#0a0e1a',card:'#0d1226',card2:'#121a33',text:'#e8f6ff',muted:'#8fb3c7',border:'rgba(0,245,255,.22)',accent:'#00f5ff',accentBg:'rgba(0,245,255,.12)',ok:'#10b981',okBg:'rgba(16,185,129,.12)',btnText:'#07111f',warnBg:'rgba(255,184,77,.12)',warnBorder:'rgba(255,184,77,.45)',warnText:'#ffd28a'},
    modern:     {bg:'#f8faff',card:'#ffffff',card2:'#f0f4ff',text:'#1a1c2e',muted:'#6b7280',border:'#e5e7eb',accent:'#6366f1',accentBg:'rgba(99,102,241,.08)',ok:'#10b981',okBg:'rgba(16,185,129,.08)',btnText:'#ffffff',warnBg:'#fff7ed',warnBorder:'#fed7aa',warnText:'#9a3412'},
    nature:     {bg:'#f0f7f0',card:'#ffffff',card2:'#e8f4e8',text:'#1a2e1a',muted:'#5a7a5a',border:'#c8dfc8',accent:'#2d8a2d',accentBg:'rgba(45,138,45,.08)',ok:'#10b981',okBg:'rgba(16,185,129,.08)',btnText:'#ffffff',warnBg:'#fff7ed',warnBorder:'#fed7aa',warnText:'#9a5a10'},
    akademicky: {bg:'#f8fafc',card:'#ffffff',card2:'#e3f2fd',text:'#1e293b',muted:'#64748b',border:'#e2e8f0',accent:'#1976d2',accentBg:'rgba(25,118,210,.10)',ok:'#16a34a',okBg:'rgba(22,163,74,.10)',btnText:'#ffffff',warnBg:'#fff7ed',warnBorder:'#fed7aa',warnText:'#9a3412'},
    minimal:    {bg:'#ffffff',card:'#f9fafb',card2:'#f3f4f6',text:'#111827',muted:'#6b7280',border:'#e5e7eb',accent:'#111827',accentBg:'rgba(17,24,39,.06)',ok:'#10b981',okBg:'rgba(16,185,129,.08)',btnText:'#ffffff',warnBg:'#fff7ed',warnBorder:'#fed7aa',warnText:'#9a3412'},
    pastel:     {bg:'#fff7ed',card:'#ffffff',card2:'#fef3e2',text:'#1f2937',muted:'#6b7280',border:'#fed7aa',accent:'#fb7185',accentBg:'rgba(251,113,133,.10)',ok:'#22c55e',okBg:'rgba(34,197,94,.08)',btnText:'#ffffff',warnBg:'#fffbeb',warnBorder:'#fde68a',warnText:'#92400e'},
    terakota:   {bg:'#faf4ec',card:'#ffffff',card2:'#f5ede0',text:'#2b211c',muted:'#7a6a60',border:'#ece2d6',accent:'#c75d3c',accentBg:'rgba(199,93,60,.10)',ok:'#2f9e6e',okBg:'rgba(47,158,110,.08)',btnText:'#ffffff',warnBg:'#fff4e8',warnBorder:'#e8b47f',warnText:'#8a4a20'},
  };
  return themes[tema] || themes.modern;
}
function cssRootFromThemeVars(v) {
  return ':root{--bg:'+v.bg+';--card:'+v.card+';--card2:'+v.card2+';--text:'+v.text+';--muted:'+v.muted+';--border:'+v.border+';--accent:'+v.accent+';--accent-bg:'+v.accentBg+';--ok:'+v.ok+';--ok-bg:'+v.okBg+'}';
}
function getTestThemeCSS(tema) {
  return cssRootFromThemeVars(getThemeVars(tema));
}


