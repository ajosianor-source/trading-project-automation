import pathlib
import re
from pathlib import Path
js = Path('app.js').read_text()
html = Path('index.html').read_text()
query_ids = set(re.findall(r'document\.querySelector\(\s*["\"]#([^"\"]+)["\"]', js))
query_ids |= set(re.findall(r'document\.getElementById\(\s*["\"]([^"\"]+)["\"]', js))
html_ids = set(re.findall(r'id=["\"]([A-Za-z0-9_-]+)["\"]', html))
missing = sorted(query_ids - html_ids)
print('query_ids', len(query_ids))
print('html_ids', len(html_ids))
print('missing', len(missing))
for i in missing:
    print(i)
