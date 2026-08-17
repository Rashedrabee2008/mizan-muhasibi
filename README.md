README - نظام ميزان المحاسبي المتكامل
https://img.shields.io/badge/version-3.2-blue https://img.shields.io/badge/Firebase-Cloud-orange https://img.shields.io/badge/license-MIT-green

📖 نبذة عن المشروع
ميزان هو نظام محاسبي ونقاط بيع متكامل، مصمم لإدارة الأعمال الصغيرة والمتوسطة بكل سهولة. يعمل التطبيق على السحابة (Firebase) ويمكن الوصول إليه من أي جهاز (كمبيوتر، هاتف محمول، جهاز لوحي) مع مزامنة فورية للبيانات بين جميع الأجهزة.

✨ الميزات الرئيسية
إدارة العملاء والموردين – إضافة، تعديل، حذف، وعرض الأرصدة.

فواتير البيع والشراء – إنشاء فواتير مع إمكانية إضافة أصناف، ضريبة، خصم، وطرق دفع متعددة (نقدي، فيزا، تحويل بنكي، أجل).

المرتجعات – إرجاع فواتير البيع أو الشراء مع عكس جميع الحركات (مخزون، خزنة، أرصدة).

إدارة المخزون – تتبع الكميات، أسعار الشراء والبيع، مع حساب هامش الربح.

الخزنة – رصد الحركات النقدية والمدفوعات، مع تصنيفها (إيرادات، مدفوعات، تحصيل عملاء، سداد موردين، مصروفات).

التقارير الشاملة:

ميزان المراجعة (Trial Balance).

قائمة الدخل (Income Statement).

الميزانية العمومية (Balance Sheet).

الرسوم البيانية والإحصائيات – أداء المبيعات، توزيع المدفوعات، إحصائيات العملاء والفواتير.

المزامنة السحابية – تخزين البيانات على Firebase Firestore مع دعم العمل دون اتصال (Offline).

الوضع الليلي – واجهة مريحة للعين في الإضاءة المنخفضة.

إشعارات فورية – تنبيهات عند إتمام العمليات.

🛠️ التقنيات المستخدمة
التقنية	الاستخدام
HTML5	هيكل التطبيق
CSS3	التصميم والتجاوب (Responsive)
JavaScript (ES6)	المنطق التجاري والتفاعل
Chart.js	الرسوم البيانية
Font Awesome	الأيقونات
Firebase (Auth + Firestore)	المصادقة وقاعدة البيانات السحابية
localStorage	التخزين المحلي كنسخة احتياطية
🚀 متطلبات التشغيل
متصفح حديث (Chrome, Firefox, Edge, Safari).

حساب Firebase (للتخزين السحابي).

اتصال بالإنترنت للمزامنة (ويعمل دون اتصال بشكل محدود).

📦 التثبيت والنشر (Deployment)
1. الحصول على نسخة من الكود
انسخ الكود من ملف index.html (الموجود في هذا المستودع) أو قم بتنزيل المستودع كاملاً.

2. إعداد Firebase
أنشئ مشروعاً جديداً على Firebase Console.

فعّل Authentication واختر طريقة البريد الإلكتروني/كلمة المرور.

فعّل Firestore Database (يفضل في وضع الإنتاج مع قواعد الأمان).

من إعدادات المشروع، احصل على بيانات التكوين (apiKey, authDomain, projectId, إلخ).

3. تعديل بيانات Firebase في الكود
افتح ملف index.html وابحث عن كائن firebaseConfig واستبدل القيم الخاصة بك:

javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // اختياري
};
4. رفع الملف على استضافة
يمكنك استخدام أي خدمة استضافة للملفات الثابتة:

Netlify: اسحب وأفلت مجلد المشروع أو استخدم Git.

Vercel: vercel --prod أو اسحب المشروع من Git.

GitHub Pages: ادفع المشروع إلى مستودع GitHub وفعّل GitHub Pages.

Firebase Hosting:

bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
أي استضافة أخرى تدعم ملفات HTML/CSS/JS (مثل InfinityFree, Hostinger, إلخ).

5. فتح التطبيق
بعد النشر، افتح الرابط الذي زودتك به الاستضافة، وستظهر شاشة تسجيل الدخول. يمكنك إنشاء حساب جديد والبدء في استخدام النظام.

🗄️ هيكل قاعدة البيانات (Firestore)
يتم تخزين البيانات تحت مسار users/{uid} حيث uid هو معرف المستخدم الفريد. يحتوي كل مستند على المجموعات التالية (كحقول) وكلها مصفوفات:

الحقل	الوصف
products	قائمة الأصناف (id, name, code, buyPrice, sellPrice, unit, quantity)
customers	العملاء (id, name, phone, address, balance)
suppliers	الموردين (id, name, phone, address, balance)
invoices	الفواتير (id, date, type, customer, items, total, paid, profit, ...)
treasuries	الخزائن (id, name, balance, isDefault)
treasuryMovements	حركات الخزنة (id, treasuryId, type, amount, description, date, ref)
expenses	المصروفات (id, category, description, amount, date)
notifications	الإشعارات (id, message, type, date, read)
invoiceCounter	عداد الفواتير (رقم تزايدي)
customerIdCounter	عداد العملاء
supplierIdCounter	عداد الموردين
expenseIdCounter	عداد المصروفات
treasuryIdCounter	عداد الخزائن
🔒 قواعد الأمان (Security Rules)
يُوصى باستخدام القواعد التالية لحماية البيانات:

javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
هذه القواعد تمنع أي مستخدم من الوصول إلى بيانات مستخدم آخر.

🧪 الاختبار
بيانات تجريبية: التطبيق يأتي ببيانات افتراضية (منتجات، عملاء، موردين) لتجربة النظام فوراً.

يمكنك حذفها واستبدالها ببياناتك الحقيقية.

جميع العمليات (إضافة، تعديل، حذف) تنعكس فوراً على السحابة والمحلي.

🤝 المساهمة
نرحب بأي مساهمات لتطوير النظام. يمكنك:

الإبلاغ عن مشكلة عبر GitHub Issues.

اقتراح تحسينات أو ميزات جديدة.

إرسال طلب سحب (Pull Request) مع تحسيناتك.

📄 الترخيص
هذا المشروع مرخص تحت رخصة MIT – يمكنك استخدامه وتعديله وتوزيعه بحرية مع الإشارة إلى المصدر.

📞 التواصل
المطور: [اسمك أو فريقك]

البريد الإلكتروني: [بريدك]

الموقع: [رابط الموقع]

📌 ملاحظات إضافية
التطبيق يعمل دون اتصال بالإنترنت باستخدام localStorage، وعند عودة الاتصال تتم المزامنة تلقائياً مع السحابة.

الأداء: مع زيادة البيانات، قد يصبح التطبيق أبطأ إذا كنت تستخدم إصداراً قديماً من المتصفح.

التحديثات: سيتم إصدار تحديثات دورية لإضافة ميزات جديدة وتحسين الأمان.

