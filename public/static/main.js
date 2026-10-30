/* Лада Справка — интерактив сайта (опрос, оглавление, меню, cookie и т.д.) */
(function () {
	'use strict';

	var $ = function (s, r) { return (r || document).querySelector(s); };
	var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

	// localStorage может быть недоступен (приватный режим) — оборачиваем
	var store = {
		get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
		set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
		del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
	};

	/* ---------- ОПРОС ----------
	   Превращает разметку из статьи
	   <div class="attention-box attention-info"><div><strong>Вопрос</strong><ul><li>…</li></ul></div></div>
	   в кликабельные кнопки. Голос запоминается в браузере читателя.
	   Чтобы собирать голоса на сервере — впишите адрес в POLL_ENDPOINT (см. README). */
	var POLL_ENDPOINT = '';

	function initPolls() {
		$$('.attention-box.attention-info').forEach(function (box, n) {
			var q = $('strong', box);
			var options = $$('li', box).map(function (li) { return li.textContent.trim(); });
			if (!q || !options.length) return;

			var id = 'poll:' + location.pathname + ':' + n;
			var poll = document.createElement('div');
			poll.className = 'poll';
			poll.setAttribute('role', 'group');
			poll.setAttribute('aria-label', q.textContent.trim());

			var title = document.createElement('div');
			title.className = 'poll-title';
			title.textContent = q.textContent.trim();

			var wrap = document.createElement('div');
			wrap.className = 'poll-options';

			var status = document.createElement('div');
			status.className = 'poll-status';
			status.setAttribute('aria-live', 'polite');

			var buttons = options.map(function (text, i) {
				var b = document.createElement('button');
				b.type = 'button';
				b.className = 'poll-btn';
				b.textContent = text;
				b.addEventListener('click', function () { vote(i); });
				wrap.appendChild(b);
				return b;
			});

			function render(sel) {
				var voted = sel !== null && sel >= 0 && sel < buttons.length;
				poll.classList.toggle('voted', voted);
				buttons.forEach(function (b, i) {
					b.disabled = voted;
					b.classList.toggle('is-selected', voted && i === sel);
					b.textContent = (voted && i === sel ? '✓ ' : '') + options[i];
					b.setAttribute('aria-pressed', voted && i === sel ? 'true' : 'false');
				});
				status.textContent = '';
				if (voted) {
					status.appendChild(document.createTextNode('Спасибо! Ваш ответ сохранён.'));
					var reset = document.createElement('button');
					reset.type = 'button';
					reset.className = 'poll-reset';
					reset.textContent = 'Изменить';
					reset.addEventListener('click', function () { store.del(id); render(null); });
					status.appendChild(reset);
				}
			}

			function vote(i) {
				store.set(id, String(i));
				render(i);
				if (POLL_ENDPOINT && navigator.sendBeacon) {
					try {
						navigator.sendBeacon(POLL_ENDPOINT, JSON.stringify({ poll: id, question: q.textContent.trim(), option: options[i] }));
					} catch (e) {}
				}
			}

			poll.appendChild(title);
			poll.appendChild(wrap);
			poll.appendChild(status);
			box.replaceWith(poll);

			var saved = store.get(id);
			render(saved === null ? null : parseInt(saved, 10));
		});
	}

	/* ---------- Мобильное меню и выпадающий список ---------- */
	function initNav() {
		var btn = $('#menuBtn'), nav = $('#mainNav');
		if (btn && nav) {
			btn.addEventListener('click', function () {
				var open = nav.classList.toggle('open');
				btn.setAttribute('aria-expanded', open ? 'true' : 'false');
				btn.textContent = open ? '✕' : '☰';
			});
		}
		var dd = $('.nav-dropdown'), toggle = $('.dropdown-toggle');
		if (dd && toggle) {
			toggle.addEventListener('click', function (e) { e.stopPropagation(); dd.classList.toggle('open'); });
			document.addEventListener('click', function (e) { if (!dd.contains(e.target)) dd.classList.remove('open'); });
		}
	}

	/* ---------- Время чтения + дата под заголовком ---------- */
	function initMeta() {
		var article = $('.article-main[data-date]');
		var body = $('.article-body');
		var h1 = body && $('h1', body);
		if (!article || !h1) return;

		var words = body.textContent.trim().split(/\s+/).length;
		var minutes = Math.max(1, Math.round(words / 180));
		var meta = document.createElement('div');
		meta.className = 'article-meta';

		var parts = ['⏱ ' + minutes + ' мин чтения'];
		var d = new Date(article.getAttribute('data-date'));
		if (!isNaN(d)) {
			parts.push('📅 ' + d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }));
		}
		meta.textContent = parts.join('   ·   ');
		h1.insertAdjacentElement('afterend', meta);

		// мобильное оглавление — под заголовком, а не над ним
		var mtoc = $('.mobile-toc', body);
		if (mtoc) meta.insertAdjacentElement('afterend', mtoc);
	}

	/* ---------- Якоря у заголовков ---------- */
	function initAnchors() {
		$$('.article-body h2[id], .article-body h3[id]').forEach(function (h) {
			var a = document.createElement('a');
			a.className = 'heading-anchor';
			a.href = '#' + h.id;
			a.textContent = '#';
			a.setAttribute('aria-label', 'Ссылка на раздел');
			h.insertBefore(a, h.firstChild);
		});
	}

	/* ---------- Подсветка текущего раздела в оглавлении ---------- */
	function initScrollSpy() {
		var heads = $$('.article-body h2[id]');
		var links = $$('.toc-item');
		if (!heads.length || !links.length || !('IntersectionObserver' in window)) return;

		function setActive(id) {
			links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + id); });
			var act = $('.toc-item.active');
			var list = act && act.parentElement;
			if (list && list.scrollHeight > list.clientHeight) {
				list.scrollTop = act.offsetTop - list.clientHeight / 2;
			}
		}
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
		}, { rootMargin: '-90px 0px -70% 0px', threshold: 0 });
		heads.forEach(function (h) { io.observe(h); });
	}

	/* ---------- Прогресс чтения и кнопка «наверх» ---------- */
	function initScrollUI() {
		var bar = document.createElement('div');
		bar.className = 'read-progress';
		document.body.appendChild(bar);

		var top = document.createElement('button');
		top.type = 'button';
		top.className = 'to-top';
		top.setAttribute('aria-label', 'Наверх');
		top.textContent = '↑';
		top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
		document.body.appendChild(top);

		var ticking = false;
		function update() {
			var h = document.documentElement;
			var max = h.scrollHeight - h.clientHeight;
			bar.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + '%';
			top.classList.toggle('show', h.scrollTop > 600);
			ticking = false;
		}
		window.addEventListener('scroll', function () {
			if (!ticking) { ticking = true; requestAnimationFrame(update); }
		}, { passive: true });
		update();
	}

	/* ---------- Cookie ---------- */
	function initCookie() {
		var popup = $('#cookie-consent'), btn = $('#cookie-accept');
		if (!popup || !btn) return;
		if (store.get('cookie-accepted')) return;
		setTimeout(function () { popup.classList.add('visible'); }, 600);
		btn.addEventListener('click', function () {
			store.set('cookie-accepted', 'true');
			popup.classList.remove('visible');
		});
	}

	function init() {
		initPolls();
		initNav();
		initMeta();
		initAnchors();
		initScrollSpy();
		initScrollUI();
		initCookie();
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
