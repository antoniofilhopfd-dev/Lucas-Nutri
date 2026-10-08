"""Gera prototype/index.html a partir de prototype/src/. Uso: python3 prototype/build.py"""
import base64, os
here = os.path.dirname(os.path.abspath(__file__)) + '/'
brand = here + '../public/brand/'
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
css = open(here + 'src/base.css').read()
shell = open(here + 'src/shell.html').read().replace('__LOGO__', 'data:image/png;base64,' + b64(brand + 'logo-mark.png'))
files = ['j1_core.js', 'j2_nutri.js', 'j2b_club.js', 'j3_pront.js', 'j4_tools.js', 'j5_diet.js', 'j6_patient.js', 'j7_actions.js']
js = "const LOGO_FULL='data:image/png;base64," + b64(brand + 'logo-full.png') + "';\n" + ''.join(open(here + 'src/' + f).read() + '\n' for f in files)
html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BentoNutriSync Protótipo</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#2F5238"><link rel="icon" type="image/png" href="favicon.png"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800&family=Roboto+Condensed:wght@400;500&display=swap"><style>body{margin:0}' + css + '</style></head><body>' + shell + '<script>' + js + '</script></body></html>'
open(here + 'index.html', 'w').write(html)
# pacote pronto para a Hostinger (public_html ou subdomínio)
import shutil
out = here + 'hostinger/'
os.makedirs(out, exist_ok=True)
shutil.copy(here + 'index.html', out + 'index.html')
shutil.copy(brand + 'logo-mark.png', out + 'favicon.png')
demo = here + '../public/demo/'
os.makedirs(demo, exist_ok=True)
shutil.copy(here + 'index.html', demo + 'index.html')
shutil.copy(brand + 'logo-mark.png', demo + 'favicon.png')
print('ok', len(html))
