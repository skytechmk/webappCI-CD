export interface GuestReview {
  review: string;
  translation?: string;
  ethnicity: string;
  language: string;
  rationale: string;
}

export const guestReviews: GuestReview[] = [
  {
    review: "Одлично апликација! Лесно креирам настани за семејни собири, а гостите можат да споделуваат слики од нашите традиционални македонски вечери со боб и лук. Многу подобро од старите методи со папир.",
    translation: "Excellent app! I easily create events for family gatherings, and guests can share photos from our traditional Macedonian dinners with beans and onions. Much better than old methods with paper.",
    ethnicity: "Macedonian",
    language: "Macedonian",
    rationale: "Urban perspective from Skopje, positive tone with reference to Macedonian cuisine (bob i luk), reflecting family-oriented customs; informal colloquial style."
  },
  {
    review: "Aplikacioni është i mirë për dasma, por ndonjëherë ngarkon ngadalë kur ka shumë mysafirë. Mund të shtoni më shumë gjuhë për shqiptarët në Maqedoni.",
    translation: "The app is good for weddings, but sometimes loads slowly when there are many guests. You could add more languages for Albanians in Macedonia.",
    ethnicity: "Albanian",
    language: "Albanian",
    rationale: "Rural viewpoint from Tetovo region, neutral/constructive tone focusing on performance and language inclusivity, common in Albanian-speaking communities; moderate formality."
  },
  {
    review: "Çok güzel bir uygulama! Etkinliklerde fotoğraf paylaşımı kolay, özellikle Türk kahvesi içtiğimiz zamanlarda aile toplantılarında kullanıyoruz. Sadece daha fazla filtre ekleyin.",
    translation: "A very nice app! Photo sharing at events is easy, especially during our family gatherings when we drink Turkish coffee. Just add more filters.",
    ethnicity: "Turkish",
    language: "Turkish",
    rationale: "Urban perspective from Gostivar, positive tone with subtle nod to Turkish coffee tradition; casual, appreciative language."
  },
  {
    review: "Добра апликација за дечији рођендани, али понекад се губе слике. Треба побољшати сигурност.",
    translation: "Good app for children's birthdays, but sometimes photos get lost. Need to improve security.",
    ethnicity: "Serbian",
    language: "Serbian",
    rationale: "Rural viewpoint from Kumanovo area, constructive criticism tone, practical feedback from Serbian users; concise, technical."
  },
  {
    review: "Nije loše, ali za naše bosanske proslave sa ćevapima i muzikom, aplikacija ponekad kasni. Dodajte opciju za offline dijeljenje.",
    translation: "Not bad, but for our Bosnian celebrations with ćevapi and music, the app sometimes lags. Add an option for offline sharing.",
    ethnicity: "Bosniak",
    language: "Bosnian",
    rationale: "Urban perspective from Skopje, neutral/constructive tone with reference to Bosniak cuisine (ćevapi) and music traditions; informal, community-focused."
  },
  {
    review: "Super aplikacija! Koristim je za naše romske svadbe, gdje dijelimo slike od plesa i muzike. Sve radi dobro, hvala!",
    translation: "Super app! I use it for our Romani weddings, where we share photos of dancing and music. Everything works well, thanks!",
    ethnicity: "Romani",
    language: "Romani",
    rationale: "Rural viewpoint from Šuto Orizari, positive tone emphasizing Romani wedding traditions (dancing, music); enthusiastic, colloquial style."
  },
  {
    review: "Многу ми се допаѓа! Споделувањето на слики од црковни фестивали е лесно, а поддршката за македонски јазик е одлична. Само додајте повеќе теми.",
    translation: "I really like it! Sharing photos from church festivals is easy, and the support for the Macedonian language is excellent. Just add more themes.",
    ethnicity: "Macedonian",
    language: "Macedonian",
    rationale: "Rural perspective from Ohrid, positive tone with reference to Orthodox church festivals; warm, appreciative language."
  },
  {
    review: "Aplikacioni funksionon mirë për festat tona familjare, por ka nevojë për më shumë opsione për privatësi. Shqiptarët në Maqedoni e vlerësojnë këtë.",
    translation: "The app works well for our family parties, but needs more privacy options. Albanians in Macedonia appreciate this.",
    ethnicity: "Albanian",
    language: "Albanian",
    rationale: "Urban viewpoint from Debar, neutral tone focusing on privacy, common concern in Albanian communities; polite, direct feedback."
  },
  {
    review: "Harika, etkinliklerde video paylaşımı mükemmel! Özellikle bayramlarda kullandığımızda ailemiz mutlu oluyor. Daha hızlı yükleme ekleyin.",
    translation: "Great, video sharing at events is perfect! Especially when we use it during holidays, our family is happy. Add faster loading.",
    ethnicity: "Turkish",
    language: "Turkish",
    rationale: "Rural perspective from Bitola, positive tone with reference to Turkish holidays (bayram); friendly, family-oriented."
  },
  {
    review: "Апликација је добра за прославе, али понекад не ради добро са старијим телефонима. Побољшајте компатибилност.",
    translation: "The app is good for celebrations, but sometimes doesn't work well with older phones. Improve compatibility.",
    ethnicity: "Serbian",
    language: "Serbian",
    rationale: "Urban perspective from Veles, constructive criticism tone, practical feedback; concise, technical."
  },
  {
    review: "Za naše bosanske fešte sa sevdalinkama, aplikacija je dobra, ali dodajte više muzičkih opcija. Nije loše inače.",
    translation: "For our Bosnian parties with sevdalinka music, the app is good, but add more music options. Not bad otherwise.",
    ethnicity: "Bosniak",
    language: "Bosnian",
    rationale: "Rural viewpoint from Strumica, neutral tone with reference to Bosniak music (sevdalinka); relaxed, cultural emphasis."
  },
  {
    review: "Phari aplikacija! Amari romani svadba si sikavel pe sas e data, te kerel savorenge veseli. Savo si lačho!",
    translation: "Great app! Our Romani wedding is shown to everyone, making everyone happy. Everything is good!",
    ethnicity: "Romani",
    language: "Romani",
    rationale: "Urban perspective from Skopje, positive tone reflecting Romani wedding customs; informal, expressive with Romani phrases."
  }
];