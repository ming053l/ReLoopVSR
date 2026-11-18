#!/usr/bin/env python3
"""Build the translated project pages from the English page.

The English page (../index.html) is the only hand-edited page. This script
  1. splits it into translatable units: every run of text plus inline markup
     (i, b, em, sup, sub, small, span, strong, code, br) between other tags, and the
     attributes alt, aria-label, title, data-desc, data-cap and <meta name=description> content;
     elements marked translate="no" (and <script>, <style>, comments) are skipped, and so are
     units without a lowercase word (numbers, metric names such as PSNR, labels such as 720p);
  2. looks each unit up in i18n/<lang>.json -> "html" (key = the English unit, whitespace collapsed);
  3. writes <lang>/index.html with <html lang>, translated text, ../ paths to the shared assets and
     media, the language switcher, hreflang/canonical/Open Graph tags, and an inline
     window.DV_I18N dictionary (i18n/<lang>.json -> "js") for the strings that app.js and
     schematic.js generate at run time.
It also rewrites the marked switcher and head blocks of the English page itself, so all five pages
share the same markup.

  python3 i18n/build_i18n.py            build all languages, report missing / unused strings
  python3 i18n/build_i18n.py --extract  also write i18n/en.json, the catalogue of English source strings
  python3 i18n/build_i18n.py --strict   exit with status 1 if any string is missing
"""
import html as H
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
I18N = os.path.join(ROOT, 'i18n')
SITE = 'https://ming053l.github.io/ReLoopVSR/'

# code, folder, Open Graph locale, short label, native name, word for "Language"
LANGS = [
    ('en', '', 'en_US', 'EN', 'English', 'Language'),
    ('zh-Hans', 'zh-Hans', 'zh_CN', '简', '简体中文', '语言'),
    ('zh-Hant', 'zh-Hant', 'zh_TW', '繁', '繁體中文', '語言'),
    ('ja', 'ja', 'ja_JP', '日', '日本語', '言語'),
    ('ko', 'ko', 'ko_KR', '한', '한국어', '언어'),
]
INLINE = {'i', 'b', 'em', 'sup', 'sub', 'small', 'span', 'strong', 'code', 'br'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr',
        'path', 'circle', 'rect', 'polygon', 'line'}
ATTRS = ('alt', 'aria-label', 'title', 'data-desc', 'data-cap')
TOKEN = re.compile(r'<!--.*?-->|<![^>]*>|<(script|style)\b[^>]*>.*?</\1\s*>|</?[A-Za-z][^>"\']*(?:(?:"[^"]*"|\'[^\']*\')[^>"\']*)*>|[^<]+',
                   re.S)
ATTR = re.compile(r'([\w:-]+)\s*=\s*"([^"]*)"')
WORD = re.compile(r'[a-z]{2,}|\bFAQ\b')


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def visible(s):
    return H.unescape(re.sub(r'<[^>]+>', '', s))


def tag_name(tok):
    m = re.match(r'</?([A-Za-z][\w-]*)', tok)
    return m.group(1).lower() if m else None


def segments(src):
    """Yield ('raw', text) and ('unit', leading_ws, core, trailing_ws) and ('tag', tok, translatable)."""
    toks = [m.group(0) for m in TOKEN.finditer(src)]
    assert ''.join(toks) == src, 'tokenizer lost characters'
    out, run, stack, no_depth = [], [], [], None

    def flush():
        if not run:
            return
        raw = ''.join(run)
        run.clear()
        core = raw.strip()
        if no_depth is None and core and WORD.search(visible(core)):
            lead = raw[:len(raw) - len(raw.lstrip())]
            trail = raw[len(raw.rstrip()):]
            out.append(('unit', lead, core, trail))
        else:
            out.append(('raw', raw))

    for tok in toks:
        if tok.startswith('<!--') or re.match(r'<(script|style)\b', tok):
            flush(); out.append(('raw', tok)); continue
        if tok.startswith('<'):
            name, closing = tag_name(tok), tok.startswith('</')
            if name in INLINE and no_depth is None:
                run.append(tok)
            else:
                flush(); out.append(('tag', tok, no_depth is None and not closing))
            if closing:
                while stack:
                    top = stack.pop()
                    if no_depth is not None and len(stack) < no_depth:
                        no_depth = None
                    if top == name:
                        break
            elif name not in VOID and not tok.endswith('/>'):
                stack.append(name)
                if no_depth is None and re.search(r'\btranslate="no"', tok):
                    no_depth = len(stack)
            continue
        run.append(tok)
    flush()
    return out


