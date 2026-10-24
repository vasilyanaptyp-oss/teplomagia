(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Opening hours (Lviv time): Mon-Fri 10-18, Sat 10-15, Sun closed */
  var HOURS = { 1: [10, 18], 2: [10, 18], 3: [10, 18], 4: [10, 18], 5: [10, 18], 6: [10, 15] };
  var DAY_ACC = ['неділю', 'понеділок', 'вівторок', 'середу', 'четвер', "п'ятницю", 'суботу'];

  function kyivNow() {
    try {
      var parts = {};
      new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (x) { parts[x.type] = x.value; });
      var d = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
      if (d < 0) return null;
      return { d: d, t: (parseInt(parts.hour, 10) % 24) + parseInt(parts.minute, 10) / 60 };
    } catch (e) { return null; }
  }

  function statusNow() {
    var n = kyivNow();
    if (!n) return null;
    var today = HOURS[n.d];
    if (today && n.t >= today[0] && n.t < today[1]) return { open: true, text: 'Зараз працюємо, до ' + today[1] + ':00' };
    if (today && n.t < today[0]) return { open: false, text: 'Відчинимося сьогодні о ' + today[0] + ':00' };
    for (var i = 1; i <= 7; i++) {
      var d = (n.d + i) % 7;
      if (HOURS[d]) return { open: false, text: 'Зараз зачинено, відчинимося ' + (i === 1 ? 'завтра' : 'в ' + DAY_ACC[d]) + ' о ' + HOURS[d][0] + ':00' };
    }
    return null;
  }

  function paintStatus() {
    var s = statusNow();
    if (!s) return;
    $$('[data-status]').forEach(function (el) {
      el.textContent = s.text;
      el.setAttribute('data-open', s.open ? '1' : '0');
    });
  }
  paintStatus();
  setInterval(paintStatus, 60000);

  /* Mobile menu */
  var btn = $('.menu-btn'), mnav = $('#mnav');
  if (btn && mnav) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      mnav.hidden = open;
    });
    $$('a', mnav).forEach(function (a) {
      a.addEventListener('click', function () { btn.setAttribute('aria-expanded', 'false'); mnav.hidden = true; });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !mnav.hidden) { btn.setAttribute('aria-expanded', 'false'); mnav.hidden = true; btn.focus(); }
    });
  }

  /* Picker: room + area + fuel -> what fits from the catalogue (their own published ranges) */
  var SHOP = 'https://teplomagiya.com.ua/ua/';
  var form = $('#picker'), area = $('#area'), range = $('#area-range'), unit = $('#area-unit'), label = $('#area-label');
  var fuelRow = $('#fuel-row'), fuel = $('#fuel'), list = $('#r-list'), kicker = $('#r-kicker'), note = $('#r-note');
  var viber = $('#viber-send'), mail = $('#mail-send'), msg = $('#r-msg');
  var ROOM_NAME = { house: 'будинок або дача', sauna: 'лазня чи сауна', shop: 'цех, склад, СТО або теплиця', big: "великий об'єкт" };
  var DEFAULTS = { house: 120, sauna: 12, shop: 400, big: 1500 };
  var RANGES = { house: [20, 900, 10], sauna: [4, 40, 1], shop: [50, 3000, 50], big: [300, 10000, 100] };
  var remembered = {};
  var current = 'house';

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function item(title, text, href, linkText) {
    return '<li><b>' + esc(title) + '</b><span>' + esc(text) + '</span>' + (href ? '<a href="' + esc(href) + '">' + esc(linkText) + '</a>' : '') + '</li>';
  }
  function roomValue() { var r = form && form.querySelector('input[name="room"]:checked'); return r ? r.value : 'house'; }
  function areaValue() { var a = parseInt(area.value, 10); return a > 0 ? a : 0; }

  function setRoom(r) {
    remembered[current] = areaValue() || remembered[current];
    current = r;
    var rg = RANGES[r];
    range.min = rg[0]; range.max = rg[1]; range.step = rg[2];
    var v = remembered[r] || DEFAULTS[r];
    area.value = v;
    range.value = Math.min(rg[1], Math.max(rg[0], v));
    var sauna = r === 'sauna';
    unit.textContent = sauna ? 'м³' : 'м²';
    label.textContent = sauna ? "Обсяг парної" : (r === 'house' ? 'Площа, яку гріємо' : 'Площа приміщення');
    fuelRow.hidden = !(r === 'house' || r === 'big');
  }

  function render() {
    var r = roomValue(), a = areaValue(), f = fuel.value, out = [], n = '';
    var u = r === 'sauna' ? ' м³' : ' м²';
    kicker.textContent = a ? (r === 'sauna' ? 'З каталогу для парної ' + a + u : 'З каталогу для ' + a + u) : 'З каталогу';
    if (r === 'sauna') {
      out.push(item('Банні печі KALVIS, 6 моделей', "Дров'яні печі-каменки. Потужність і обсяг каменки залежать від обсягу парної, піч беруть із запасом.", SHOP + 'g157631626-pechi-dlya-lazni', 'Відкрити розділ'));
      out.push(item('Модель із теплообмінником', 'Якщо потрібен душ із гарячою водою або невеликий басейн.'));
      out.push(item('Модель із виносною топкою', 'Якщо важливіші зручність і чистота: топлять із передбанника, дим не йде в парну.'));
      n = 'Обсяг парної: довжина, помножена на ширину й висоту. Модель назвемо телефоном.';
    } else if (r === 'shop') {
      out.push(item('Водяні тепловентилятори TREVENT ABS', 'Працюють від котла в системі з гарячою водою. У нашому магазині 4 моделі.', SHOP + 'g157631627-teploventilyatori', 'Відкрити розділ'));
      out.push(item('Серія PRO від TREVENT', 'Для виробничих, складських, торгових приміщень і СТО: потужний і дальній потік теплого повітря.', 'https://trevent.ua/vodiani-teploventyliatory/', 'Дивитися на trevent.ua'));
      out.push(item('Електричні тепловентилятори', 'Коли гарячої води від котла немає: гріє ТЕН.', 'https://trevent.ua/elektrychni-teploventyliatory/', 'Дивитися на trevent.ua'));
      n = 'Скільки тепловентиляторів і якої потужності, порахуємо разом: площа, висота стелі, ворота.';
    } else if (r === 'big') {
      out.push(item('Промислові котли KALVIS', 'Потужність від 140 кВт. Чотири серії, від ручного завантаження до механізованої подачі. Дрова, вугілля, брикети, а механізовані моделі ще й фракційне паливо.', SHOP + 'g157631621-kotli-promislovi', 'Відкрити розділ'));
      out.push(item('Проєкт зі специфікацією', 'Підберемо обладнання проєктом зі специфікацією або назвемо ціну за вашою специфікацією.'));
      out.push(item('Тепловентилятори для цехів і складів', 'Якщо простір великий, з високою стелею й воротами.', '#ceh', 'Дивитися нижче'));
    } else {
      if (a > 700) {
        out.push(item('Більше, ніж для побутового котла', 'Побутові котли в каталозі розраховані на будинки до 700 м². Для такої площі дивіться промислові котли від 140 кВт.', SHOP + 'g157631621-kotli-promislovi', 'Промислові котли'));
        n = 'Для великої площі краще коротко порадитися телефоном.';
      } else {
        if (f === 'Пелети') out.push(item('Пелетні та гранульні котли KALVIS', 'Подача автоматична, достатньо заповнити бункер. Паливо зазвичай дорожче, ніж дрова.', SHOP + 'g157631617-kotli-pobutovi', 'Відкрити розділ'));
        out.push(item('Твердопаливні котли KALVIS', 'Від 6 до 70 кВт, ручне завантаження, для будинків від 60 до 700 м². Дрова, вугілля або пелети.', SHOP + 'g157631617-kotli-pobutovi', 'Відкрити розділ'));
        if (a >= 60 && a <= 180 && (f === 'Дрова' || f === 'Брикети' || f === 'Ще не знаю')) {
          out.push(item('Повітрогрійний камін KALVIS-1-1', 'Від 3 до 8 кВт, для будинків приблизно від 60 до 180 м². Без води й електрики. 25 100 грн.', SHOP + 'p3189527996-kamin-vozduhogrejnyj-kalvis.html', 'Картка товару'));
        }
        out.push(item('Котли-плити KALVIS', 'Опалення й плита для готування разом: KALVIS-4 за 33 600 грн, KALVIS-4СM за 16 150 грн.', SHOP + 'p3189428167-kotly-plity-kalvis.html', 'Картка KALVIS-4СM'));
        n = a && a < 60 ? 'Котли в каталозі розраховані на будинки від 60 м². Для меншої площі порадимо телефоном.' : 'Точну модель і потужність назвемо телефоном.';
      }
    }
    list.innerHTML = out.join('');
    note.textContent = n;

    var txt = 'Добрий день! Потрібен підбір обладнання. Приміщення: ' + ROOM_NAME[r] +
      (a ? (r === 'sauna' ? ', обсяг парної ' + a + ' м³' : ', площа ' + a + ' м²') : '') +
      (!fuelRow.hidden ? ', паливо: ' + f.toLowerCase() : '') + '. Місто: ';
    viber.setAttribute('data-text', txt);
    mail.href = 'mailto:trevent.ua@gmail.com?subject=' + encodeURIComponent('Підбір обладнання: ' + ROOM_NAME[r] + (a ? ', ' + a + u : '')) + '&body=' + encodeURIComponent(txt);
    msg.textContent = '';
  }

  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    $$('input[name="room"]', form).forEach(function (el) {
      el.addEventListener('change', function () { setRoom(el.value); render(); });
    });
    area.addEventListener('input', function () {
      var a = areaValue();
      if (a) range.value = Math.min(+range.max, Math.max(+range.min, a));
      render();
    });
    range.addEventListener('input', function () { area.value = range.value; render(); });
    fuel.addEventListener('change', render);
    viber.addEventListener('click', function (e) {
      var t = viber.getAttribute('data-text') || '';
      var go = function () { window.location.href = viber.href; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        e.preventDefault();
        navigator.clipboard.writeText(t).then(function () {
          msg.textContent = 'Запит скопійовано. Вставте його в чат Viber і допишіть місто.';
          setTimeout(go, 350);
        }, function () { msg.textContent = 'Напишіть у Viber: ' + t; setTimeout(go, 350); });
      }
    });
    setRoom(roomValue());
    render();
  }

  /* Sticky call bar on phones: visible when the hero call button is out of view, hidden over the contacts */
  var dock = $('#dock'), heroCall = $('#hero-call'), contacts = $('#kontakty');
  if (dock && heroCall && 'IntersectionObserver' in window) {
    var heroVisible = true, contactsVisible = false;
    var upd = function () {
      var on = !heroVisible && !contactsVisible;
      dock.classList.toggle('on', on);
      dock.setAttribute('aria-hidden', on ? 'false' : 'true');
      $$('a', dock).forEach(function (a) { a.tabIndex = on ? 0 : -1; });
    };
    new IntersectionObserver(function (en) { heroVisible = en[0].isIntersecting; upd(); }).observe(heroCall);
    if (contacts) new IntersectionObserver(function (en) { contactsVisible = en[0].isIntersecting; upd(); }, { rootMargin: '0px 0px -40% 0px' }).observe(contacts);
  }
})();
