(function(){
  var burger=document.querySelector('.burger'),mnav=document.getElementById('mnav');
  function setMenu(open){
    mnav.classList.toggle('open',open);
    burger.setAttribute('aria-expanded',open?'true':'false');
    burger.setAttribute('aria-label',open?'Закрити меню':'Відкрити меню');
  }
  burger.addEventListener('click',function(){setMenu(burger.getAttribute('aria-expanded')!=='true')});
  mnav.addEventListener('click',function(e){if(e.target.tagName==='A')setMenu(false)});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')setMenu(false)});

  /* reveal on scroll */
  var items=[].slice.call(document.querySelectorAll('.rv'));
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target)}})},{rootMargin:'0px 0px -6% 0px',threshold:.08});
    items.forEach(function(el){io.observe(el)});
  }else{items.forEach(function(el){el.classList.add('in')})}

  /* selection form -> pre-filled mailto */
  var TO='trevent.ua@gmail.com';
  var form=document.getElementById('pickform'),msg=document.getElementById('form-msg');
  var f={what:document.getElementById('f-what'),area:document.getElementById('f-area'),fuel:document.getElementById('f-fuel'),city:document.getElementById('f-city'),phone:document.getElementById('f-phone')};
  function setErr(k,on){f[k].setAttribute('aria-invalid',on?'true':'false');document.getElementById('e-'+k).classList.toggle('on',on)}
  function valid(){
    var ok={};
    ok.what=!!f.what.value;
    var a=parseFloat(f.area.value);ok.area=isFinite(a)&&a>0&&a<=100000;
    ok.fuel=!!f.fuel.value;
    ok.city=f.city.value.trim().length>1;
    ok.phone=f.phone.value.replace(/\D/g,'').length>=9&&/^[\d\s+()\-]+$/.test(f.phone.value.trim());
    return ok;
  }
  Object.keys(f).forEach(function(k){f[k].addEventListener('input',function(){if(f[k].getAttribute('aria-invalid')==='true'){setErr(k,!valid()[k])}})});
  window.openMail=function(href){window.location.href=href};
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var ok=valid(),first=null,all=true;
    ['what','area','fuel','city','phone'].forEach(function(k){setErr(k,!ok[k]);if(!ok[k]){all=false;if(!first)first=f[k]}});
    if(!all){msg.textContent='Заповніть, будь ласка, усі поля.';first.focus();return}
    var body=['Доброго дня!','Прошу підібрати опалювальне обладнання.','',
      'Що опалюю: '+f.what.value,'Площа: '+f.area.value+' м²','Паливо: '+f.fuel.value,'Місто: '+f.city.value.trim(),'Телефон: '+f.phone.value.trim(),'','Дякую.'].join('\r\n');
    var href='mailto:'+TO+'?subject='+encodeURIComponent('Підбір обладнання з сайту Тепломагія')+'&body='+encodeURIComponent(body);
    msg.textContent='Відкриваємо лист у вашій поштовій програмі. Якщо нічого не сталося, подзвоніть: +380 98 869-00-25.';
    window.openMail(href);
  });
})();
