// Officer-app translations. English text is the key. Each entry lists, in this order:
//   Bemba | Nyanja | Tonga | Lozi | Kaonde | Lunda | Luvale
// An empty slot (or a missing entry) falls back to English.
// NOTE: English is authoritative. All other languages are first drafts that MUST be reviewed
// by native speakers before real use. Long explanatory text and server error messages stay in English.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DICT_MORE } from './i18n-more.js';
import { DICT_NEW } from './i18n-new.js';

export const LANGS = [
  ['en', 'English'], ['bem', 'Ichibemba'], ['nya', 'Chinyanja'], ['toi', 'Chitonga'],
  ['loz', 'Silozi'], ['kqn', 'Kikaonde'], ['lun', 'Chilunda'], ['lue', 'Luvale'],
];
const SLOT = { bem: 0, nya: 1, toi: 2, loz: 3, kqn: 4, lun: 5, lue: 6 };

export const DICT = {
  // navigation
  'Home': "Ku ng'anda|Kunyumba|Munzi|Hae|Ku nzubo|Ku nzu|Ku nzo",
  'Dashboard': 'Ukulolesha|Chiwonetsero|Kulangilila|Kubonisa|Kulangulula|Kutala|Kutala',
  'Ledger': 'Ibuku lya ndalama|Buku la ndalama|Bbuku lyamali|Buka ya mali|Buku ya mali|Buku dya mbongo|Buku lyambongo',
  'Meetings': 'Ukukumana|Misonkhano|Miswaangano|Likopano|Kukumana|Michipompelu|Nkunguluko',
  'Loans': 'Inkongole|Ngongole|Ngongole|Likoloto|Mwingo|Mbongo yakuzeya|Vilanga',
  'Members': 'Abanyina|Mamembala|Bamembala|Bamemba|Bamembala|Amembala|Vamembala',
  'More': 'Ifingi|Zina|Zimbi|Tse ñwi|Byambi|Hiyedi|Vyeka',
  'Payments': 'Ukulipila|Malipiro|Kubbadela|Litefo|Kulipila|Kuzeya|Kufweta',
  'Disputes': 'Amakani|Mikangano|Mazwanga|Likanyiso|Makani|Makani|Makani',
  'Share-out': 'Ukwabana|Logawana|Kupekezya|Ku aanya|Kupana|Kupana|Kwabana',
  'Statements': 'Ifyalembwa|Ma statement|Ma statement|Li-statement|Ma statement|Ma statement|Ma statement',
  'SMS log': 'Ifya SMS|Mauthenga a SMS|||||',
  'Audit log': 'Ibuku lya kulolesha|Mbiri ya kafukufuku|Rekodi yakulangisisya|Buka ya ku lekisisa|Buku ya kulondolola|Buku dyakulondolola|Buku lyakulondolola',
  'Security': 'Ukusunga umutende|Chitetezo|Cakulikwabilila|Polokeho|Bukinzo|Kukinga|Kukinga',
  'Log out': 'Fuma|Tulukani|Amufume|Mu tswe|Fumamo|Fumamu|Fuma',
  'VILLAGE BANKING': 'UKUSUNGA MU CILIMBA|KUSUNGA MU GULU|KUBBADELA MUCIBUNGA|KU BOLOKA MWA SIKWATA|KUSUNGA MU KIPWILO|KUSANDA MU CHIKUMBU|KUSEKA MWACHISAKA',
  'Language': 'Ululimi|Chilankhulo|Ciyaluulo|Puo|Mwa kwamba|Mwakulumbulwila|Lilimi',
  'Loading…': 'Isubilile…|Dikirani…|Amulindile…|Mu lete…|Lindai…|Lindenu…|Lindenu…',
  'Choose…': 'Sala…|Sankhani…|Amusale…|Mu hete…|Sala…|Sakulenu…|Sakulenu…',
  // people and accounts
  'Member': 'Umwina|Membala|Membala|Memba|Membala|Membala|Membala',
  'Name': 'Ishina|Dzina|Zina|Libizo|Zhina|Dijina|Lizina',
  'Full name': 'Ishina lyonse|Dzina lonse|Zina lyoonse|Libizo kaufela|Zhina yonse|Dijina dyejima|Lizina lyosena',
  'Your name': 'Ishina lyobe|Dzina lanu|Zina lyanu|Libizo la mina|Zhina yenu|Dijina dyenu|Lizina lyenu',
  'Phone': 'Feni|Foni|Foni|Foni|Foni|Foni|Foni',
  'Phone number': 'Inambala ya feni|Nambala ya foni|Namba yafoni|Nomoro ya foni|Nambala ya foni|Nambala ya foni|Nambala ya foni',
  'Password': '|Chinsinsi|||||',
  'New password': 'Password ipya|Password yatsopano|Password mpya|Password e nca|Password ya pya|Password yipya|Password yipya',
  'Current password': 'Password ya nomba|Password yapano|Password yamuno|Password ya sunu|Password ya lelo|Password yamuchaña|Password yamunako',
  'Authenticator code': 'Code ya Authenticator|Khodi ya Authenticator|Code ya Authenticator|Code ya Authenticator|Code ya Authenticator|Code ya Authenticator|Code ya Authenticator',
  'Role': 'Umulimo|Udindo|Mulimo|Mosebezi|Mwingilo|Mudimu|Mulimo',
  'Status': 'Imibele|Mkhalidwe|Mbwaabede|Maemo|Mikalile|Mwikalilu|Mukwakwo',
  'Add member': 'Ikata umwina|Onjezani membala|Amuyunge membala|Mu tahise memba|Ongeza membala|Ongeja membala|Ongeza membala',
  'Reset PIN': 'Shintilila PIN|Konzaninso PIN|Amuyibweze PIN|Mu buyiseze PIN|Ibuula PIN|Dilula PIN|Hulula PIN',
  'Group name': 'Ishina lya cilimba|Dzina la gulu|Zina lyacibunga|Libizo la sikwata|Zhina ya kipwilo|Dijina dyachikumbu|Lizina lyachisaka',
  'Location': 'Ncende|Malo|Busena|Sibaka|Mbalo|Hena|Handu',
  // money
  'Amount': 'Ubunonshi|Ndalama|Mali|Mali|Mali|Mbongo|Mbongo',
  'Amount (K)': 'Ubunonshi (K)|Ndalama (K)|Mali (K)|Mali (K)|Mali (K)|Mbongo (K)|Mbongo (K)',
  'Savings': 'Ukusunga|Zosungidwa|Mali aabbadelwa|Mali a bolokilwe|Mali yasungwa|Mbongo yasandi|Mbongo yasekwa',
  'Total savings': 'Yonse iya kusunga|Zosungidwa zonse|Mali oonse aabbadelwa|Mali kaufela a bolokilwe|Mali yonse yasungwa|Mbongo yejima yasandi|Mbongo yosena yasekwa',
  'Savings after': 'Ukusunga panuma|Zosungidwa pambuyo|Mali amakwesi|Mali ka mora|Mali panyuma|Mbongo kunyima|Mbongo kuyehi',
  "Members' savings": 'Ukusunga kwa banyina|Zosungidwa za mamembala|Mali aabbadelwa aabamembala|Mali a bolokilwe a bamemba|Mali yasungwa ya bamembala|Mbongo yasandi ya amembala|Mbongo yasekwa ya vamembala',
  'Cash in the pool': 'Ndalama shaikatilwe|Ndalama mu thumba|Mali mucisaka|Mali mwa setulo|Mali mu bwine|Mbongo muchisaka|Mbongo muchisaka',
  'Contribution': 'Ukusunga|Zopereka|Kubbadela|Ku boloka|Kusunga|Kusanda|Kuseka',
  'Contributions': 'Ukusunga|Zopereka|Kubbadela|Ku boloka|Kusunga|Kusanda|Kuseka',
  'Contribution (K)': 'Ukusunga (K)|Zopereka (K)|Kubbadela (K)|Ku boloka (K)|Kusunga (K)|Kusanda (K)|Kuseka (K)',
  'Contributed': 'Fyasungwa|Zoperekedwa|Cabbadelwa|Se ba bolokile|Kyasungwa|Chasandi|Chasekwa',
  'Fine': 'Ifine|Chindapusa|Cilango|Sisupo|Ifine|Ifine|Ifine',
  'Fines': 'Ifine|Zindapusa|Milango|Lisupo|Ifine|Ifine|Ifine',
  'Fines collected': 'Ifine fyaputulwa|Zindapusa zosonkhanitsidwa|Milango iikkedwe|Lisupo ze ba bokile|Ifine yaangulwa|Ifine yasonkelwa|Ifine vyasonekwa',
  'Late fine (K)': 'Ifine lya kwelela (K)|Chindapusa chochedwa (K)|Cilango cakuccererwa (K)|Sisupo sa ku liehela (K)|Ifine ya kukowela (K)|Ifine yakuchelela (K)|Ifine yakuhwehwa (K)',
  'Absence fine (K)': 'Ifine ya kubula (K)|Chindapusa chosapezeka (K)|Cilango cakutaboneka (K)|Sisupo sa ku ba sa teng (K)|Ifine ya kubula (K)|Ifine yakuhana (K)|Ifine yakuhana (K)',
  'Apply late fines': 'Lemba ifine fya kwelela|Perekani zindapusa zochedwa|Amubikke milango yakuccererwa|Mu beye lisupo za ku liehela|Bika ifine ya kukowela|Bika ifine yakuchelela|Bika ifine yakuhwehwa',
  'Principal': 'Ndalama shatendeka|Ndalama yoyamba|Mali aakusaanguna|Mali a pili|Mali ya kusanguka|Mbongo yakusambilila|Mbongo yakusaka',
  'Principal (K)': 'Ndalama shatendeka (K)|Ndalama yoyamba (K)|Mali aakusaanguna (K)|Mali a pili (K)|Mali ya kusanguka (K)|Mbongo yakusambilila (K)|Mbongo yakusaka (K)',
  'Interest': '|Chiwongola dzanja|||||',
  'Instalments': 'Ifipande|Magawo|Zipande|Likalolo|Bipande|Mapandu|Vipande',
  'Loan limit (× savings)': 'Umupaka wa nkongole (× ukusunga)|Malire a ngongole (× zosungidwa)|Mupaka wangongole (× kubbadela)|Mubeso wa koloto (× ku boloka)|Mupaka wa mwingo (× kusunga)|Mpaka wambongo yakuzeya (× kusanda)|Mpaka wachilanga (× kuseka)',
  'Outstanding': 'Ifyashala|Zotsala|Cisyedwe|Se si šetile|Kyashala|Chasalaña|Chasalako',
  'Next due': 'Ukulipila kwakonkapo|Malipiro otsatira|Kubbadela kutobelela|Ku busa ku latelezi|Kulipila kutwajilako|Kuzeya kwakukonkelaku|Kufweta kwakukonda',
  'Due': 'Ukulipila pa|Tsiku lolipira|Buzuba bwakubbadela|Ku lifa ka|Kulipila pa|Kuzeya dehi|Kufweta ku',
  'Paid': 'Fyalipilwa|Walipira|Bwabbadelwa|Ku lifilwe|Kwalipwa|Kwazeyi|Kwafwetwa',
  'Schedule': 'Ndandanda|Ndandanda|Ndandanda|Lenaneo|Ndandanda|Ndandanda|Ndandanda',
  'Disburse loan': 'Peela inkongole|Perekani ngongole|Amupe ngongole|Mu file koloto|Pa mwingo|Pana mbongo yakuzeya|Pa chilanga',
  'Record repayment': 'Landa ukulipila|Lembani malipiro|Amulembe kubbadela|Mu ñole ku busa|Lemba kulipila|Lemba kuzeya|Soneka kufweta',
  'Pool': '|Thumba|||||',
  'Payout': 'Ukupeela|Kulipira|Kubbadelela|Ku lifa|Kupana|Kupana|Kupa',
  'Pay out pot': 'Peela ndalama shonse|Lipirani ndalama zonse|Amubbadele mali oonse|Mu lifele mali kaufela|Pana mali yonse|Pana mbongo yejima|Pa mbongo yosena',
  'Share-out statement': 'Ifyalembwa fya kwabana|Chikalata cha logawana|Statement ya kupekezya|Statement ya ku aanya|Statement ya kupana|Statement ya kupana|Statement ya kwabana',
  'Recalculate': 'Bwekeshapo ukubala|Werenganinso|Amubale alubo|Mu balele hape|Bala kabiji|Balenu kapwa|Bala lyehi',
  'Approve and close cycle': 'Vomela no kupwisha inshiku|Vomerezani ndi kutseka nthawi|Amuzumine akumana nsaka|Mu tiyise mi mu notise nako|Zumina ne kupwisha nshiku|Zumina nikukumisha nsañu|Zumina nakuhwisa nyaka',
  // ledger and records
  'Date': 'Inshiku|Tsiku|Buzuba|Lizazi|Dyubo|Dehi|Chisuku',
  'When': 'Lilali|Liti|Lili|Lili|Lili|Kweni|Lyehi',
  'Type': 'Ifyo ciba|Mtundu|Mulimo|Mofuta|Mushindo|Mushindu|Mushindo',
  'By': 'Na|Ndi|Kuzwa kuli|Ki|Na|Nawa|Na',
  'To': 'Kuli|Kwa|Kuli|Ku|Kwa|Kudi|Kuli',
  'Who': 'Nani|Ndani|Nguni|Ki mang|Ani|Njiyi|Ngweji',
  'Message': 'Ubutumwa|Uthenga|Mulumbe|Molaetsa|Mukanda|Kalata|Mujimbu',
  'Entry': 'Icalembwa|Cholembedwa|Cakulembwa|Se si ñolilwe|Kilembwa|Chakulembeka|Chasonekwa',
  'Entity': 'Icintu|Chinthu|Cintu|Selo|Kintu|Chuma|Chuma',
  'Details': 'Ifyalembwa|Zambiri|Makani|Lintha|Mapo|Ifyakutala|Vyuma',
  'Action': 'Icakucita|Zochita|Cakucita|Ketso|Kyakuba|Chakuzata|Chakuzata',
  'Post entry': 'Landa icalembwa|Lembani|Amulembe|Mu ñole|Lemba|Lemba|Soneka',
  'Post': 'Landa|Tumizani|Amutume|Mu tume|Tuma|Tuma|Tuma',
  'Reverse': 'Bwesha|Bwezani|Amubweze|Mu busise|Bwezha|Zeyesha|Fwetesa',
  'Verify ledger chain': 'Alolesheshe ibuku|Tsimikizani buku la ndalama|Amulange bbuku|Mu lekisise buka|Lengai buku|Talenu buku|Talenu buku',
  'Delete': 'Ukufutapo|Chotsani|Amusule|Ku tuhela|Kufumya|Kufumisha|Kufumisa',
  'Delete this cycle': 'Futa inshiku ishi|Chotsani nthawi iyi|Amusule nsaka eeyi|Mu tuhele nako ye|Fumya nshiku ino|Fumisha nsañu yeniyi|Fumisa nyaka kanou',
  'Update': 'Shintilila|Sinthani|Amucince|Mu fetole|Shinja|Shinjika|Shinjika',
  'Open': 'Fungula|Tsegulani|Amuzibule|Mu bulele|Fungula|Bula|Fungula',
  'Start': 'Tendeka|Yambani|Amutalike|Mu simule|Tendeka|Tachikisha|Tachika',
  'End': 'Ukupwa|Mapeto|Kumana|Ku fela|Kupwa|Kukumisha|Kuhwa',
  // cycles and meetings
  'No open cycle.': 'Takwaba nshiku ishipyanga.|Palibe nthawi yotseguka.|Takuli nsaka iibuluzidwe.|Ha ku na nako e bulezi.|Kechi kuli nshiku yafunguka.|Kakuli nsañu yabulika.|Kuhana nyaka yafungulwa.',
  'Open cycle': 'Tendeka inshiku|Tsegulani nthawi|Amutalike nsaka|Mu bulele nako|Tendeka nshiku|Tachikisha nsañu|Tachika nyaka',
  'Open a new savings cycle': 'Tendeka inshiku shipya sha kusunga|Tsegulani nthawi yatsopano yosunga|Amutalike nsaka mpya yakubbadela|Mu bulele nako ye nca ya ku boloka|Tendeka nshiku ya kusunga ya pya|Tachikisha nsañu yipya yakusanda|Tachika nyaka yipya yakuseka',
  'Start meeting': 'Tendeka ukukumana|Yambitsani msonkhano|Amutalike muswaangano|Mu simule kopano|Tendeka kukumana|Tachikisha chipompelu|Tachika nkunguluko',
  'Meeting date': 'Inshiku ya kukumana|Tsiku la msonkhano|Buzuba bwamuswaangano|Lizazi la kopano|Dyubo dya kukumana|Dehi dyachipompelu|Chisuku chankunguluko',
  'Attendance': 'Ukuboneka|Kupezeka|Kuboneka|Ku ba teng|Kuboneka|Kuwanika|Kuhwanika',
  'Save attendance': 'Sunga ukuboneka|Sungani kupezeka|Bbadela kuboneka|Mu boloke ku ba teng|Sunga kuboneka|Sanda kuwanika|Seka kuhwanika',
  'Present': 'Aliko|Alipo|Uliko|U teng|Ulipo|Ali|Alipo',
  'Absent': 'Tabaliko|Palibe|Taboneki|Ha ba teng|Kechi alipo|Kakwali|Kuhana',
  'No meetings yet.': 'Takwaba ukukumana.|Palibe misonkhano.|Takuli miswaangano.|Ha ku na likopano.|Kechi kukumana.|Kakuli michipompelu.|Kuhana nkunguluko.',
  'No disputes.': 'Takwaba amakani.|Palibe mikangano.|Takuli mazwanga.|Ha ku na likanyiso.|Kechi makani.|Kakuli makani.|Kuhana makani.',
  // disputes, payments, sms
  'Uphold': 'Ukwishibila|Vomerezani|Amuzumine|Mu tiyise|Zumina|Tondolwenu|Zumina',
  'Reject': 'Ukukana|Kanani|Amukaane|Mu hanele|Kana|Kana|Kana',
  'Resolution': 'Ukupwisha|Chigamulo|Cisinizyo|Qeto|Kipwisho|Chakukumisha|Mpwisho',
  'Raised': 'Ifyo bapusha|Choperekedwa|Cakutumwa|Se si tisizwe|Kyatumwa|Chatumbi|Chatumwa',
  'Mobile money payments': 'Ukulipila pa mobile money|Malipiro a mobile money|Kubbadela amobile money|Ku lifa ka mobile money|Kulipila na mobile money|Kuzeya na mobile money|Kufweta na mobile money',
  'Confirmation text': 'Amalembo ya kushininkisha|Mawu otsimikizira|Majwi aakusinizya|Mutsebiso wa ku tiyisa|Mazwi a kusuminisha|Mazu akutondolola|Mazu akusimbwila',
  'Read receipt': 'Belenga|Werengani|Amubale|Mu bale|Bala|Balenu|Bala',
  'Match to member': 'Pamfya kuli umwina|Gwirizanitsani ndi membala|Amulange mumembala|Mu tokanise ni memba|Ambukanya na membala|Kwatishayi na membala|Hanyanya na membala',
  'Delivered': 'Fyafikile|Zafika|Cisikide|Li fihezi|Kyafika|Chafika|Chafika',
  'Queued': 'Fileshiba|Zikudikira|Zilindide|Li lutelezi|Kimwe|Chikutala|Vikulindila',
  'Failed': 'Fyalepwa|Zalephera|Cilemene|Li hanyehile|Kyalema|Chalema|Chalemena',
  'Retry': 'Esha kabili|Yesaninso|Amuyeeye alubo|Mu leke hape|Eshaiko kabiji|Eshenu kapwa|Eseka lyehi',
  'Print statement': 'Sindika|Sindikizani|Amukatile|Mu hatise|Sindika|Sindika|Sindika',
  'Statements and exports': 'Ma statement ne kutumina|Ma statement ndi kutumiza kunja|Ma statement alimwi akutuma|Li-statement ni ku romela|Ma statement ne kutuma|Ma statement nikutuma|Ma statement nakutuma',
  'Export ledger (CSV)': 'Tuma ibuku (CSV)|Tumizani buku (CSV)|Amutume bbuku (CSV)|Mu romele buka (CSV)|Tuma buku (CSV)|Tuma buku (CSV)|Tuma buku (CSV)',
  // security and settings
  'Change password': 'Shinta password|Sinthani password|Amucince password|Mu fetole password|Shinja password|Shinjika password|Shinjika password',
  'Set up two-factor': 'Longeshapo two-factor|Konzani two-factor|Amubambe two-factor|Mu lukulule two-factor|Bika two-factor|Bika two-factor|Bika two-factor',
  'Turn on': 'Tendeka|Yatsani|Amutanguni|Mu bulele|Pesha|Tachikisha|Hunga',
  'Turn off': 'Pwisha|Zimitsani|Amuyime|Mu notise|Dinga|Twalekawu|Pindila',
  "Member sign in": "Ukwingila kwa banyina|Kulowa kwa mamembala|Kwingila kwabamembala|Ku kena kwa bamemba|Kwingila kwa bamembala|Kwinjila kwa amembala|Kwingila kwavamembala",
  "New member? Sign up": "Membala mupya? Lembeshya|Membala watsopano? Lembetsani|Membala mupya? Lembeshya|Mumemba omupya? Ikalile|Membala mupya? Lembeshya|Mwanachama mpya? Jisajili|Membala mupya? Lembeshya",
  "Member sign up": "Ukulembeshya umembala|Kulembetsa umembala|Ukulembeshya umembala|Ku ikalila bumemba|Ukulembeshya umembala|Kujisajili kama mwanachama|Ukulembeshya umembala",
  "Already a member? Sign in": "Mwaba membala kale? Ingila|Ndinu membala kale? Lowani|Mwaba membala kale? Ingila|Mwabamemba kale? Kena|Mwaba membala kale? Ingila|Tayari mwanachama? Pinjani|Mwaba membala kale? Ingila",
  "Back to sign in": "Bwelela ku kwingila|Bwererani ku kulowa|Bwelela ku kwingila|Buyela ku kena|Bwelela ku kwingila|Rudi kwenye kuingia|Bwelela ku kwingila",
  "Sign in": "Ingila|Lowani|Ingila|Kena|Ingila|Pinjani|Ingila",
  "Continue": "Endelela|Pitani patsogolo|Amutwalile|Mu andike|Endelela|Endelela|Endelela",
  "Code from SMS": "Code ya mu SMS|Khodi ya mu SMS|Code yamu SMS|Khodi ya mwa SMS|Code ya mu SMS|Code yamu SMS|Code yamu SMS",
  "Verify": "Shininkisha|Tsimikizani|Amusinizye|Mu tiyise|Shininkisha|Tondolwenu|Simbwila",
  "My account": "Akaunti yandi|Akaunti yanga|Akaunti yangu|Akaunti ya ka|Akaunti yami|Akaunti yami|Akaunti yami",
  "Overview": "Chidule|Chidule|Cidule|Kakaretso|Chidule|Chidule|Chidule",
  "My entries": "Ifyalembwa fyandi|Zolembedwa zanga|Zakulembwa zangu|Se ne ñoliwe sa ka|Bilembwa byami|Vyakulembeka yami|Vyasonekwa vyami",
  "My loans": "Inkongole yandi|Ngongole zanga|Ngongole zangu|Likoloto za ka|Mwingo wami|Mbongo yakuzeya yami|Vilanga vyami",
  "Projected share-out": "Ukwabana ukwakulolelwa|Gawo loyerekezeka|Cibeela cilangilwa|Karolo e lakazelwa|Kipande kyalolelwa|Chipandu chakulandulwa|Kaputu kakulwezeka",
  "Loan balance": "Inkongole yashala|Ngongole yotsala|Ngongole iisyedwe|Koloto e šetile|Mwingo washala|Mbongo yakuzeya yasalaña|Chilanga chasalako",
  "Next payment": "Ukulipila kwakonkapo|Malipiro otsatira|Kubbadela kutobelela|Ku busa ku latelezi|Kulipila kutwajilako|Kuzeya kwakukonkelaku|Kufweta kwakukonda",
  "Query": "Epusha|Funsani|Amubuzye|Mu botise|Pula|Diwulenu|Pwenu",
  "Query sent": "Ukwipusha kwatumwa|Funso latumizidwa|Mubuzyo watumwa|Potiso i tumilwe|Kupula kwatumwa|Kudiwula kwatumbi|Kupwa kwatumwa",
  "Group pool": "Ndalama sha cilimba|Ndalama za gulu|Mali acibunga|Mali a sikwata|Mali a kipwilo|Mbongo yachikumbu|Mbongo yachisaka",
  "Reversed": "Yabwekeshiwa|Zabwezedwa|Cabweezyedwe|Li busitswe|Kyabwezhewa|Chazeyeshi|Chafwetesewa",
  "No entries yet.": "Tapali ifyalembwa.|Palibe zolembedwa.|Takuli cakulembwa.|Ha ku na se si ñolilwe.|Kechi kilembwa.|Kakuli chakulembeka.|Kuhana chasonekwa.",
  "No loans.": "Takwaba inkongole.|Palibe ngongole.|Takuli ngongole.|Ha ku na koloto.|Kechi mwingo.|Kakuli mbongo yakuzeya.|Kuhana chilanga.",
  "Under review": "Cilolwa|Ikuunikidwa|Cilangilwa|Si talwa|Kilangwa|Chitalwa|Chitalwa",
  'Code': '',
  'Ref': '',
};

