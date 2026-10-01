# الخطوط المضمّنة في الكتاب (WOFF2، رخصة SIL OFL 1.1)

| الملف | الاستخدام | الحجم | المصدر |
|---|---|---|---|
| `NotoNaskhArabic-var.woff2` | نص عربي (متغيّر 400–700) — مُقتطع للعربية الأساسية + اللاتينية | ~22KB | Google Fonts (Noto Naskh Arabic v44) |
| `Amiri-Bold-sub.woff2` | العناوين واسم الكتاب على الغلاف | ~43KB | Google Fonts (Amiri v30, arabic subset) |
| `NotoSansEthiopic.woff2` | الأمهرية (am) | ~72KB | notofonts |
| `NotoNaskhArabic.woff2` | (قديم — احتياط) | ~57KB | notofonts |

الاقتطاع: `pyftsubset <font> --unicodes=U+0020-007E,U+00A0,U+00AB,U+00BB,U+060C,U+061B,U+061F,U+0621-063A,U+0640-0652,U+0660-0669,U+066A-066C,U+0670,U+0679,U+067E,U+0686,U+0698,U+06A9,U+06AF,U+06CC,U+06D4,U+200C-200F,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2026,U+FD3E,U+FD3F --layout-features='*' --flavor=woff2`
(تم التحقق أن كل حروف المحتوى العربي مغطاة — راجع docs/PERFORMANCE_SEO.md).
لإضافة لغة: حمّل Noto المناسب، اقتطعه بنفس الطريقة، وأضفه إلى `FONT_FILES` في `engine/build_book2.py`.