def attr_units(tok):
    """Translatable attribute values in one tag, as (name, raw value)."""
    res = []
    name = tag_name(tok)
    attrs = dict(ATTR.findall(tok))
    for a, v in ATTR.findall(tok):
        ok = a in ATTRS or (name == 'meta' and a == 'content' and attrs.get('name') == 'description')
        if ok and WORD.search(H.unescape(v)):
            res.append((a, v))
    return res


def catalogue(src):
    units = []
    for seg in segments(src):
        if seg[0] == 'unit':
            units.append(norm(seg[2]))
        elif seg[0] == 'tag' and seg[2]:
            units += [norm(v) for _, v in attr_units(seg[1])]
    seen, uniq = set(), []
    for u in units:
        if u not in seen:
            seen.add(u); uniq.append(u)
    return uniq


def js_catalogue():
    cat = {}
    pat = re.compile(r"T\('([^']+)','((?:[^'\\]|\\.)*)'")
    for fn, pre in (('app.js', ''), ('schematic.js', 'sch.')):
        for k, v in pat.findall(open(os.path.join(ROOT, 'assets', fn), encoding='utf-8').read()):
            cat.setdefault(pre + k, v.replace("\\'", "'"))
    data = open(os.path.join(ROOT, 'assets', 'data.js'), encoding='utf-8').read()
    dv = json.loads(re.search(r'window\.DV=(\{.*?\});?\s*$', data, re.M).group(1))
    for b in dv['bench']:
        cat['meta:' + b['name']] = b['meta']
    return cat


def prefix(code):
    return '' if code == 'en' else '../'


def href(frm, to):
    """Relative link from page `frm` to page `to` (folder names, '' = English)."""
    up = '../' if frm else ''
    return (up + to + '/') if to else (up or './')


def head_block(code, folder, title, desc):
    url = SITE + (folder + '/' if folder else '')
    loc = {c: l for c, _, l, *_ in LANGS}
    lines = ['<link rel="canonical" href="%s">' % url]
    for c, f, *_ in LANGS:
        lines.append('<link rel="alternate" hreflang="%s" href="%s">' % (c, SITE + (f + '/' if f else '')))
    lines.append('<link rel="alternate" hreflang="x-default" href="%s">' % SITE)
    lines += ['<meta property="og:type" content="website">', '<meta property="og:site_name" content="ReLoopVSR">',
              '<meta property="og:title" content="%s">' % title, '<meta property="og:description" content="%s">' % desc,
              '<meta property="og:url" content="%s">' % url, '<meta property="og:locale" content="%s">' % loc[code]]
    lines += ['<meta property="og:locale:alternate" content="%s">' % l for c, _, l, *_ in LANGS if c != code]
    return '<!--i18n-head-->\n' + '\n'.join(lines) + '\n<!--/i18n-head-->'


GLOBE = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
         'stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9'
         'M12 3c-2.5 2.6-3.8 5.6-3.8 9s1.3 6.4 3.8 9"/></svg>')
CHEV = ('<svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" '
        'stroke-linejoin="round" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg>')


def switcher(code, folder):
    me = [l for l in LANGS if l[0] == code][0]
    items = []
    for c, f, _, short, name, _w in LANGS:
        cur = ' aria-current="page"' if c == code else ''
        items.append('<li><a href="%s" hreflang="%s" lang="%s"%s><b>%s</b>%s</a></li>' % (href(folder, f), c, c, cur, short, name))
    return ('<!--i18n-switcher--><details class="lang" id="lang" translate="no"><summary aria-label="%s: %s" title="%s">%s<span>%s</span>%s</summary>'
            '<ul class="lang-menu">%s</ul></details><!--/i18n-switcher-->') % (me[5], me[4], me[5], GLOBE, me[3], CHEV, ''.join(items))


