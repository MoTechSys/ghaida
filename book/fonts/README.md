# الخطوط المضمّنة (WOFF2, رخصة SIL OFL)
- NotoSansEthiopic.woff2 — للأمهرية (am) ~72KB
- NotoNaskhArabic.woff2 — للعربية ~57KB
تُضمَّن base64 داخل الكتاب عند البناء (build_book.py) حسب اللغة. لإضافة لغة: حمّل Noto المناسب من https://github.com/notofonts ، حوّله بـ fontTools إلى woff2 وأضفه في FONT_FILES.
