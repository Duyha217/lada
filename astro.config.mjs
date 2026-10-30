import { defineConfig } from 'astro/config';

/* ------------------------------------------------------------
   Плагин разметки статей (работает при сборке, зависимостей нет):
   1. каждую <table> оборачивает в <div class="table-wrap"> —
      из-за этого таблицы красиво выглядят и скроллятся на телефоне;
   2. каждую цитату (> текст) превращает во врезку:
        «Совет…» / 💡     → оранжевая  (callout-tip)
        «Важно…», «Внимание…», ⚠️ → красная (callout-warning)
        всё остальное     → синяя      (callout-note)
      и убирает дублирующий эмодзи в начале (иконку рисует CSS).
   ------------------------------------------------------------ */
const LEAD_EMOJI = /^[\s⚠ℹ❗️\u{1F4A1}\u{1F4CC}]+/u;

const textOf = (n) => (n.type === 'text' ? n.value : (n.children || []).map(textOf).join(''));

function classify(text) {
	const t = text.trim().toLowerCase();
	if (/^(⚠|❗|внимани|важно|осторожно|опасн|предупрежд|нельзя)/.test(t)) return 'warning';
	if (/^(💡|совет|лайфхак|рекоменд)/.test(t)) return 'tip';
	return 'note';
}

// убирает эмодзи-иконку в самом начале врезки
function stripLeadEmoji(node) {
	const kids = node.children || [];
	for (let i = 0; i < kids.length; i++) {
		const c = kids[i];
		if (c.type === 'text') {
			if (!c.value.trim()) continue;
			c.value = c.value.replace(LEAD_EMOJI, '');
			if (c.value === '') { kids.splice(i, 1); i--; continue; }
			return true;
		}
		if (c.type === 'element') {
			const done = stripLeadEmoji(c);
			if (!c.children.length) { kids.splice(i, 1); i--; }
			if (done) return true;
		}
	}
	return false;
}

function rehypeArticle() {
	return (tree) => {
		(function walk(node, parent, index) {
			if (node.type === 'element') {
				if (node.tagName === 'table' && parent) {
					parent.children[index] = {
						type: 'element',
						tagName: 'div',
						properties: { className: ['table-wrap'] },
						children: [node],
					};
					return;
				}
				if (node.tagName === 'blockquote') {
					const kind = classify(textOf(node));
					node.properties = { ...(node.properties || {}), className: ['callout', `callout-${kind}`] };
					stripLeadEmoji(node);
				}
			}
			(node.children || []).forEach((c, i) => walk(c, node, i));
		})(tree, null, 0);
	};
}

export default defineConfig({
	markdown: {
		rehypePlugins: [rehypeArticle],
	},
});