def set_blocks(src, code, folder, title, desc):
    src = re.sub(r'<!--i18n-head-->.*?<!--/i18n-head-->', lambda m: head_block(code, folder, title, desc), src, flags=re.S)
    src = re.sub(r'<!--i18n-switcher-->.*?<!--/i18n-switcher-->', lambda m: switcher(code, folder), src, flags=re.S)
    return src


def page_meta(src):
    title = norm(H.unescape(re.search(r'<title>(.*?)</title>', src, re.S).group(1)))
    desc = re.search(r'<meta name="description" content="([^"]*)"', src).group(1)
    return H.escape(title, quote=True), desc


def translate(src, code, table):
    missing, used, out = [], set(), []

    def tr(text):
        k = norm(text)
        if k in table:
            used.add(k)
            return table[k]
        missing.append(k)
        return text

    for seg in segments(src):
        if seg[0] == 'raw':
            raw = seg[1]
            if code != 'en' and raw.startswith('<script'):
                raw = re.sub(r'^(<script\b[^>]*\bsrc=")(assets|media)/', r'\1../\2/', raw)
            out.append(raw)
        elif seg[0] == 'unit':
            out.append(seg[1] + tr(seg[2]) + seg[3])
        else:
            tok = seg[1]
            if seg[2]:
                for a, v in attr_units(tok):
                    t = tr(v)
                    if '"' in t:
                        raise SystemExit('%s: a translated attribute contains a double quote: %r' % (code, t))
                    tok = tok.replace('%s="%s"' % (a, v), '%s="%s"' % (a, t), 1)
            if code != 'en':
                tok = re.sub(r'\b(href|src|poster|data-src)="(assets|media)/', r'\1="../\2/', tok)
            out.append(tok)
    return ''.join(out), missing, used


def main():
    strict, extract = '--strict' in sys.argv, '--extract' in sys.argv
    en_path = os.path.join(ROOT, 'index.html')
    src = open(en_path, encoding='utf-8').read()
    cat, jcat = catalogue(src), js_catalogue()
    if extract:
        with open(os.path.join(I18N, 'en.json'), 'w', encoding='utf-8') as f:
            json.dump({'html': {k: k for k in cat}, 'js': jcat}, f, ensure_ascii=False, indent=1)
            f.write('\n')
        print('wrote i18n/en.json: %d page strings, %d script strings' % (len(cat), len(jcat)))
    # English page: refresh the shared head and switcher blocks only
    t, d = page_meta(src)
    new = set_blocks(src, 'en', '', t, d)
    if new != src:
        open(en_path, 'w', encoding='utf-8').write(new)
        print('updated the switcher / head blocks of index.html')
    src = new
    bad = 0
    for code, folder, *_ in LANGS[1:]:
        path = os.path.join(I18N, code + '.json')
        tab = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
        hmap = {norm(k): v for k, v in tab.get('html', {}).items()}
        jmap = tab.get('js', {})
        page, missing, used = translate(src, code, hmap)
        page = page.replace('<html lang="en">', '<html lang="%s">' % code, 1)
        t, d = page_meta(page)
        page = set_blocks(page, code, folder, t, d)
        js = {k: v for k, v in jmap.items() if k in jcat}
        blob = json.dumps(js, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
        inject = '<script>window.DV_BASE=\'../\';window.DV_I18N=%s</script>\n' % blob
        page = page.replace('<script src="../assets/data.js', inject + '<script src="../assets/data.js', 1)
        os.makedirs(os.path.join(ROOT, folder), exist_ok=True)
        open(os.path.join(ROOT, folder, 'index.html'), 'w', encoding='utf-8').write(page)
        jmiss = [k for k in jcat if k not in jmap]
        unused = [k for k in hmap if k not in used] + [k for k in jmap if k not in jcat]
        print('%-8s %s/index.html  page %d/%d, script %d/%d, unused %d' % (
            code, folder, len(cat) - len(set(missing)), len(cat), len(jcat) - len(jmiss), len(jcat), len(unused)))
        for k in sorted(set(missing)):
            print('   missing page string: ' + k[:110])
        for k in jmiss:
            print('   missing script string: ' + k)
        for k in unused:
            print('   unused (stale) key: ' + k[:110])
        bad += len(set(missing)) + len(jmiss)
    if strict and bad:
        sys.exit(1)


if __name__ == '__main__':
    main()