Object.assign(DICT, DICT_MORE, DICT_NEW);

// ---- translation engine ----
// Works anywhere (also outside React): tr('Meeting on {date}', { date }) and server error text.
// Strings containing {name} act as templates and also match server messages that carry numbers.
let current = (() => { try { return localStorage.getItem('gs_lang') || 'en'; } catch { return 'en'; } })();

const fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ''));
const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let templates = null;
function getTemplates() {
  if (templates) return templates;
  templates = Object.keys(DICT).filter((k) => k.includes('{')).map((key) => {
    const names = [];
    const pattern = escapeRe(key).replace(/\\\{(\w+)\\\}/g, (_, n) => { names.push(n); return '(.+?)'; });
    return { key, names, re: new RegExp('^' + pattern + '$') };
  });
  return templates;
}

export function tr(text, vars, lang = current) {
  if (typeof text !== 'string' || !text) return text;
  if (lang === 'en') return fill(text, vars);
  const slot = SLOT[lang];
  const pick = (key) => { const e = DICT[key]; return e && slot !== undefined ? e.split('|')[slot] : ''; };
  const direct = pick(text);
  if (direct) return fill(direct, vars);
  if (!vars) { // a server message built from a template, e.g. "The pool only holds 500 ngwee"
    for (const tp of getTemplates()) {
      const m = tp.re.exec(text);
      if (m) {
        const v = {};
        tp.names.forEach((n, i) => { v[n] = m[i + 1]; });
        const out = pick(tp.key);
        if (out) return fill(out, v);
      }
    }
  }
  return fill(text, vars);
}

const I18n = createContext({ lang: 'en', setLang() {}, t: (s, v) => fill(s, v) });

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem('gs_lang') || 'en'; } catch { return 'en'; } });
  const setLang = useCallback((l) => {
    current = l;
    setLangState(l);
    try { localStorage.setItem('gs_lang', l); } catch { /* storage unavailable */ }
    document.documentElement.lang = l;
  }, []);
  const t = useCallback((s, vars) => tr(s, vars, lang), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export const useT = () => useContext(I18n).t;
export const useLang = () => useContext(I18n);

export function LanguageSelect({ className = 'langsel' }) {
  const { lang, setLang } = useLang();
  return (
    <select className={className} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
      {LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
    </select>
  );
}
