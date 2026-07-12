/* Skin switcher — 7 skins (A–G), persisted across the 4 layout pages via localStorage.
   Mockup-only tooling: the real center ships ONE skin (the operator's final pick). */
(function(){
  var SKINS = [
    ['b','Console·light'],['e','Glass'],['f','Blueprint'],['g','PixelConsole'],['j','StationCard']
  ];
  var root = document.documentElement, body = document.body;
  var saved = null;
  try { saved = localStorage.getItem('center-skin'); } catch(e){}
  var valid = SKINS.map(function(s){return s[0]});
  var current = (saved && valid.indexOf(saved) >= 0) ? saved : 'j';

  var bar = document.createElement('div');
  bar.setAttribute('style',
    'position:fixed;top:8px;right:10px;z-index:99;display:flex;gap:4px;align-items:center;'+
    'background:rgba(127,127,127,.14);backdrop-filter:blur(6px);border-radius:10px;padding:4px 6px;'+
    'font:11px/1 ui-monospace,monospace');
  var label = document.createElement('span');
  label.setAttribute('style','opacity:.75;margin-right:2px;font-weight:700');
  bar.appendChild(label);
  var btns = {};
  SKINS.forEach(function(s){
    var b = document.createElement('button');
    b.textContent = s[0].toUpperCase();
    b.title = s[1];
    b.setAttribute('style',
      'width:24px;height:24px;border-radius:6px;border:1.5px solid rgba(127,127,127,.55);'+
      'cursor:pointer;font:inherit;font-weight:800;background:transparent;color:inherit');
    b.onclick = function(){ set(s[0]); };
    btns[s[0]] = b;
    bar.appendChild(b);
  });
  document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(bar); });
  if (document.body) document.body.appendChild(bar);

  function set(k){
    current = k;
    root.setAttribute('data-skin', k);
    if (document.body) document.body.setAttribute('data-skin', k);
    try { localStorage.setItem('center-skin', k); } catch(e){}
    var name = '';
    SKINS.forEach(function(s){
      var on = s[0] === k;
      if (on) name = s[1];
      btns[s[0]].style.background = on ? 'rgba(127,127,127,.85)' : 'transparent';
      btns[s[0]].style.color = on ? '#fff' : 'inherit';
    });
    label.textContent = 'skin: ' + name + (k === 'j' ? ' ★ FINAL' : '');
  }
  set(current);
})();
