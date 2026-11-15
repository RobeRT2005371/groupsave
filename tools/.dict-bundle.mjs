// src/i18n.jsx
import { createContext, useCallback, useContext, useMemo, useState } from "react";

// src/i18n-more.js
var DICT_MORE = {
  // ---------- sign-in and marketing ----------
  "Every contribution recorded. Every member informed.": "Ukusunga konse kulalembwa. Abanyina bonse balishiba.|Zopereka zonse zalembedwa. Membala aliyense amadziwa.|Kubbadela kuliboonse kulalembwa. Bamembala boonse balizyiba.|Ku boloka kaufela ku \xF1olilwe. Bamemba kaufela ba ziba.|Kusunga kwa kyonse kulembwa. Bamembala bonse balishiba.|Kusanda kejima kulembeka\xF1a. Amembala ejima atela.|Kuseka kosena kusonekwa. Vamembala vosena vatachikiza.",
  "GroupSave replaces the exercise book with a shared, tamper-evident ledger for your chilimba group, with balances members can check from any phone.": "GroupSave isha mu kubuka kwa mu ncende ukubika ibuku lya ndalama ilingene bonse, ukuti abanyina bamone ndalama shabo pa feni iliyonse.|GroupSave imalowa m'malo mwa buku la zolemba ndi buku limodzi la gulu lonse, kuti mamembala aone ndalama zawo pa foni iliyonse.|GroupSave ilacinca bbuku lyabulembi aaciindi acibunga cabo, kuti bamembala babone mali aabo kufoni iili yoonse.|GroupSave i sebelisa buka e le ngwe ya sikwata kaufela, kuli bamemba ba bone mali a bona ka foni ifi ni ifi.|GroupSave ilubula buku wa kulemba ne buku umo wa kipwilo kyonse, bamembala bamone mali yabo pa foni yonse.|GroupSave yilombola buku dyimu dyachikumbu chejima, amembala atale mbongo yawu hafoni yejima.|GroupSave yinakulwisa buku limwe lyachisaka chosena, vamembala vatale mbongo yavo hafoni yosena.",
  "Loans, interest and share-outs calculated automatically": "Inkongole, inzala no kwabana fibalwa fye ne fine|Ngongole, chiwongola dzanja ndi logawana zimawerengedwa zokha|Ngongole, interest alimwi akupekezya zibalwa alikke|Likoloto, interest ni ku aanya li balwa ka bolona|Mwingo, interest ne kupana bibalwa bimo|Mbongo yakuzeya, interest nikupana yibala\xF1a yeni|Vilanga, interest nakwabana vibalwa vene",
  "SMS receipt with a verification code for every entry": "Ukupokelela kwa SMS ne code ya kushininkisha pa cintu conse|Chiphaso cha SMS ndi khodi yotsimikizira pa cholembedwa chilichonse|Cisinizyo ca SMS acode yakusinizya kucakulembwa coonse|Rasiti ya SMS ni khodi ya ku tiyisa ka se si \xF1olilwe se si \xF1wi ni se si \xF1wi|Rasiti ya SMS ne code ya kusuminisha pa kilembwa kyonse|Rasiti ya SMS ne code yakutondolola pachakulembeka chejima|Rasiti ya SMS na code yakusimbwila pachasonekwa chosena",
  "Full audit trail of who recorded what, and when": "Ifyalembwa fyonse ifyo umuntu alembele no lilali|Mbiri yonse ya amene analemba chiyani, ndi liti|Rekodi yoonse yamuntu wakalemba nzi alimwi lili|Buka kaufela ya ya \xF1oliile mang ni lili|Rekodi yonse ya yalemba bika ne lilumbi|Rekodi yejima yamuntu walemba chika nikwakumbi|Rekodi yosena yaze asoneka vika nalyehi",
  "Accumulating (lend and share out)": "Ukusunga (ukuboweshanya no kwabana)|Kusunga (kubwereketsa ndi kugawana)|Kubbadela (kuboola akupekezya)|Ku boloka (ku adima ni ku aanya)|Kusunga (kuzhima ne kupana)|Kusanda (kuzeya nikupana)|Kuseka (kuzeya nakwabana)",
  "Rotating (pot in turn)": "Ukwabana ukulola (umo umo)|Kuzungulira (mphika wamunthu mmodzi)|Kuyanduka (mali aabantu omwe)|Ku sinyehana (mali ku mu\xF1wi ni mu\xF1wi)|Kuzhuluka (mali kwa muntu umo)|Kuzungulula (mbongo kudi muntu mumu)|Kuzungulula (mbongo kuli muntu umwe)",
  "At least 8 characters with letters and numbers.": "Ifilembo 8 nokucilapo, ifilembo ne manambala.|Zilembo zosachepera 8 zokhala ndi zilembo ndi manambala.|Mabala otatafwi 8 abalembo amanamba.|Litaba li sa fiteli 8 ka litaba ni linomoro.|Bilembo bitaisha 8 bya mabala ne manambala.|Yilembu yita\xF1a 8 yamabala nimanambala.|Vilembo vita\xF1a 8 vyamabala namanambala.",
  "We send a one-time code by SMS to your phone. No password needed.": "Tukutuma code imo ku feni yobe pa SMS. Takwaba password.|Tikutumizirani khodi yogwiritsa ntchito kamodzi pa SMS. Simufuna password.|Tulamutumina code yaciindi comwe kufoni yanu. Takuyandika password.|Re ka le romela khodi ya lila le le li \xF1wi ka SMS. Ha ku hatulwi password.|Tukutuma code umo pa foni yenu. Kechi mufwaina password.|Twakutuma code yimu hafoni yenu. Kakuli password.|Tunakutuma code yimwe hafoni yenu. Kuhana password.",
  "If your number is registered, the code is on its way. It is valid for 10 minutes.": "Nga inambala yobe ilembwa, code iletila. Ilingile imineti 10.|Ngati nambala yanu yalembetsedwa, khodi ikubwera. Imagwira mphindi 10.|Kuti namba yanu ilembedwe, code ilaboola. Ilabeleka mamineti aali 10.|Haiba nomoro ya mina i \xF1olilwe, khodi i tla. I sebeza metsotso e 10.|Kuti nambala yenu ilembwa, code ileta. Ikokela maminiti 10.|Neyi nambala yenu yalembekawu, code yikwisa. Yikala mamineti 10.|Nge nambala yenu yasonekwa, code yikwiza. Yikala mamineti 10.",
  "Use a different number or resend": "Ubomfya inambala imbi nelyo ukutuma kabili|Gwiritsani nambala ina kapena tumizaninso|Amubelesye namba imbi naa kutuma alubo|Mu sebelise nomoro e \xF1wi kamba mu romele hape|Sebenzesha nambala imbi nangwa tuma kabiji|Zatishenu nambala yikwabo anyi tumenu kapwa|Tumisa nambala yimwe nyi tuma lyehi",
  "I am an officer": "Ndi kalemba wa cilimba|Ndine mtsogoleri|Ndime sibwanga|Ki mutahisi|Ame mukulumpe|Yami mwanta|Ami mutwamina",
  "Officer sign in": "Ukwingila kwa baleshi|Kulowa kwa atsogoleri|Kwingila kwabasilutwe|Ku kena kwa batahisi|Kwingila kwa bakulumpe|Kwinjila kwa atule\xF1i|Kwingila kwavatwamina",
  "Register your group": "Lembeshe icilimba cobe|Lembetsani gulu lanu|Amulembe cibunga canu|Mu \xF1ole sikwata sa mina|Lemba kipwilo kyenu|Lembenu chikumbu chenu|Soneka chisaka chenu",
  "Register a new group": "Lembeshe icilimba cipya|Lembetsani gulu latsopano|Amulembe cibunga cipya|Mu \xF1ole sikwata se si nca|Lemba kipwilo kya pya|Lembenu chikumbu chipya|Soneka chisaka chipya",
  "I already have an account": "Ndi na akaunti kale|Ndili kale ndi akaunti|Ndilijisi akaunti|Ni na ni akaunti|Ngwine akaunti kale|Ami nakweti akaunti|Ngwene akaunti",
  "Sign in": "Ingila|Lowani|Amwingile|Mu kene|Ingila|Injila|Ingila",
  "Create group": "Pangeni icilimba|Pangani gulu|Amuyake cibunga|Mu pang\xE9 sikwata|Pangai kipwilo|Panjikenu chikumbu|Panga chisaka",
  "Group type": "Ubwafya bwa cilimba|Mtundu wa gulu|Mulimo wacibunga|Mofuta wa sikwata|Mushindo wa kipwilo|Mushindu wachikumbu|Mushindo wachisaka",
  "Location ": "||||||",
  // ---------- page explanations ----------
  "Every action, who did it and when. This log is append-only.": "Ifyo bacita, uwaficitile no lilali. Ibuku ili lilembwa fye, talifumishiwa.|Zochita zonse, amene anazichita ndi liti. Mbiri iyi imangowonjezeredwa.|Zyoonse zyakacitwa, nguni alimwi lili. Rekodi eeyi iyungwa buyo.|Ketso kaufela, ya li ketileng ni lili. Buka ye i ekezwa feela.|Byonse byakanwa, ani ne lilumbi. Rekodi eyi yongelwa fyo.|Vyejima vyazata, njiyi nikwakumbi. Rekodi yeniyi yongeka hohu.|Vyosena vyazata, ngweji nalyehi. Rekodi kanou yongelwa hohu.",
  "Members flag entries from their phone (USSD option 4). Resolution notes are kept as history.": "Abanyina bapusha ifyalembwa pa feni (USSD 4). Ifyo bapwishisha filasungwa.|Mamembala amafunsa zolembedwa pa foni (USSD 4). Zigamulo zimasungidwa.|Bamembala balabuzya cakulembwa kufoni (USSD 4). Zisinizyo zilabambilwa.|Bamemba ba botisa ka foni (USSD 4). Likalafo li bolokwa.|Bamembala bapula bilembwa pa foni (USSD 4). Bipwisho bisungwa.|Amembala adiwula chakulembeka hafoni (USSD 4). Yakukumisha yasungawu.|Vamembala vapwa vyasonekwa hafoni (USSD 4). Mpwisho yasekwa.",
  "Entries are permanent and cannot be deleted. To fix a mistake, use Reverse, which adds a correcting entry and keeps the history.": "Ifyalembwa tafumishiwa. Ukulungika ubwafya, shimikeni Bwesha, ilembapo icalembwa cipya.|Zolembedwa sizichotsedwa. Kukonza cholakwika, gwiritsani Bwezani, yomwe imawonjezera cholembedwa chatsopano.|Zakulembwa tazisulwi. Kugwasya, amubelesye Bweze, ikubikka cakulembwa cipya.|Se si \xF1olilwe ha si tuhelwi. Ku lukisa liphoso, mu sebelise Busa, i eketsa se si nca.|Bilembwa kechi bifumishiwa. Kuwamisha, sebenzesha Bwezha, kyongela kilembwa kya pya.|Vyakulembeka kavifumishawu. Kulondolola, zatishenu Zeyesha, yilembaku chipya.|Vyasonekwa kavifumisiwa. Kuwahisa, tumisa Fwetesa, yinongela chasonekwa chipya.",
  "Record who attended. Absence fines post automatically and members get an SMS.": "Landeni abaleshibwa. Ifine lya kubula lilemba fye, abanyina balatambula SMS.|Lembani amene analipo. Zindapusa zosapezeka zimalowa zokha, mamembala amalandira SMS.|Amulembe aabo bakaliko. Milango yakutaboneka ilalembwa alike, bamembala balatambula SMS.|Mu \xF1ole ba ba bile teng. Lisupo za ku ba sa teng li \xF1olwa ka bolona, bamemba ba fumana SMS.|Lemba bakiliko. Ifine ya kubula yalembwa yeni, bamembala bapokelela SMS.|Lembenu atwesi. Ifine yakuhana yilembeka\xF1a yeni, amembala apokolela SMS.|Soneka vaze valiko. Ifine yakuhana yisonekwa yene, vamembala vapokola SMS.",
  "Members choose their own language when they first dial, and can change it any time from the USSD menu (option 6). Officers can also set it here. SMS receipts use the same language.": "Abanyina basala ululimi lwabo pa kutendeka, kabili balashintilila pa USSD (6). Abaleshi nabo balashintilila apa. SMS ikoma mu lulimi lumo.|Mamembala amasankha chilankhulo akayamba kuimba, ndipo amatha kusintha pa USSD (6). Atsogoleri amatha kusintha apa. SMS imakhala chimodzimodzi.|Bamembala balisala ciyaluulo cabo, alimwi balakucincinya pa USSD (6). Basilutwe balakucincinya aano. SMS ilaboola muciyaluulo comwe.|Bamemba ba itiba puo ya bona, mi ba ka fetola ka USSD (6). Batahisi ba ka i fetola mona. SMS i ba ka puo e swana.|Bamembala basala mwa kwamba, kabiji bashinja pa USSD (6). Bakulumpe bashinja pano. SMS yaya mu mwa kwamba umo.|Amembala asakula mwakulumbulwila, kaha ashinjika hakukumbuka USSD (6). Atule\xF1i ashinjika pano. SMS yikwisa mwakulumbulwila mumu.|Vamembala vasakula lilimi, kaha vashinjika pa USSD (6). Vatwamina vashinjika apa. SMS yikwiza lilimi limwe.",
  "Only officers can view the SMS log.": "Abaleshi fye nibo bamona ifya SMS.|Atsogoleri okha ndi omwe amatha kuona mauthenga a SMS.|Basilutwe buyo balakonzya kubona SMS.|Batahisi feela ba ka bona li-SMS.|Bakulumpe fyo bamona SMS.|Atule\xF1i hohu amona SMS.|Vatwamina hohu vamona SMS.",
  "Every posting sends the member a confirmation. Failed messages can be retried.": "Ifyalembwa fyonse fitumina umwina SMS. Ifilepwa fingeshiwa kabili.|Cholembedwa chilichonse chimatumiza uthenga kwa membala. Zolephera zimatha kuyesedwa kachiwiri.|Cakulembwa coonse cilatuma SMS kumumembala. Zilemene zilakonzya kweelwa alubo.|Se si \xF1olilwe se si \xF1wi ni se si \xF1wi si romela SMS. Tse di hanyehile di ka leka hape.|Kilembwa kyonse kitumina SMS. Byalema bishashiwa kabiji.|Chakulembeka chejima chitumina SMS. Chalema chakeshawu kapwa.|Chasonekwa chosena chituma SMS. Chalemena chesekwa lyehi.",
  "Only the chairperson and treasurer can match payments.": "Kapalume na kasunga ndalama fye nibo bapamfya ukulipila.|Wapampando ndi msungichuma okha ndi omwe amagwirizanitsa malipiro.|Sibwanga alimwi amwaalu wamali buyo balakonzya kugwasyilizya kubbadela.|Mutahisi ni mubolokisi feela ba ka tokanisa litefo.|Mukulumpe ne musungi wa mali fyo bambukanya kulipila.|Mwanta nimusungi wambongo hohu atachikisha kuzeya.|Mutwamina namusungi wambongo hohu vahanyanya kufweta.",
  "Paste a confirmation SMS, then choose the member it belongs to. Nothing is posted until you confirm.": "Bikeni SMS ya kushininkisha, mupinde musale umwina. Ifyalembwa tafilembwa mukanashininkisha.|Ikani SMS yotsimikizira, kenako sankhani membala. Palibe chimalembedwa mpaka mutsimikize.|Amubikke SMS yakusinizya, mukasale mumembala. Tazilembwi kusikila musinizye.|Mu apese SMS ya ku tiyisa, mi mu bate memba. Ha ku \xF1olwa se si \xF1wi ku fitela mu tiyisa.|Bika SMS ya kusuminisha, mukasale membala. Kechi kilembwa kufika musuminishe.|Bikenu SMS yakutondolola, musakule membala. Kakulembekawu mpinji mutondolola.|Bika SMS yakusimbwila, usakule membala. Kuhana kusoneka hanga usimbwile.",
  "Only officers can view statements.": "Abaleshi fye nibo bamona ifyalembwa.|Atsogoleri okha ndi omwe amaona ma statement.|Basilutwe buyo balakonzya kubona statement.|Batahisi feela ba ka bona li-statement.|Bakulumpe fyo bamona statement.|Atule\xF1i hohu amona statement.|Vatwamina hohu vamona statement.",
  "Print a member statement for a meeting, or export the whole ledger to a spreadsheet.": "Sindika ifyalembwa fya umwina pa kukumana, nelyo mutume ibuku lyonse.|Sindikizani statement ya membala pa msonkhano, kapena tumizani buku lonse ku spreadsheet.|Amukatile statement yamumembala kumuswaangano, naa mutume bbuku lyoonse.|Mu hatise statement ya memba kwa kopano, kamba mu romele buka kaufela.|Sindika statement ya membala pa kukumana, nangwa tuma buku yonse.|Sindikenu statement yamembala kuchipompelu, anyi tumenu buku dyejima.|Sindika statement yamembala kunkunguluko, nyi tuma buku lyosena.",
  "Codes match the verification code in the SMS the member received for each entry.": "Ama code yalingana ne code mu SMS iyo umwina apokelele pa cintu conse.|Ma khodi amafanana ndi khodi mu SMS imene membala analandira pa cholembedwa chilichonse.|Ma code alafwaanana acode mu SMS iyo mumembala njakatambula acakulembwa coonse.|Li-khodi li tokana ni khodi ya SMS ye memba a e fumaneng ka se se \xF1wi ni se se \xF1wi.|Ma code yanyana ne code mu SMS yapokelwa na membala pa kilembwa kyonse.|Ma code ayanana nacode muSMS yapokola membala pachakulembeka chejima.|Ma code yakwata kuwana nacode muSMS yapokola vamembala pachasonekwa chosena.",
  "The code beside each entry should match the code in the SMS you received for it.": "Code iyo mwabona pa cintu conse yalingile ukulingana ne mu SMS iyo mwapokelele.|Khodi yomwe ili pafupi ndi cholembedwa chilichonse iyenera kufanana ndi yomwe munalandira mu SMS.|Code iili afwiini acakulembwa coonse ilayandika kufwaanana acode mu SMS njomwakatambula.|Khodi ye li pela ni se si \xF1wi ni se si \xF1wi i swanela ku tokana ni ya SMS ye mu e fumaneng.|Code ya pa kilembwa kyonse yafwainwa kunyana ne ya mu SMS yapokelwa nenu.|Code yidi hakachakulembeka chejima yelela kwanyana nayamuSMS yapokolwa nenu.|Code yili hacasonekwa chosena yelela kuwana namuSMS yapokola nenu.",
  "Protects the ledger even if your password is stolen. Works with Google Authenticator, Microsoft Authenticator or Authy.": "Isunga ibuku nangu password yobe yaibwa. Ikwanisha na Google Authenticator, Microsoft Authenticator nelyo Authy.|Imateteza buku ngakhale password yanu itabedwe. Imagwira ndi Google Authenticator, Microsoft Authenticator kapena Authy.|Ilakwabilila bbuku nokuba kuti password yanu yabbwa. Ilabeleka a Google Authenticator, Microsoft Authenticator naa Authy.|I sireletsa buka le haiba password ya mina i utswitswe. I sebeza ni Google Authenticator, Microsoft Authenticator kamba Authy.|Ilinda buku nangwa password yenu yabiwa. Yoba na Google Authenticator, Microsoft Authenticator nangwa Authy.|Yikinga buku nangwa password yenu yawuma. Yikwata nakuzata na Google Authenticator, Microsoft Authenticator anyi Authy.|Yikinga buku nangwa password yenu yawiwa. Yizata na Google Authenticator, Microsoft Authenticator nyi Authy.",
  "Can't scan? Enter this key manually:": "Mwalepwa ukusikena? Lembeni ici cikoso:|Simungathe kusikena? Lembani kiyi iyi pamanja:|Tamukonzyi kusikena? Amulembe kiyi eeyi:|Ha mu koni ku skena? Mu \xF1ole kiyi ye:|Kechi mubwanya kusikena? Lemba kiyi eyi:|Kamwakwanisha kusikena? Lembenu kiyi yeniyi:|Kuhana kusikena? Soneka kiyi kanou:",
  "6-digit code": "Code ya manambala 6|Khodi ya manambala 6|Code yamanamba 6|Khodi ya linomoro li 6|Code ya manambala 6|Code yamanambala 6|Code yamanambala 6",
  "Rules are fixed when a cycle opens; changes apply to the next cycle.": "Amafunde yasungwa inshiku shatendeka; ukushintilila kuya ku nshiku shilefwaya.|Malamulo amakhazikika nthawi ikatsegulidwa; kusintha kumagwira nthawi yotsatira.|Milawo ilakwabililwa nsaka yatalika; kucinca kulabeleka nsaka itobelela.|Melao i tiya ha nako i buliwa; liphetoho li sebeza nakong e latelezi.|Mizhilo yabula nshiku yatendeka; kushinja kwafika nshiku yakonkapo.|Mizhi yikala nsa\xF1u yatachikisha; kushinjika kwikala nsa\xF1u yakonkelaku.|Mizhilo yikala nyaka yatachika; kushinjika kuyenda nyaka yakukonda.",
  "No open cycle. Ask the chairperson to open one.": "Takwaba inshiku. Mwipushe kapalume ukutendeka imo.|Palibe nthawi yotseguka. Pemphani wapampando atsegule.|Takuli nsaka iibuluzidwe. Amubuzye sibwanga kuti ibule.|Ha ku na nako e bulezi. Mu kope mutahisi a e bule.|Kechi kuli nshiku yafunguka. Pula mukulumpe afungule.|Kakuli nsa\xF1u yabulika. Lombenu mwanta abule.|Kuhana nyaka yafungulwa. Pwenu mutwamina afungule.",
  "Protect the ledger:": "Sunga ibuku:|Tetezani buku:|Amukwabilile bbuku:|Mu sireletse buka:|Linda buku:|Kinganenu buku:|Kinga buku:",
  " turn on two-factor sign-in for your account.": " tendeka two-factor pa akaunti yobe.| yatsani two-factor pa akaunti yanu.| amwiite two-factor kuakaunti yanu.| mu bulele two-factor ku akaunti ya mina.| tendeka two-factor pa akaunti yenu.| tachikishenu two-factor kuakaunti yenu.| tachika two-factor kuakaunti yenu.",
  "Set up now \u2192": "Tendeka nomba \u2192|Konzani tsopano \u2192|Amubambe sunu \u2192|Mu e hlophise sunu \u2192|Bika lelo \u2192|Bikenu lelo \u2192|Bika lelo \u2192",
  "overview of savings, loans and the pool": "ukulolesha ukusunga, inkongole ne ndalama shonse|chidule cha zosungidwa, ngongole ndi thumba|kulangilila kubbadela, ngongole acisaka|kakaretso ya ku boloka, likoloto ni setulo|kuwamisha kusunga, mwingo ne mali yonse|chidule chakusanda, mbongo yakuzeya nichisaka|chidule chakuseka, vilanga nachisaka",
  "Cycle": "Inshiku|Nthawi|Nsaka|Nako|Nshiku|Nsa\xF1u|Nyaka",
  "Cycle {start} \u2013 {end}": "Inshiku {start} \u2013 {end}|Nthawi {start} \u2013 {end}|Nsaka {start} \u2013 {end}|Nako {start} \u2013 {end}|Nshiku {start} \u2013 {end}|Nsa\xF1u {start} \u2013 {end}|Nyaka {start} \u2013 {end}",
  "Rules: {contribution} {frequency}; interest {interest}% per period ({basis}); loan limit {limit}\xD7 savings; late fine {fine}; share-out by {shareout}.": "Amafunde: {contribution} {frequency}; inzala {interest}% pa nshiku ({basis}); umupaka wa nkongole {limit}\xD7 ukusunga; ifine {fine}; ukwabana kwa {shareout}.|Malamulo: {contribution} {frequency}; chiwongola dzanja {interest}% pa nthawi ({basis}); malire a ngongole {limit}\xD7 zosungidwa; chindapusa {fine}; logawana ndi {shareout}.|Milawo: {contribution} {frequency}; interest {interest}% {basis}; mupaka wangongole {limit}\xD7 kubbadela; cilango {fine}; kupekezya {shareout}.|Melao: {contribution} {frequency}; interest {interest}% ({basis}); mubeso wa koloto {limit}\xD7 ku boloka; sisupo {fine}; ku aanya {shareout}.|Mizhilo: {contribution} {frequency}; interest {interest}% ({basis}); mupaka wa mwingo {limit}\xD7 kusunga; ifine {fine}; kupana {shareout}.|Mizhi: {contribution} {frequency}; interest {interest}% ({basis}); mpaka wambongo yakuzeya {limit}\xD7 kusanda; ifine {fine}; kupana {shareout}.|Mizhilo: {contribution} {frequency}; interest {interest}% ({basis}); mpaka wachilanga {limit}\xD7 kuseka; ifine {fine}; kwabana {shareout}.",
  "Limit: {limit}\xD7 the member's savings, less what they already owe. Interest {interest}% per period ({basis}).": "Umupaka: {limit}\xD7 ukusunga kwa umwina, ukufumyapo ifyo aleshala. Inzala {interest}% ({basis}).|Malire: {limit}\xD7 zosungidwa za membala, kuchotsapo zomwe ali nazo. Chiwongola dzanja {interest}% ({basis}).|Mupaka: {limit}\xD7 kubbadela kwamumembala, kuzwa ngongole njali. Interest {interest}% ({basis}).|Mubeso: {limit}\xD7 ya ku boloka ya memba, ku tuha ye a e kolota. Interest {interest}% ({basis}).|Mupaka: {limit}\xD7 kusunga kwa membala, kufumya mwingo wakwete. Interest {interest}% ({basis}).|Mpaka: {limit}\xD7 kusanda kwamembala, kufumisha mbongo yakuzeya yakweti. Interest {interest}% ({basis}).|Mpaka: {limit}\xD7 kuseka kwamembala, kufumisa chilanga akweti. Interest {interest}% ({basis}).",
  "Meeting on {date}": "Ukukumana pa {date}|Msonkhano wa pa {date}|Muswaangano wa {date}|Kopano ya {date}|Kukumana pa {date}|Chipompelu dehi {date}|Nkunguluko ku {date}",
  "Absentees are fined {amount} once.": "Abaleshibwa balapeelwa ifine lya {amount} imo.|Osapezeka amalipira chindapusa cha {amount} kamodzi.|Batakaboneka balapegwa cilango ca {amount} lyomwe.|Ba sa teng ba lifa sisupo sa {amount} lila le le li \xF1wi.|Bakabula bapana ifine ya {amount} umo.|Atuhana apanishawu ifine yamuku {amount} dimu.|Vaze vahana vapanisiwa ifine ya {amount} limwe.",
  "Pot of {amount} paid to {name}": "Ndalama shonse {amount} shapeelwa {name}|Ndalama zonse {amount} zalipidwa kwa {name}|Mali oonse {amount} abbadelwa {name}|Mali kaufela {amount} a file {name}|Mali yonse {amount} yapanwa {name}|Mbongo yejima {amount} yapanawu {name}|Mbongo yosena {amount} yapeleka {name}",
  "Pot collected:": "Ndalama shaikatilwe:|Ndalama zosonkhanitsidwa:|Mali aasonkedwe:|Mali a bokilwe:|Mali yasonkelwa:|Mbongo yasonkelwa:|Mbongo yasonekwa:",
  "Whose turn?": "Ni wani?|Ndi ndani?|Nguni?|Ki mang?|Ani?|Njiyi?|Ngweji?",
  "Statement for {name}": "Ifyalembwa fya {name}|Statement ya {name}|Statement ya {name}|Statement ya {name}|Statement ya {name}|Statement ya {name}|Statement ya {name}",
  "Generated {date} \xB7 Savings {savings} \xB7 Fines {fines}": "Cilembwa {date} \xB7 Ukusunga {savings} \xB7 Ifine {fines}|Yapangidwa {date} \xB7 Zosungidwa {savings} \xB7 Zindapusa {fines}|Yapangidwa {date} \xB7 Kubbadela {savings} \xB7 Milango {fines}|E entswe {date} \xB7 Ku boloka {savings} \xB7 Lisupo {fines}|Yapangwa {date} \xB7 Kusunga {savings} \xB7 Ifine {fines}|Yapwisha {date} \xB7 Kusanda {savings} \xB7 Ifine {fines}|Yapangwa {date} \xB7 Kuseka {savings} \xB7 Ifine {fines}",
  "Loans: {list}": "Inkongole: {list}|Ngongole: {list}|Ngongole: {list}|Likoloto: {list}|Mwingo: {list}|Mbongo yakuzeya: {list}|Vilanga: {list}",
  "Chain intact \xB7 {count} entries \xB7 head code {head}": "Ibuku lili bwino \xB7 ifyalembwa {count} \xB7 code {head}|Buku lili bwino \xB7 zolembedwa {count} \xB7 khodi {head}|Bbuku lili kabotu \xB7 zakulembwa {count} \xB7 code {head}|Buka i siame \xB7 se si \xF1olilwe {count} \xB7 khodi {head}|Buku wawama \xB7 bilembwa {count} \xB7 code {head}|Buku dyawaha \xB7 vyakulembeka {count} \xB7 code {head}|Buku lyawaha \xB7 vyasonekwa {count} \xB7 code {head}",
  "Chain broken at entry {id}": "Ibuku lyaputuka pa cintu {id}|Buku lasweka pa cholembedwa {id}|Bbuku lyaparwa kucakulembwa {id}|Buka i robehile ka se {id}|Buku wavunika pa kilembwa {id}|Buku dyako\xF1a pachakulembeka {id}|Buku lyavunika pachasonekwa {id}",
  "Signed in as {name}. Sessions end after 15 minutes of inactivity.": "Mwingile nga {name}. Ukwingila kupwa panuma ya mineti 15 ukubula ukubomba.|Mwalowa ngati {name}. Gawo limatha pakadutsa mphindi 15 osachita kanthu.|Mwayinga {name}. Kwingila kulamana kumbele lyamamineti 15.|U kene jwalo ka {name}. Nako i fela ka metsotso e 15 ha ku si na ketso.|Mwingila {name}. Kwingila kupwa panyuma ya maminiti 15.|Mwinjila {name}. Kwinjila kukumisha mamineti 15 kakwosha.|Mwingila {name}. Kwingila kuhwa mamineti 15 kuhana kuzata.",
  "Accounts lock for 15 minutes after 5 wrong passwords. Every sign-in, failed attempt and security change is written to the audit log.": "Akaunti ilalyalwa imineti 15 panuma ya ma password 5 yapusa. Ukwingila konse kulembwa.|Akaunti imatsekeka mphindi 15 pambuyo pa ma password 5 olakwika. Kulowa kulikonse kumalembedwa.|Akaunti ilaanjililwa mamineti aali 15 kumbele lyama password 5 aali bubi. Kwingila koonse kulalembwa.|Akaunti i notwa metsotso e 15 ka mora li-password tse 5 tse fosahetseng. Ku kena kaufela ku \xF1olwa.|Akaunti yadinga maminiti 15 panyuma ya ma password 5 apote. Kwingila konse kulembwa.|Akaunti yatwalekawu mamineti 15 kunyima yama password 5 ako\xF1a. Kwinjila kwejima kulembeka\xF1a.|Akaunti yapindilwa mamineti 15 kuyehi yama password 5 akolwesa. Kwingila kwosena kusonekwa.",
  "Preview for the group to approve. Payouts are split in proportion to {basis} and always add up exactly to the pool.": "Ulolesho ukuti icilimba cipokelele. Ukwabana kulingana na {basis}, kabili kulingana ne ndalama shonse.|Chitsanzo choti gulu livomereze. Logawana limagawidwa molingana ndi {basis} ndipo limafanana ndi thumba lonse.|Cikozyanyo cakuti cibunga cizumine. Kupekezya kulabeleka kweelana a {basis}, alimwi kulafwaanana acisaka coonse.|Pono ya hore sikwata si e amohele. Ku aanya ku latelana ni {basis} mi ku lekana ni setulo kaufela.|Kulangulula kwa kipwilo kuzumine. Kupana kwanyana na {basis}, kabiji kwanyana ne mali yonse.|Kutala kwachikumbu kuzumine. Kupana kwanyana na {basis}, kaha kwanyana nambongo yejima.|Kutala chisaka chizumine. Kwabana kuwana na {basis}, kaha kuwana nambongo yosena.",
  // ---------- messages after an action ----------
  "Done": "Cawama|Zachitika|Cicitidwe|Ho phethilwe|Kyawama|Yawahisha|Kwapwa",
  "Cycle opened": "Inshiku yatendeka|Nthawi yatsegulidwa|Nsaka yabuluzidwe|Nako i buliwe|Nshiku yafunguka|Nsa\xF1u yabulika|Nyaka yafungulwa",
  "Cycle deleted": "Inshiku yafumishiwa|Nthawi yachotsedwa|Nsaka yasulwa|Nako i tuhilwe|Nshiku yafumishiwa|Nsa\xF1u yafumishawu|Nyaka yafumisiwa",
  "Cycle closed and payouts posted": "Inshiku yapwa, ukwabana kwalembwa|Nthawi yatsekedwa, malipiro alembedwa|Nsaka yamana, kupekezya kwalembwa|Nako i notilwe, ku aanya ku \xF1olilwe|Nshiku yapwa, kupana kwalembwa|Nsa\xF1u yakumisha, kupana kwalembekawu|Nyaka yahwa, kwabana kwasonekwa",
  "Delete this cycle? Only possible if it has no entries or loans.": "Mufumya iyi nshiku? Kulingile fye ngatapali ifyalembwa nelyo inkongole.|Chotsani nthawi iyi? Zingatheke ngati ilibe zolembedwa kapena ngongole.|Mulasula nsaka eeyi? Kulakonzya buyo kuti taina zakulembwa naa ngongole.|Mu tuhe nako ye? Ho khoneha feela haiba ha e na se si \xF1olilwe kamba koloto.|Mufumya nshiku ino? Kwafwaina kuba kechi kuli bilembwa nangwa mwingo.|Mufumisha nsa\xF1u yeniyi? Kwakwanisha neyi kakuli vyakulembeka anyi mbongo yakuzeya.|Mufumisa nyaka kanou? Kwakwanisa nge kuhana vyasonekwa nyi vilanga.",
  "Close the cycle and post these payouts to the ledger? This cannot be undone.": "Mupwisha inshiku no kulemba ukwabana? Tacingabwekeshiwa.|Tsekani nthawi ndi kulemba malipiro? Sizingabwezedwe.|Mulamana nsaka akulemba kupekezya? Tacikonzyi kubwezyedwa.|Mu note nako mi mu \xF1ole ku aanya? Ha ku koneha ku busa.|Mupwisha nshiku ne kulemba kupana? Kechi kubwezhewa.|Mukumisha nsa\xF1u nikulemba kupana? Kakwakwanisha kuzeyesha.|Muhwisa nyaka nakusoneka kwabana? Kuhana kufwetesa.",
  "Dispute resolved": "Ubwafya bwapwa|Mkangano wathetsedwa|Cazwanga cimanizidwe|Likanyiso li rarolotswe|Makani apwa|Makani akumishawu|Makani apwa",
  "Posted. Member notified by SMS.": "Calembwa. Umwina atumiwa SMS.|Cholembedwa. Membala wauzidwa ndi SMS.|Calembwa. Mumembala watumina SMS.|Se \xF1olilwe. Memba u rometswe SMS.|Kyalembwa. Membala watumwa SMS.|Chalembekawu. Membala watumbi SMS.|Chasonekwa. Membala watumwa SMS.",
  "Reversal posted": "Ukubwesha kwalembwa|Kubweza kwalembedwa|Kubweza kwalembwa|Ku busa ku \xF1olilwe|Kubwezha kwalembwa|Kuzeyesha kwalembekawu|Kufwetesa kwasonekwa",
  "Checked": "Cilolwa|Kwayang'aniridwa|Cilangilwe|Ho lekisisitswe|Kyalangwa|Kwatalawu|Kwatalwa",
  "Reason for reversing this entry?": "Cinshi mwabwesha icalembwa ici?|Chifukwa chiyani mukubweza cholembedwa ichi?|Nkaambo nzi mubweza cakulembwa eeci?|Ke ka lebaka la eng ha mu busa se?|Mulandu ka mubwezha kilembwa kino?|Mulandu muka mwazeyesha chakulembeka cheniki?|Mulandu muka mufwetesa chasonekwa kanou?",
  "Reversal": "Ukubwesha|Kubweza|Kubweza|Ku busa|Kubwezha|Kuzeyesha|Kufwetesa",
  "Loan disbursed. Member notified by SMS.": "Inkongole yapeelwa. Umwina atumiwa SMS.|Ngongole yaperekedwa. Membala wauzidwa ndi SMS.|Ngongole yapegwa. Mumembala watumina SMS.|Koloto e filwe. Memba u rometswe SMS.|Mwingo wapanwa. Membala watumwa SMS.|Mbongo yakuzeya yapanawu. Membala watumbi SMS.|Chilanga chapeleka. Membala watumwa SMS.",
  "Repayment recorded": "Ukulipila kwalembwa|Malipiro alembedwa|Kubbadela kwalembwa|Ku busa ku \xF1olilwe|Kulipila kwalembwa|Kuzeya kwalembekawu|Kufweta kwasonekwa",
  "Late fines applied": "Ifine lya kwelela lyalembwa|Zindapusa zochedwa zayikidwa|Milango yakuccererwa yabikkwa|Lisupo za ku liehela li beilwe|Ifine ya kukowela yabikwa|Ifine yakuchelela yabikawu|Ifine yakuhwehwa yabikwa",
  "Repayment amount in Kwacha (outstanding {amount})": "Ubunonshi bwa kulipila mu Kwacha (ifyashala {amount})|Ndalama zolipira mu Kwacha (zotsala {amount})|Mali aakubbadela muKwacha (aasyedwe {amount})|Mali a ku busa ka Kwacha (a \u0161etile {amount})|Mali ya kulipila mu Kwacha (yashala {amount})|Mbongo yakuzeya muKwacha (yasala\xF1a {amount})|Mbongo yakufweta muKwacha (yasalako {amount})",
  "Attendance saved. New absentees were fined and notified.": "Ukuboneka kwasungwa. Abatabaliko bapeelwa ifine no kutumiwa SMS.|Kupezeka kwasungidwa. Osapezeka atsopano alipira chindapusa ndi kuuzidwa.|Kuboneka kwabbadelwa. Batakaboneka bapegwa cilango akutumina.|Ku ba teng ku bolokilwe. Ba ba sa teng ba lifa sisupo mi ba rometswe SMS.|Kuboneka kwasungwa. Bakabula bapanwa ifine ne kutumwa.|Kuwanika kwasandawu. Atuhana apanawu ifine nikutumbwa.|Kuhwanika kwasekwa. Vaze vahana vapeleka ifine nakutumwa.",
  "Pot paid out. Member notified by SMS.": "Ndalama shonse shapeelwa. Umwina atumiwa SMS.|Ndalama zonse zalipidwa. Membala wauzidwa ndi SMS.|Mali oonse abbadelwa. Mumembala watumina SMS.|Mali kaufela a file. Memba u rometswe SMS.|Mali yonse yapanwa. Membala watumwa SMS.|Mbongo yejima yapanawu. Membala watumbi SMS.|Mbongo yosena yapeleka. Membala watumwa SMS.",
  "Meeting created": "Ukukumana kwatendeka|Msonkhano wapangidwa|Muswaangano wapangwa|Kopano e entswe|Kukumana kwapangwa|Chipompelu chapangawu|Nkunguluko yapangwa",
  "Delete this meeting? Only possible if nothing was recorded at it.": "Mufumya uku kukumana? Kulingile fye ngatapali icalembwa.|Chotsani msonkhano uwu? Zingatheke ngati palibe cholembedwa.|Mulasula muswaangano ooyu? Kulakonzya buyo kuti takwalembwa cintu.|Mu tuhe kopano ye? Ho khoneha feela haiba ha ho na se si \xF1olilwe.|Mufumya kukumana kuno? Kwafwaina kuba kechi kilembwa.|Mufumisha chipompelu cheniki? Kwakwanisha neyi kakuli chakulembeka.|Mufumisa nkunguluko kanou? Kwakwanisa nge kuhana chasonekwa.",
  "Meeting deleted": "Ukukumana kwafumishiwa|Msonkhano wachotsedwa|Muswaangano wasulwa|Kopano e tuhilwe|Kukumana kwafumishiwa|Chipompelu chafumishawu|Nkunguluko yafumisiwa",
  "Member added": "Umwina aikatwa|Membala wawonjezedwa|Mumembala wayungwa|Memba u tahisizwe|Membala wongelwa|Membala wongekawu|Membala waongelwa",
  "Permanently delete {name}? This only works for members with no ledger history.": "Mufumya {name} ukufika pa muyayaya? Kulingile fye ngatapali ifyalembwa.|Chotsani {name} kwamuyaya? Zingatheke ngati alibe zolembedwa.|Mulasula {name} lyoonse? Kulakonzya buyo kuti taina zakulembwa.|Mu tuhe {name} ka ku sa feleng? Ho khoneha feela haiba ha a na se si \xF1olilwe.|Mufumya {name} lyonse? Kwafwaina kuba kechi bilembwa.|Mufumisha {name} kuya? Kwakwanisha neyi kakuli vyakulembeka.|Mufumisa {name} lyonse? Kwakwanisa nge kuhana vyasonekwa.",
  "Member deleted": "Umwina afumishiwa|Membala wachotsedwa|Mumembala wasulwa|Memba u tuhilwe|Membala wafumishiwa|Membala wafumishawu|Membala wafumisiwa",
  "Language updated": "Ululimi lwashintilwa|Chilankhulo chasinthidwa|Ciyaluulo cacinchinwa|Puo i fetohilwe|Mwa kwamba kwashinjika|Mwakulumbulwila mwashinjikawu|Lilimi lyalinjikilwa",
  "PIN reset; member chooses a new one on next dial": "PIN yashintilwa; umwina asala imbi pa kuimba|PIN yakonzedwanso; membala asankha yatsopano akadzaimba|PIN yabwezedwa; mumembala usala imbi lyakuyimba|PIN i buyisezwa; memba u ka kgetha e nca|PIN yabwezhewa; membala usala ya pya|PIN yadiluwa; membala wasakula yipya|PIN yahuluwa; membala wasakula yipya",
  "Updated": "Cashintilwa|Zasinthidwa|Cicinchidwe|Ho fetotswe|Kyashinjika|Yashinjikawu|Kwashinjika",
  "Queued for retry": "Cili mu kwesha kabili|Ikudikira kuyesedwa|Cilindide kweelwa alubo|Li lutelezi ho leka hape|Kimwe kushasha kabiji|Chikutala kakeshawu|Vikulindila kweseka",
  "Message removed from log": "Ubutumwa bwafumishiwa|Uthenga wachotsedwa|Mulumbe wasulwa|Molaetsa o tuhilwe|Mukanda wafumishiwa|Kalata yafumishawu|Mujimbu wafumisiwa",
  "Delete this receipt?": "Mufumya aka kalata?|Chotsani chiphasochi?|Mulasula cisinizyo eeci?|Mu tuhe rasiti ye?|Mufumya rasiti ino?|Mufumisha rasiti yeniyi?|Mufumisa rasiti kanou?",
  "Receipt added": "Icikalata calemba|Chiphaso chawonjezedwa|Cisinizyo cayungwa|Rasiti e kentswe|Rasiti yongelwa|Rasiti yongekawu|Rasiti yaongelwa",
  "Receipt deleted": "Icikalata cafumishiwa|Chiphaso chachotsedwa|Cisinizyo casulwa|Rasiti e tuhilwe|Rasiti yafumishiwa|Rasiti yafumishawu|Rasiti yafumisiwa",
  "Contribution posted": "Ukusunga kwalembwa|Chopereka chalembedwa|Kubbadela kwalembwa|Ku boloka ku \xF1olilwe|Kusunga kwalembwa|Kusanda kwalembekawu|Kuseka kwasonekwa",
  "Password changed": "Password yashintilwa|Password yasinthidwa|Password yacinchidwe|Password i fetohilwe|Password yashinjika|Password yashinjikawu|Password yashinjika",
  "Scan the code with your authenticator app, then enter the 6-digit code below.": "Sikenani code na app ya authenticator, mulembe code ya manambala 6.|Sikenani khodi ndi app yanu ya authenticator, kenako lembani khodi ya manambala 6.|Amusikene code aapu yanu ya authenticator, mulembe code yamanamba 6.|Mu skene khodi ka app ya authenticator, mi mu \xF1ole khodi ya linomoro li 6.|Sikena code na app ya authenticator, lemba code ya manambala 6.|Sikenu code naapu yenu yaauthenticator, lembenu code yamanambala 6.|Sikena code naapu yenu yaauthenticator, soneka code yamanambala 6.",
  "Two-factor sign-in is now on": "Two-factor yatendeka nomba|Two-factor tsopano yayatsidwa|Two-factor yaiswe sunu|Two-factor i buliwe sunu|Two-factor yatendeka lelo|Two-factor yatachikawu lelo|Two-factor yatachika lelo",
  "Two-factor sign-in turned off": "Two-factor yapwa|Two-factor yazimitsidwa|Two-factor yayimikwa|Two-factor i notilwe|Two-factor yapwa|Two-factor yatwalekawu|Two-factor yapindilwa",
  "Downloaded": "Cafumishiwa|Zatsitsidwa|Cabbadelwa|Ho jarilwe|Kyakulwa|Yadiwulawu|Kwasonekwa",
  "Query sent ": "||||||",
  "Ask the chairperson to review entry #{id}?": "Mwipusha kapalume ukulolesha icalembwa #{id}?|Funsani wapampando kuti ayang'ane cholembedwa #{id}?|Mubuzye sibwanga kulanga cakulembwa #{id}?|Mu kope mutahisi a talime se #{id}?|Pula mukulumpe kulanga kilembwa #{id}?|Lombenu mwanta atale chakulembeka #{id}?|Pwenu mutwamina atale chasonekwa #{id}?",
  "Resolution note ({status})": "Icalembwa ca kupwisha ({status})|Cigamulo ({status})|Cisinizyo ({status})|Qeto ({status})|Kipwisho ({status})|Chakukumisha ({status})|Mpwisho ({status})",
  "Enter a valid amount": "Lembeni ubunonshi bwalinga|Lembani ndalama yoyenera|Amulembe mali aali kabotu|Mu \xF1ole mali a nepahetseng|Lemba mali yawama|Lembenu mbongo yawaha|Soneka mbongo yawaha",
  "Download failed": "Ukufumya kwalepwa|Kutsitsa kwalephera|Kuzwisya kwalemena|Ho jarolla ho hlolehile|Kukulwa kwalema|Kudiwula kwalema|Kukulula kwalemena",
  "Request failed": "Ukupempa kwalepwa|Pempho lalephera|Kukumbila kwalemena|Kope e hlolehile|Kupula kwalema|Kulomba kwalema|Kulomba kwalemena",
  // ---------- words shown from data ----------
  "open": "cifungule|chotseguka|cibuluzidwe|e buliwe|yafunguka|yabulika|yafungulwa",
  "closed": "cipwa|chatsekedwa|camana|e notilwe|yapwa|yakumisha|yahwa",
  "active": "cilibombela|chikugwira|cilabeleka|e sebeza|ilizata|yizata|yizata",
  "settled": "cilipilwa|chalipidwa|cabbadelwa|e lifilwe|yalipwa|yazeyi|yafwetwa",
  "exited": "afumapo|wachoka|wazwa|u tswile|wafuma|wafumu|wafuma",
  "sent": "cafwika|chatumizidwa|cakutumwa|e rometswe|yatumwa|yatumbi|yatumwa",
  "pending": "cileposhya|chikudikira|cilindide|e lutelezi|kimwe|chikutala|vikulindila",
  "failed": "calepwa|chalephera|cilemene|e hlolehile|kyalema|chalema|chalemena",
  "upheld": "cavomelwa|chavomerezedwa|cizuminwe|e tiyisitswe|kyazuminwa|chazumino|chazuminwa",
  "rejected": "cakanwa|chakanidwa|cakaanwa|e hanilwe|kyakanwa|chakanawu|chakanwa",
  "present": "aliko|alipo|uliko|u teng|ulipo|ali|alipo",
  "absent": "taliko|palibe|taboneki|ha a teng|kechi alipo|kakwali|kuhana",
  "reversed": "cabweshiwa|chabwezedwa|cabweezyedwe|e busitswe|kyabwezhewa|chazeyeshi|chafwetesewa",
  "overdue": "calekelwa|chachedwa|cakuccererwa|e liehile|kyakowela|chachelela|chahwehwa",
  "locked": "cilyalwa|chatsekedwa|caanjililwa|e notilwe|kyadinga|chatwalekawu|chapindilwa",
  "set": "cibikwa|yayikidwa|yabikkwa|e beilwe|yabikwa|yabikawu|yabikwa",
  "not set": "tacibikwa|sinayikidwe|taiibikkwi|ha e a beiwa|kechi yabikwa|kayabikawu|kuhana kubikwa",
  "unmatched": "tacipambana|sizinagwirizane|taizwaani|ha e a tokana|kechi kyanyana|kakwanyana|kuhana kuwana",
  "on": "cibombela|yayaka|yaiswe|e buliwe|yatendeka|yatachikawu|yatachika",
  "off": "cipwa|yazimitsidwa|yayimikwa|e notilwe|yapwa|yatwalekawu|yapindilwa",
  "weekly": "cila mulungu|mlungu uliwonse|mvwiki aamvwiki|veke ni veke|mulungu uliwonse|sabata yejima|vwiki yosena",
  "fortnightly": "cila mulungu cibili|milungu iwiri iliyonse|mvwiki zyobilo|libeke tse peli|milungu ibiji|masabata abidi|mavwiki avali",
  "monthly": "cila mwenshi|mwezi uliwonse|mwezi aamwezi|kgwedi ni kgwedi|mwezhi uliwonse|mwezi wejima|mwenyi wosena",
  "flat": "yalinganyana|yofanana|iilingene|e lekanang|yanyana|yanyana|yinyana",
  "reducing": "iyatontonkanya|yotsika|iikatalala|e fokotsa|yaikala|yikatuka|yikaika",
  "savings": "ukusunga|zosungidwa|kubbadela|ku boloka|kusunga|kusanda|kuseka",
  "shares": "ifipande|magawo|zipande|likarolo|bipande|mapandu|vipande",
  "chairperson": "kapalume|wapampando|sibwanga|mutahisi|mukulumpe|mwanta|mutwamina",
  "treasurer": "kasunga ndalama|msungichuma|amwaalu wamali|mubolokisi|musungi wa mali|musungi wambongo|musungi wambongo",
  "secretary": "kalemba|mlembi|mulembi|ma\xF1oli|mulembi|mulembi|musoneki",
  "member": "umwina|membala|mumembala|memba|membala|membala|membala",
  "accumulating": "ukusunga|kusunga|kubbadela|ku boloka|kusunga|kusanda|kuseka",
  "rotating": "ukukanda|kuzungulira|kuyanduka|ku sinyehana|kuzhuluka|kuzungulula|kuzungulula",
  "contribution": "ukusunga|chopereka|kubbadela|ku boloka|kusunga|kusanda|kuseka",
  "fine": "ifine|chindapusa|cilango|sisupo|ifine|ifine|ifine",
  "loan_disbursement": "inkongole|ngongole|ngongole|koloto|mwingo|mbongo yakuzeya|chilanga",
  "loan_repayment": "ukulipila inkongole|kubweza ngongole|kubbadela ngongole|ku busa koloto|kulipila mwingo|kuzeya mbongo|kufweta chilanga",
  "payout": "ukwabana|logawana|kupekezya|ku aanya|kupana|kupana|kwabana",
  "Loan paid out": "Inkongole yapeelwa|Ngongole yaperekedwa|Ngongole yapegwa|Koloto e filwe|Mwingo wapanwa|Mbongo yakuzeya yapanawu|Chilanga chapeleka",
  "Loan repayment": "Ukulipila inkongole|Kubweza ngongole|Kubbadela ngongole|Ku busa koloto|Kulipila mwingo|Kuzeya mbongo|Kufweta chilanga",
  "Ref": "||||||",
  // ---------- server messages ----------
  "Login required": "Muleingila|Muyenera kulowa|Amwingile|Mu tlameha ku kena|Mwingila|Injilenu|Ingila",
  "Please sign in": "Muleingila|Chonde lowani|Amwingile|Mu kene ka kopo|Mwingila|Injilenu|Ingila",
  "Session expired": "Ukwingila kwapwa|Gawo latha|Kwingila kwamana|Ku kena ku fedile|Kwingila kwapwa|Kwinjila kwakumisha|Kwingila kwahwa",
  "Not permitted for your role": "Tamwakwata ulubalo ulo|Simunaloledwe pa udindo wanu|Tamulikwaabililwe kumulimo wanu|Ha mu lumeleleha ka mosebezi wa mina|Kechi mwakweta lukusa|Kamwakweti lukusa|Kuhana lusa",
  "Officer access only": "Abaleshi fye|Atsogoleri okha|Basilutwe buyo|Batahisi feela|Bakulumpe fyo|Atule\xF1i hohu|Vatwamina hohu",
  "Not a member session": "Teuku kwingila kwa umwina|Siligawo la membala|Tiikwe kwingila kwamumembala|Ha ki ku kena kwa memba|Kechi kwingila kwa membala|Kakwinjila kwamembala|Kuhana kwingila kwamembala",
  "Wrong phone or password": "Feni nelyo password yapusa|Foni kapena password yolakwika|Foni naa password mbubi|Foni kamba password ha i nepahali|Foni nangwa password yapote|Foni anyi password yako\xF1a|Foni nyi password yakolwesa",
  "Enter the 6-digit code from your authenticator app": "Lembeni code ya manambala 6 ukufuma mu app yobe|Lembani khodi ya manambala 6 kuchokera mu app yanu|Amulembe code yamanamba 6 kuzwa kuapu yanu|Mu \xF1ole khodi ya linomoro li 6 ya app ya mina|Lemba code ya manambala 6 ya mu app yenu|Lembenu code yamanambala 6 yamuapu yenu|Soneka code yamanambala 6 yamuapu yenu",
  "Invalid authenticator code": "Code ya authenticator yapusa|Khodi ya authenticator yolakwika|Code ya authenticator mbubi|Khodi ya authenticator ha i nepahali|Code ya authenticator yapote|Code yaauthenticator yako\xF1a|Code yaauthenticator yakolwesa",
  "Too many attempts. Try again later.": "Mwesha amalila ayengi. Esheni pa numa.|Mwayesa kambirimbiri. Yesaninso pambuyo pake.|Mwazyeelela moonse. Amweelele alubo lyalyo.|Le leke makhetlo a mangata. Le leke hape kamuso.|Mwesha kangi. Eshaiko kabiji kunyuma.|Mweseka kakwiji. Eshenu kapwa kwakumbidi.|Mweseka lwa. Eseka lyehi kuyehi.",
  "Account locked after too many failed attempts. Try again in {n} minutes.": "Akaunti yalyalwa. Esheni pa numa ya mineti {n}.|Akaunti yatsekedwa. Yesaninso pakadutsa mphindi {n}.|Akaunti yaanjililwa. Amweelele kumbele lyamamineti {n}.|Akaunti i notilwe. Le leke hape ka mora metsotso e {n}.|Akaunti yadinga. Eshaiko kabiji panyuma ya maminiti {n}.|Akaunti yatwalekawu. Eshenu kapwa kunyima yamamineti {n}.|Akaunti yapindilwa. Eseka lyehi kuyehi yamamineti {n}.",
  "Password must be at least 8 characters with letters and numbers": "Password ifwile ukuba na ifilembo 8 nokucilapo ne manambala|Password iyenera kukhala ndi zilembo 8 kapena kuposera ndi manambala|Password iyandika kuba amabala aatafwi 8 amanamba|Password e tlameha ho ba le litaba tse 8 ka linomoro|Password ifwainwa kuba na bilembo 8 ne manambala|Password yelela kwikala nayilembu 8 nimanambala|Password yinahase kuwana vilembo 8 namanambala",
  "Current password is wrong": "Password ya nomba yapusa|Password yapano ndi yolakwika|Password yamuno mbubi|Password ya sunu ha i nepahali|Password ya lelo yapote|Password yamucha\xF1a yako\xF1a|Password yamunako yakolwesa",
  "Password is wrong": "Password yapusa|Password ndi yolakwika|Password mbubi|Password ha i nepahali|Password yapote|Password yako\xF1a|Password yakolwesa",
  "Two-factor is already on": "Two-factor yalitendeka kale|Two-factor yayatsidwa kale|Two-factor yaiswe kale|Two-factor e se e buliwe|Two-factor yatendeka kale|Two-factor yatachikawu kale|Two-factor yatachika kale",
  "Start setup first": "Tendekeni ukubika|Yambani kukonza|Amutalike kubamba|Mu simule ku e hlophisa|Tendeka kubika|Tachikishenu kubika|Tachika kubika",
  "That code is not valid. Check your phone clock and try again.": "Code iyi taikwanisha. Moneni ni nshiku pa feni, esheni kabili.|Khodi iyi siyolondola. Onani nthawi ya foni yanu, yesaninso.|Code eeyi tiikonzyi. Amulange ciindi kufoni, amweelele.|Khodi ye ha i nepahali. Mu talime nako ya foni, mu leke hape.|Code eyi kechi yawama. Langa nshiku pa foni, eshaiko kabiji.|Code yeniyi kayiwaha. Talenu nsa\xF1u hafoni, eshenu kapwa.|Code kanou kuhana kuwaha. Tala nyaka hafoni, eseka lyehi.",
  "That code is wrong or has expired": "Code iyi yapusa nelyo yapwa|Khodi iyi ndi yolakwika kapena yatha|Code eeyi mbubi naa yamana|Khodi ye ha i nepahali kamba e fedile|Code eyi yapote nangwa yapwa|Code yeniyi yako\xF1a anyi yakumisha|Code kanou yakolwesa nyi yahwa",
  "Unknown language": "Ululimi tabwaishibikwa|Chilankhulo sichidziwika|Ciyaluulo taciizyibwi|Puo ha e tsejwe|Mwa kwamba kechi kwayukanwa|Mwakulumbulwila kakwatelekawu|Lilimi kuhana kutachikiza",
  "Group name, your name and a valid phone are required": "Ishina lya cilimba, ishina lyobe ne feni yalinga fyafwaikwa|Dzina la gulu, dzina lanu ndi foni yolondola zikufunika|Zina lyacibunga, zina lyanu afoni iili kabotu zyayandika|Libizo la sikwata, la mina ni foni e nepahetseng li a hlokahala|Zhina ya kipwilo, zhina yenu ne foni yawama bifwainwa|Dijina dyachikumbu, dyenu nifoni yawaha yafwana|Lizina lyachisaka, lyenu nafoni yawaha vyafwana",
  "Bad group type": "Ubwafya bwa cilimba bwapusa|Mtundu wa gulu ndi wolakwika|Mulimo wacibunga mbubi|Mofuta wa sikwata ha o nepahali|Mushindo wa kipwilo wapote|Mushindu wachikumbu wako\xF1a|Mushindo wachisaka wakolwesa",
  "Name and a valid phone number are required": "Ishina ne nambala ya feni yalinga fyafwaikwa|Dzina ndi nambala ya foni yolondola zikufunika|Zina anamba yafoni iili kabotu zyayandika|Libizo ni nomoro ya foni e nepahetseng li a hlokahala|Zhina ne nambala ya foni yawama bifwainwa|Dijina nenambala yafoni yawaha yafwana|Lizina nanambala yafoni yawaha vyafwana",
  "Bad role": "Ulubalo lwapusa|Udindo wolakwika|Mulimo mubi|Mosebezi ha o nepahali|Mwingilo wapote|Mudimu wako\xF1a|Mulimo wakolwesa",
  "Bad status": "Imibele yapusa|Mkhalidwe wolakwika|Mbwaabede mbubi|Maemo ha a nepahali|Mikalile yapote|Mwikalilu wako\xF1a|Mukwakwo wakolwesa",
  "Only the chairperson can add officers": "Kapalume fye nafwile ukwikata abaleshi|Wapampando yekha ndiye amatha kuwonjezera atsogoleri|Sibwanga buyo ulakonzya kuyungizya basilutwe|Mutahisi feela a ka eketsa batahisi|Mukulumpe fyo bwanya kwongela bakulumpe|Mwanta hohu akwanisha kwongeja atule\xF1i|Mutwamina hohu akwanisa kuongela vatwamina",
  "Only the chairperson can change roles": "Kapalume fye nafwile ukushintilila ulubalo|Wapampando yekha ndiye amatha kusintha maudindo|Sibwanga buyo ulakonzya kucinca mulimo|Mutahisi feela a ka fetola mosebezi|Mukulumpe fyo bwanya kushinja mwingilo|Mwanta hohu akwanisha kushinjika mudimu|Mutwamina hohu akwanisa kushinjika mulimo",
  "Officers need a password of 8+ characters": "Abaleshi bafwile password ya ifilembo 8 nokucilapo|Atsogoleri ayenera kukhala ndi password ya zilembo 8 kapena kuposera|Basilutwe bayandika password yamabala aatafwi 8|Batahisi ba hloka password ya litaba tse 8|Bakulumpe bafwaina password ya bilembo 8|Atule\xF1i afwana password yayilembu 8|Vatwamina vafwana password yavilembo 8",
  "Officer accounts need a password; add them as a new officer": "Akaunti ya muleshi ifwaya password; mubikeni nga muleshi mupya|Akaunti ya mtsogoleri imafuna password; muwonjezereni ngati mtsogoleri watsopano|Akaunti yasilutwe iyandika password; mumuyungizye mbuli silutwe mupya|Akaunti ya mutahisi e hloka password; mu mo eketse jwalo ka mutahisi e mocha|Akaunti ya mukulumpe ifwaya password; mumwongele nga mukulumpe wa pya|Akaunti yamwanta yifwana password; mumwongejenu nga mwanta wipya|Akaunti yamutwamina yifwana password; mumwongele nga mutwamina yipya",
  "Member not found": "Umwina taboneke|Membala sanapezeke|Mumembala tasanduki|Memba ha a fumanehi|Membala kechi waboneka|Membala kakwanika|Membala kuhana kuhwanika",
  "Member not found or not active": "Umwina taboneke nelyo taliibombela|Membala sanapezeke kapena sakugwira|Mumembala tasanduki naa taleendi|Memba ha a fumanehi kamba ha a sebeze|Membala kechi waboneka nangwa kechi ulizata|Membala kakwanika anyi kazata|Membala kuhana kuhwanika nyi kuzata",
  "You cannot delete your own account": "Tamwingafumya akaunti yobe|Simungathe kuchotsa akaunti yanu|Tamukonzyi kusula akaunti yanu|Ha mu koni ku tuha akaunti ya mina|Kechi mubwanya kufumya akaunti yenu|Kamwakwanisha kufumisha akaunti yenu|Kuhana kufumisa akaunti yenu",
  "This member has ledger history, so they cannot be deleted. Mark them as exited instead.": "Uyu umwina ali na ifyalembwa, tafumishiwa. Mulembeni nga afumapo.|Membala ameneyu ali ndi zolembedwa, sangachotsedwe. Mumulembe kuti wachoka.|Mumembala ooyu ulijisi zakulembwa, tasulwi. Amumulembe kuti wazwa.|Memba yo o na ni se si \xF1olilwe, ha a koni ku tuhwa. Mu mo \xF1ole jwalo ka ya tsweng.|Membala yu ali na bilembwa, kechi wafumishiwa. Mumulembe kuti wafuma.|Membala yoyu weti vyakulembeka, kafumishawu. Mumulembenu kuti wafumu.|Membala kanou weli navyasonekwa, kafumisiwa. Mumusoneke kuti wafuma.",
  "Cycle not found": "Inshiku taboneke|Nthawi sinapezeke|Nsaka tasanduki|Nako ha e fumanehi|Nshiku kechi yaboneka|Nsa\xF1u kakwanika|Nyaka kuhana kuhwanika",
  "Cycle is closed": "Inshiku yapwa|Nthawi yatsekedwa|Nsaka yamana|Nako i notilwe|Nshiku yapwa|Nsa\xF1u yakumisha|Nyaka yahwa",
  "Cycle already closed": "Inshiku yapwa kale|Nthawi yatsekedwa kale|Nsaka yamana kale|Nako e se e notilwe|Nshiku yapwa kale|Nsa\xF1u yakumisha kale|Nyaka yahwa kale",
  "No open cycle": "Takwaba inshiku iyafunguka|Palibe nthawi yotseguka|Takuli nsaka iibuluzidwe|Ha ku na nako e bulezi|Kechi kuli nshiku yafunguka|Kakuli nsa\xF1u yabulika|Kuhana nyaka yafungulwa",
  "Valid start and end dates are required": "Inshiku shalinga sha kutendeka no kupwa shafwaikwa|Masiku oyambira ndi omaliza olondola akufunika|Mabuzuba aali kabotu aakutalika akumana ayandika|Mabaka a ku simolola ni ku fela a a nepahetseng a a hlokahala|Mashiku akutendeka ne kupwa afwainwa|Madehi akutachika nikukumisha afwana|Machisuku akutachika nakuhwa afwana",
  "Settle all active loans before closing the cycle": "Lipilani inkongole shonse pa kutendeka ukupwisha inshiku|Lipirani ngongole zonse musanatseke nthawi|Amubbadele ngongole zyoonse kumbele lyakumana nsaka|Mu life likoloto kaufela pele mu nota nako|Lipila mwingo yonse kushalafye kupwisha nshiku|Zeyenu mbongo yakuzeya yejima kutwala kukumisha nsa\xF1u|Fweta vilanga vyosena kutunda kuhwisa nyaka",
  "Date required": "Inshiku ifwaikwa|Tsiku likufunika|Buzuba buyandika|Lizazi li a hlokahala|Dyubo dyafwainwa|Dehi dyafwana|Chisuku chifwana",
  "Meeting not found": "Ukukumana taboneke|Msonkhano sunapezeke|Muswaangano tawusanduki|Kopano ha e fumanehi|Kukumana kechi kwaboneka|Chipompelu kakwanika|Nkunguluko kuhana kuhwanika",
  "Entries were recorded at this meeting, so it cannot be deleted. Reverse those entries first.": "Ifyalembwa fyalembwa pa kukumana, tacifumishiwa. Bweshani ifyalembwa fyalicibweshiwa.|Zolembedwa zinalembedwa pa msonkhano uwu, sungachotsedwe. Bwezani zolembedwazo kaye.|Zakulembwa zyakalembwa kumuswaangano ooyu, tawusulwi. Amubweze zakulembwa kusaanguna.|Se si \xF1olilwe se ne si \xF1olilwe kwa kopano ye, ha e koni ku tuhwa. Mu busise pele.|Bilembwa byalembwa pa kukumana kuno, kechi kufumishiwa. Bwezha bilembwa kushala.|Vyakulembeka vyalembekawu kuchipompelu cheniki, kachifumishawu. Zeyeshenu vyakulembeka tutwala.|Vyasonekwa vyasonekwa kunkunguluko kanou, kafumisiwa. Fwetesa vyasonekwa kutunda.",
  "Only rotating groups pay out the pot at a meeting": "Ifilimba fya kukanda fye fyabana ndalama shonse|Magulu ozungulira okha ndi omwe amalipira thumba|Zibunga zyakuyanduka buyo zilapekezya mali oonse|Likwata tse sinyehanang feela li file setulo|Vipwilo vya kuzhuluka fyo bapana mali yonse|Vikumbu vyakuzungulula hohu vapana mbongo yejima|Vichisaka vyakuzungulula hohu vabana mbongo yosena",
  "This meeting already has a payout": "Uku kukumana kwalicitwa ukwabana|Msonkhano uwu uli kale ndi malipiro|Muswaangano ooyu ulijisi kale kupekezya|Kopano ye e se e na ni ku aanya|Kukumana kuno kwapana kale|Chipompelu cheniki chapana kale|Nkunguluko kanou yapana kale",
  "This member has already received their turn this cycle": "Uyu umwina alapokelela kale mu nshiku|Membala ameneyu wapeza kale gawo lake|Mumembala ooyu wakatambula kale|Memba yo o se a amohetse|Membala yu wapokelela kale|Membala yoyu wapokola kale|Membala kanou wapokola kale",
  "No contributions recorded for this meeting": "Takwaba ukusunga kwalembwa pa kukumana|Palibe zopereka zolembedwa pa msonkhano uwu|Takuli kubbadela kwalembwa kumuswaangano ooyu|Ha ku na ku boloka ku \xF1olilwe kwa kopano ye|Kechi kusunga kwalembwa pa kukumana|Kakuli kusanda kwalembekawu kuchipompelu|Kuhana kuseka kwasonekwa kunkunguluko",
  "Member not found.": "Umwina taboneke.|Membala sanapezeke.|Mumembala tasanduki.|Memba ha a fumanehi.|Membala kechi waboneka.|Membala kakwanika.|Membala kuhana kuhwanika.",
  "Posting not found": "Icalembwa taciboneke|Cholembedwa sichinapezeke|Cakulembwa tacisanduki|Se si \xF1olilwe ha si fumanehi|Kilembwa kechi kyaboneka|Chakulembeka kakwanika|Chasonekwa kuhana kuhwanika",
  "Entry not found": "Icalembwa taciboneke|Cholembedwa sichinapezeke|Cakulembwa tacisanduki|Se si \xF1olilwe ha si fumanehi|Kilembwa kechi kyaboneka|Chakulembeka kakwanika|Chasonekwa kuhana kuhwanika",
  "Type must be contribution or fine": "Ifyalembwa fifwile ukuba ukusunga nelyo ifine|Mtundu uyenera kukhala chopereka kapena chindapusa|Mulimo uyandika kuba kubbadela naa cilango|Mofuta o tlameha ho ba ku boloka kamba sisupo|Mushindo ufwainwa kuba kusunga nangwa ifine|Mushindu welela kwikala kusanda anyi ifine|Mushindo winahase kuwana kuseka nyi ifine",
  "Amount must be a positive whole number of ngwee": "Ubunonshi bufwile ukuba manambala yonse ya ngwee|Ndalama iyenera kukhala nambala yonse ya ngwee|Mali ayandika kuba amanamba aamba ngwee|Mali a tlameha ho ba linomoro tse tletseng tsa ngwee|Mali yafwainwa kuba manambala yonse ya ngwee|Mbongo yelela kwikala manambala ejima yangwee|Mbongo yinahase kuwana manambala yosena yangwee",
  "Amount must be positive ngwee": "Ubunonshi bufwile ukuba ngwee|Ndalama iyenera kukhala ngwee yabwino|Mali ayandika kuba ngwee aali kabotu|Mali a tlameha ho ba ngwee tse nepahetseng|Mali yafwainwa kuba ngwee|Mbongo yelela kwikala ngwee yawaha|Mbongo yinahase kuwana ngwee yawaha",
  "Principal must be positive ngwee": "Ndalama shatendeka shifwile ukuba ngwee|Ndalama yoyamba iyenera kukhala ngwee yabwino|Mali aakusaanguna ayandika kuba ngwee|Mali a pili a tlameha ho ba ngwee|Mali ya kusanguka yafwainwa kuba ngwee|Mbongo yakusambilila yelela kwikala ngwee|Mbongo yakusaka yinahase kuwana ngwee",
  "Instalments must be 1-60": "Ifipande fifwile ukuba 1-60|Magawo ayenera kukhala 1-60|Zipande ziyandika kuba 1-60|Likalolo li tlameha ho ba 1-60|Bipande bifwainwa kuba 1-60|Mapandu afwana kwikala 1-60|Vipande vinahase kuwana 1-60",
  "Amount exceeds what is owed by {n} ngwee": "Ubunonshi bupitilila ifyo mwafwaya pa ngwee {n}|Ndalama yapitirira zomwe mukuyenera ndi ngwee {n}|Mali apiluka aayo akweelede kwiinda ngwee {n}|Mali a feta ao a tlamehang ka ngwee {n}|Mali yapitilila yafwainwa pa ngwee {n}|Mbongo yapitilila yafwana kuya ngwee {n}|Mbongo yapitilila yifwana ngwee {n}",
  "The pool only holds {n} ngwee": "Ndalama shonse shili ngwee {n} fye|Thumba lili ndi ngwee {n} yokha|Cisaka cijisi ngwee {n} buyo|Setulo se na le ngwee tse {n} feela|Mali yonse yali ngwee {n} fyo|Mbongo yejima yeti ngwee {n} hohu|Mbongo yosena yili ngwee {n} hohu",
  "Above this member's loan limit ({n} ngwee available)": "Cipitilila umupaka wa nkongole wa umwina (ngwee {n} shilipo)|Yapitirira malire a ngongole a membala (ngwee {n} alipo)|Cipiluka mupaka wangongole wamumembala (ngwee {n} zilipo)|E feta mubeso wa koloto wa memba (ngwee tse {n} li teng)|Yapitilila mupaka wa mwingo wa membala (ngwee {n} ilipo)|Yapitilila mpaka wambongo yakuzeya yamembala (ngwee {n} yidi)|Yapitilila mpaka wachilanga wamembala (ngwee {n} yili)",
  "Loan not found or cycle closed": "Inkongole taboneke nelyo inshiku yapwa|Ngongole sinapezeke kapena nthawi yatsekedwa|Ngongole tasanduki naa nsaka yamana|Koloto ha e fumanehi kamba nako e notilwe|Mwingo kechi waboneka nangwa nshiku yapwa|Mbongo yakuzeya kakwanika anyi nsa\xF1u yakumisha|Chilanga kuhana kuhwanika nyi nyaka yahwa",
  "Loan already settled": "Inkongole yalipwa kale|Ngongole yalipidwa kale|Ngongole yabbadelwa kale|Koloto e se e lifilwe|Mwingo walipwa kale|Mbongo yakuzeya yazeyi kale|Chilanga chafwetwa kale",
  "Already reversed": "Cabweshiwa kale|Chabwezedwa kale|Cabweezyedwe kale|Se se busitswe kale|Kyabwezhewa kale|Chazeyeshi kale|Chafwetesewa kale",
  "A reversal cannot be reversed; post a new entry": "Ukubwesha tacingabweshiwa; lembeni icalembwa cipya|Kubweza sikungabwezedwe; lembani cholembedwa chatsopano|Kubweza tikukonzyi kubwezyedwa; amulembe cakulembwa cipya|Ku busa ha ku koni ku busiswa; mu \xF1ole se si nca|Kubwezha kechi kubwezhewa; lemba kilembwa kya pya|Kuzeyesha kakwakwanisha kuzeyeshewa; lembenu chipya|Kufwetesa kuhana kufwetesewa; soneka chasonekwa chipya",
  "Only contributions and fines can be reversed here": "Ukusunga ne ifine fyonka fingabweshiwa apa|Zopereka ndi zindapusa zokha ndizo zingabwezedwe apa|Kubbadela amilango buyo zilakonzya kubwezyedwa aano|Ku boloka ni lisupo feela li ka busiswa mona|Kusunga ne ifine fyo bibwezhewa pano|Kusanda nifine hohu yazeyeshewa pano|Kuseka nifine hohu yafwetesewa apa",
  "Already matched": "Cipambana kale|Chagwirizana kale|Cizwaanene kale|E se e tokanisitswe|Kyanyana kale|Chanyana kale|Chawana kale",
  "Receipt not found": "Icikalata taciboneke|Chiphaso sichinapezeke|Cisinizyo tacisanduki|Rasiti ha e fumanehi|Rasiti kechi yaboneka|Rasiti kakwanika|Rasiti kuhana kuhwanika",
  "Receipt not found, or already posted to the ledger": "Icikalata taciboneke nelyo calembwa kale|Chiphaso sichinapezeke kapena chalembedwa kale|Cisinizyo tacisanduki naa calembwa kale|Rasiti ha e fumanehi kamba e se e \xF1olilwe|Rasiti kechi yaboneka nangwa yalembwa kale|Rasiti kakwanika anyi yalembekawu kale|Rasiti kuhana kuhwanika nyi yasonekwa kale",
  "Paste the confirmation text": "Bikeni amalembo ya kushininkisha|Ikani mawu otsimikizira|Amubikke majwi aakusinizya|Mu apese mutsebiso wa ku tiyisa|Bika mazwi a kusuminisha|Bikenu mazu akutondolola|Bika mazu akusimbwila",
  "Could not read an amount; enter it manually": "Tacilesoma ubunonshi; lembeni neco|Sitinathe kuwerenga ndalama; lembani pamanja|Tatwakonzya kubala mali; amulembe|Ha re a koni ku bala mali; mu a \xF1ole|Kechi twabwanya kubala mali; lemba|Katwakwanisha kubala mbongo; lembenu|Kuhana kubala mbongo; soneka",
  "Open dispute not found": "Ubwafya ubwafunguka tabwaboneka|Mkangano wotseguka sunapezeke|Cazwanga cibuluzidwe tacisanduki|Likanyiso le le bulezi ha li fumanehi|Makani afunguka kechi aboneka|Makani abulika kakwanika|Makani afungulwa kuhana kuhwanika",
  "A resolution note is required": "Icalembwa ca kupwisha cifwaikwa|Cigamulo chikufunika|Cisinizyo cayandika|Qeto e a hlokahala|Kipwisho kifwainwa|Chakukumisha chifwana|Mpwisho yifwana",
  "Status must be upheld or rejected": "Imibele ifwile ukuba cavomelwa nelyo cakanwa|Mkhalidwe uyenera kukhala chavomerezedwa kapena chakanidwa|Mbwaabede ziyandika kuba zizuminwe naa zikaanwa|Maemo a tlameha ho ba a tiyisitsweng kamba a hanilweng|Mikalile ifwainwa kuba kyazuminwa nangwa kyakanwa|Mwikalilu welela kwikala chazumino anyi chakanawu|Mukwakwo winahase kuwana chazuminwa nyi chakanwa",
  "Message not found, or still waiting to be sent": "Ubutumwa taboneke nelyo bucili mu kutumwa|Uthenga sunapezeke kapena ukudikirabe kutumizidwa|Mulumbe tawusanduki naa ucilindide|Molaetsa ha o fumanehi kamba o sa lebelela|Mukanda kechi waboneka nangwa ucheshi kutumwa|Kalata kakwanika anyi yichidi kutumwa|Mujimbu kuhana kuhwanika nyi uchili kutumwa",
  "No failed message with that id": "Takwaba ubutumwa bwalepwa bwa id ico|Palibe uthenga wolephera wa id imeneyo|Takuli mulumbe walemene wa id eeyo|Ha ku na molaetsa o hlolehileng wa id eo|Kechi mukanda walema wa id ino|Kakuli kalata yalema yaid yeniyi|Kuhana mujimbu walemena waid kanou",
  "Forbidden": "Taleko lukusa|Zoletsedwa|Kwakasyidwe|Ho thibetsoe|Kechi kwalombwa|Kwakanawu|Kwakanwa",
  "Server error": "Ubwafya pa server|Vuto la server|Kubula kwa server|Phoso ya server|Kupote kwa server|Kuko\xF1a kwa server|Kukolwesa kwa server",
  "Not found": "Taciboneke|Sichinapezeke|Tacisanduki|Ha e fumanehi|Kechi kyaboneka|Kakwanika|Kuhana kuhwanika",
  "interest_bps too high": "Inzala yapitilila|Chiwongola dzanja chachuluka|Interest yapitilila|Interest e kholo haholo|Interest yapitilila|Interest yapitilila|Interest yapitilila",
  "bad frequency": "Ukulingana kwapusa|Kangati kolakwika|Lyoonse mbubi|Makalelo ha a nepahali|Lyakwingila lyapote|Kabalumbu kako\xF1a|Kangati kakolwesa",
  "bad interest_basis": "Ifyo balinganya inzala fyapusa|Njira ya chiwongola dzanja ndi yolakwika|Interest mbubi|Interest ha e nepahali|Interest yapote|Interest yako\xF1a|Interest yakolwesa",
  "bad shareout_basis": "Ifyo bakwabana fyapusa|Njira ya logawana ndi yolakwika|Kupekezya mbubi|Ku aanya ha ku nepahali|Kupana kwapote|Kupana kwako\xF1a|Kwabana kwakolwesa"
};
Object.assign(DICT_MORE, {
  "Interest per period (%)": "Inzala pa nshiku (%)|Chiwongola dzanja pa nthawi (%)|Interest kunsaka (%)|Interest ka nako (%)|Interest pa nshiku (%)|Interest panshiku (%)|Interest panyaka (%)",
  "Interest basis": "Ifyo balinganya inzala|Njira ya chiwongola dzanja|Mbobubalwa interest|Mokgwa wa interest|Mwa kubala interest|Mwakubalila interest|Mwakubala interest",
  "Frequency": "Ifyo cibaako|Kangati|Lyoonse|Makalelo|Lyakwingila|Kabalumbu|Kangati",
  "Share-out by": "Ukwabana ukwa|Logawana ndi|Kupekezya kwa|Ku aanya ka|Kupana kwa|Kupana kwa|Kwabana kwa"
});
Object.assign(DICT_MORE, {
  "Two-factor authentication": "Two-factor authentication|Kutsimikizira kwa magawo awiri|Two-factor authentication|Two-factor authentication|Two-factor authentication|Two-factor authentication|Two-factor authentication"
});
Object.assign(DICT_MORE, {
  "Officer password": "Password ya muleshi|Password ya mtsogoleri|Password yasilutwe|Password ya mutahisi|Password ya mukulumpe|Password yamwanta|Password yamutwamina",
  "posted": "calembwa|chalembedwa|calembwa|e \xF1olilwe|yalembwa|yalembekawu|yasonekwa",
  "login.success": "Ukwingila kwawama|Kulowa kwapambana|Kwingila kwabotu|Ku kena ku atlehile|Kwingila kwawama|Kwinjila kwawaha|Kwingila kwawaha",
  "login.failed": "Ukwingila kwalepwa|Kulowa kwalephera|Kwingila kwalemena|Ku kena ku hlolehile|Kwingila kwalema|Kwinjila kwalema|Kwingila kwalemena",
  "portal.login.success": "Ukwingila kwa umwina kwawama|Kulowa kwa membala kwapambana|Kwingila kwamumembala kwabotu|Ku kena kwa memba ku atlehile|Kwingila kwa membala kwawama|Kwinjila kwamembala kwawaha|Kwingila kwamembala kwawaha",
  "portal.login.failed": "Ukwingila kwa umwina kwalepwa|Kulowa kwa membala kwalephera|Kwingila kwamumembala kwalemena|Ku kena kwa memba ku hlolehile|Kwingila kwa membala kwalema|Kwinjila kwamembala kwalema|Kwingila kwamembala kwalemena",
  "password.change": "Ukushintilila password|Kusintha password|Kucinca password|Ku fetola password|Kushinja password|Kushinjika password|Kushinjika password",
  "2fa.enable": "Two-factor yatendeka|Two-factor yayatsidwa|Two-factor yaiswe|Two-factor e buliwe|Two-factor yatendeka|Two-factor yatachikawu|Two-factor yatachika",
  "2fa.disable": "Two-factor yapwa|Two-factor yazimitsidwa|Two-factor yayimikwa|Two-factor e notilwe|Two-factor yapwa|Two-factor yatwalekawu|Two-factor yapindilwa",
  "group.create": "Icilimba cabangwa|Gulu lapangidwa|Cibunga capangwa|Sikwata se entswe|Kipwilo kyapangwa|Chikumbu chapangawu|Chisaka chapangwa",
  "member.create": "Umwina aikatwa|Membala wawonjezedwa|Mumembala wayungwa|Memba u tahisizwe|Membala wongelwa|Membala wongekawu|Membala waongelwa",
  "member.update": "Umwina ashintilwa|Membala wasinthidwa|Mumembala wacinchidwe|Memba u fetotswe|Membala washinjika|Membala washinjikawu|Membala washinjika",
  "member.delete": "Umwina afumishiwa|Membala wachotsedwa|Mumembala wasulwa|Memba u tuhilwe|Membala wafumishiwa|Membala wafumishawu|Membala wafumisiwa",
  "cycle.open": "Inshiku yatendeka|Nthawi yatsegulidwa|Nsaka yabuluzidwe|Nako i buliwe|Nshiku yafunguka|Nsa\xF1u yabulika|Nyaka yafungulwa",
  "cycle.close": "Inshiku yapwa|Nthawi yatsekedwa|Nsaka yamana|Nako i notilwe|Nshiku yapwa|Nsa\xF1u yakumisha|Nyaka yahwa",
  "cycle.delete": "Inshiku yafumishiwa|Nthawi yachotsedwa|Nsaka yasulwa|Nako i tuhilwe|Nshiku yafumishiwa|Nsa\xF1u yafumishawu|Nyaka yafumisiwa",
  "posting.create": "Icalembwa calembwa|Cholembedwa chalembedwa|Cakulembwa calembwa|Se \xF1olilwe|Kilembwa kyalembwa|Chakulembeka chalembekawu|Chasonekwa chasonekwa",
  "posting.reverse": "Icalembwa cabweshiwa|Cholembedwa chabwezedwa|Cakulembwa cabweezyedwe|Se si \xF1olilwe se busitswe|Kilembwa kyabwezhewa|Chakulembeka chazeyeshi|Chasonekwa chafwetesewa",
  "loan.disburse": "Inkongole yapeelwa|Ngongole yaperekedwa|Ngongole yapegwa|Koloto e filwe|Mwingo wapanwa|Mbongo yakuzeya yapanawu|Chilanga chapeleka",
  "attendance.record": "Ukuboneka kwalembwa|Kupezeka kwalembedwa|Kuboneka kwalembwa|Ku ba teng ku \xF1olilwe|Kuboneka kwalembwa|Kuwanika kwalembekawu|Kuhwanika kwasonekwa",
  "meeting.delete": "Ukukumana kwafumishiwa|Msonkhano wachotsedwa|Muswaangano wasulwa|Kopano e tuhilwe|Kukumana kwafumishiwa|Chipompelu chafumishawu|Nkunguluko yafumisiwa",
  "dispute.resolve": "Ubwafya bwapwa|Mkangano wathetsedwa|Cazwanga cimanizidwe|Likanyiso li rarolotswe|Makani apwa|Makani akumishawu|Makani apwa",
  "dispute.raise": "Ubwafya bwatendeka|Mkangano wayambika|Cazwanga catalika|Likanyiso li simolotswe|Makani atendeka|Makani atachikawu|Makani atachika",
  "receipt.delete": "Icikalata cafumishiwa|Chiphaso chachotsedwa|Cisinizyo casulwa|Rasiti e tuhilwe|Rasiti yafumishiwa|Rasiti yafumishawu|Rasiti yafumisiwa"
});
Object.assign(DICT_MORE, {
  "That phone number is already registered": "Inambala iyi yalilembwa kale|Nambala iyi yalembetsedwa kale|Namba eeyi ilalembedwe kale|Nomoro ye e se e \xF1olilwe|Nambala eyi yalembwa kale|Nambala yeniyi yalembekawu kale|Nambala kanou yasonekwa kale"
});
Object.assign(DICT_MORE, {
  "Online meeting": "Ukukumana pa intaneti|Msonkhano wapaintaneti|Muswaangano wakuinternet|Kopano ya inthanete|Kukumana pa intaneti|Chipompelu chaintaneti|Nkunguluko yaintaneti",
  "Meeting time": "Inshita ya kukumana|Nthawi ya msonkhano|Ciindi camuswaangano|Nako ya kopano|Kimye kya kukumana|Mpinji yachipompelu|Ciindi cankunguluko",
  "Join online meeting": "Ingila mu kukumana pa intaneti|Lowani nawo msonkhano wapaintaneti|Amwingile muswaangano wakuinternet|Mu kene kopano ya inthanete|Ingila mu kukumana pa intaneti|Injilenu muchipompelu chaintaneti|Ingila munkunguluko yaintaneti",
  "Join": "Ingila|Lowani|Amwingile|Mu kene|Ingila|Injilenu|Ingila",
  "Online": "Pa intaneti|Pa intaneti|Kuinternet|Ka inthanete|Pa intaneti|Haintaneti|Kuintaneti",
  "No online meetings.": "Takwaba ukukumana pa intaneti.|Palibe misonkhano yapaintaneti.|Takuli miswaangano yakuinternet.|Ha ku na likopano ka inthanete.|Kechi kukumana pa intaneti.|Kakuli michipompelu yaintaneti.|Kuhana nkunguluko yaintaneti.",
  "Online meetings use a private video link that only members of your group receive. Joining marks you present.": "Ukukumana pa intaneti kutumia link ya sunga abena cilimba fye. Ukwingila kulemba ukuti muliko.|Misonkhano yapaintaneti imagwiritsa ntchito ulalo wachinsinsi wa mamembala a gulu lanu okha. Kulowa kumakulembani kuti mulipo.|Miswaangano yakuinternet ilabelesya link yakusisikizya bamembala bacibunga canu buyo. Kwingila kulamulemba kuti mulipo.|Likopano ka inthanete li sebelisa lilinki ya sephiri ya bamemba ba sikwata sa mina feela. Ku kena ku ba \xF1ola ku ba teng.|Kukumana pa intaneti kwingila link ya bufwishi ya bamembala ba kipwilo kyenu fyo. Kwingila kulemba kuti muliko.|Michipompelu yaintaneti yizatisha link yakufwika yamembala achikumbu chenu hohu. Kwinjila kukulembaku kuti muwanika.|Nkunguluko yaintaneti yizatisa link yakufwika yavamembala vachisaka chenu hohu. Kwingila kukusoneka kuti muliko."
});
Object.assign(DICT_MORE, {
  "Send reminder": "Tuma icibukisho|Tumizani chikumbutso|Amutume cikumbuzyo|Mu romele sikumbuso|Tuma kukumbusha|Tumenu chikumbuso|Tuma chikumbuso",
  "Reminder sent by SMS to all members": "Icibukisho catumwa pa SMS kuli bonse|Chikumbutso chatumizidwa ndi SMS kwa mamembala onse|Cikumbuzyo catumwa a SMS kubamembala boonse|Sikumbuso si rometswe ka SMS ku bamemba kaufela|Kukumbusha kwatumwa na SMS kwa bamembala bonse|Chikumbuso chatumbi naSMS kudi amembala ejima|Chikumbuso chatumwa naSMS kuli vamembala vosena",
  "A reminder was already sent recently": "Icibukisho catumwa lyashi|Chikumbutso chinatumizidwa posachedwapa|Cikumbuzyo catumwa mpoonya|Sikumbuso se romelitswe haufinyane|Kukumbusha kwatumwa kaindi|Chikumbuso chatumbi chelelu|Chikumbuso chatumwa lyehi",
  "Messages this month": "Ubutumwa mwi mwenshi uno|Mauthenga mwezi uno|Milumbe mumwezi ooyu|Limolaetsa kwa kgwedi ye|Mikanda mu mwezhi uno|Makalata mumwenyi yeniyi|Mijimbu mumwenyi kanou",
  "SMS parts (billed)": "Ifipande fya SMS (fya kulipila)|Zigawo za SMS (zolipira)|Zipanzi zya SMS (zyakubbadela)|Likarolo tsa SMS (tse lifelwang)|Bipande bya SMS (bya kulipila)|Mapandu aSMS (akuzeya)|Vipande vyaSMS (vyakufweta)",
  "Cost per SMS part (K)": "Ubwingi pa SMS (K)|Mtengo pa SMS (K)|Mulawo wa SMS (K)|Tefo ya SMS (K)|Mutengo wa SMS (K)|Muliko wa SMS (K)|Mutengo wa SMS (K)",
  "Estimated cost this month": "Ubwingi bwa ndalama mwi mwenshi|Mtengo woyerekeza mwezi uno|Mali aayeeyelwa mumwezi|Tefo e lekanyelitsweng kwa kgwedi|Mutengo wa mwezhi uno|Mutengo wakulondolola mumwenyi|Mutengo wa mwenyi kanou",
  "Enter the rate your SMS provider charges. Messages with local-language letters are spelled in plain letters so each stays one part.": "Lembeni ndalama iyo mulipila pa SMS. Ifilembo fya ciBemba fililembwa mu fyakale ukuti SMS ibe imo.|Lembani mtengo womwe operekera SMS amalipiritsa. Zilembo zapadera zimalembedwa mwachizolowezi kuti uthenga ukhale gawo limodzi.|Amulembe mulawo ngobabbadelesya SMS. Mabala aaindene alalembwa mu bwaabo kuti SMS ibe cipanzi comwe.|Mu \xF1ole tefo ye ba e lefisang ka SMS. Litaba tse ikgethileng li \xF1olwa ka tse tavalehileng ho ba karolo e le ngwe.|Lemba mutengo wapanwa na SMS. Bilembwa bya mwa kwamba bilembwa bya bwikazi kuti SMS ibe kipande kimo.|Lembenu mutengo wazeya SMS. Yilembu yakulumbulwila yilembeka\xF1a yamwishina kuti SMS yikale chipandu chimu.|Soneka mutengo wafweta SMS. Vilembo vyalilimi vilembwa vyamwishina kuti SMS ikale kipande kimu.",
  "Reminders: loan payments are reminded automatically the day before they are due.": "Ifibukisho: ukulipila inkongole kulatumwa fye bushiku bumo kumbele.|Zikumbutso: malipiro a ngongole amakumbutsidwa okha tsiku limodzi lisanafike.|Zikumbuzyo: kubbadela ngongole kulakumbuzigwa alikke buzuba bumwi kumbele.|Lisehopotso: ku busa koloto ku hopotswa ka bolona letsatsi le le \xF1wi pele.|Kukumbusha: kulipila mwingo kwatumwa yeni dyubo dimo kutwala.|Vikumbuso: kuzeya mbongo kutumbwa yeni dehi dimu kutunda.|Vikumbuso: kufweta chilanga kutumwa vene chisuku chimwe kutunda."
});
Object.assign(DICT_MORE, {
  "Notifications": "Ifyakwishibisha|Zidziwitso|Zyakucenjezya|Litsebiso|Kwibisha|Yakuleja|Vyakuvwisa",
  "You are all caught up.": "Nifyonse fyapwa.|Palibe zatsopano.|Zyoonse zyamana.|Ha ku na se se secha.|Kechi kuli kyakashala.|Kakuli chasala\xF1a.|Kuhana chasalako.",
  "Dismiss": "Fumyapo|Chotsani|Amusule|Mu tuhe|Fumya|Fumisha|Fumisa",
  "Dismiss all": "Fumyapo fyonse|Chotsani zonse|Amusule zyoonse|Mu tuhe kaufela|Fumya byonse|Fumisha yejima|Fumisa vyosena",
  "View": "Lolesha|Onani|Amulange|Mu bone|Langa|Talenu|Tala",
  "Messages sent to you": "Ubutumwa mwatumiwa|Mauthenga omwe mwatumizidwa|Milumbe njomwatumwa|Limolaetsa tse u rometswe|Mikanda yatumwa kwenu|Makalata atumbi kudi enu|Mijimbu yatumwa kuli enu",
  "No messages yet.": "Takwaba ubutumwa.|Palibe mauthenga.|Takuli milumbe.|Ha ku na limolaetsa.|Kechi kuli mikanda.|Kakuli makalata.|Kuhana mijimbu.",
  "{name} queried entry #{id}": "A {name} bapushishe pa cintu #{id}|{name} wafunsa za cholembedwa #{id}|{name} wabuzya cakulembwa #{id}|{name} u botisitse ka se #{id}|{name} wapula kilembwa #{id}|{name} wadiwula chakulembeka #{id}|{name} wapwa chasonekwa #{id}",
  "{n} SMS messages failed to send": "SMS {n} shalepwa ukutuma|Mauthenga a SMS {n} analephera kutumizidwa|SMS {n} zilemene kutumwa|Li-SMS tse {n} li hlolehile ho romelwa|SMS {n} yalema kutumwa|SMS {n} yalema kutumbwa|SMS {n} yalemena kutumwa",
  "{name}'s loan is overdue ({amount})": "Inkongole ya {name} yapitilila ({amount})|Ngongole ya {name} yachedwa ({amount})|Ngongole ya {name} yaccerwa ({amount})|Koloto ya {name} e liehile ({amount})|Mwingo wa {name} wakowela ({amount})|Mbongo yakuzeya ya {name} yachelela ({amount})|Chilanga cha {name} chahwehwa ({amount})",
  "{name} owes {amount} due {date}": "{name} alafwaya {amount} pa {date}|{name} ali ndi ngongole ya {amount} pa {date}|{name} ulajisi ngongole {amount} {date}|{name} u na ni koloto ya {amount} ka {date}|{name} weti mwingo {amount} pa {date}|{name} weti mbongo {amount} dehi {date}|{name} weli nachilanga {amount} ku {date}",
  "Upcoming meeting: {date}{time}": "Ukukumana kulefika: {date}{time}|Msonkhano ukubwera: {date}{time}|Muswaangano ulaboola: {date}{time}|Kopano e tlang: {date}{time}|Kukumana kukwiza: {date}{time}|Chipompelu chikwisa: {date}{time}|Nkunguluko yikwiza: {date}{time}",
  "Cycle ends on {date}. Settle all loans and prepare the share-out.": "Inshiku ipwa pa {date}. Lipileni inkongole shonse no kupekanya ukwabana.|Nthawi ithe pa {date}. Lipirani ngongole zonse ndi kukonzekera logawana.|Nsaka ilamana {date}. Amubbadele ngongole zyoonse akubambilila kupekezya.|Nako e fela ka {date}. Mu life likoloto kaufela mi mu lokisetse ku aanya.|Nshiku ipwa pa {date}. Lipila mwingo yonse ne kukonkanya kupana.|Nsa\xF1u yakumisha dehi {date}. Zeyenu mbongo yejima nikuhemba kupana.|Nyaka yihwa ku {date}. Fweta vilanga vyosena nakuhemba kwabana.",
  "{n} mobile money payments are not yet matched": "Ukulipila {n} kwa mobile money tacipambana|Malipiro {n} a mobile money sanagwirizane|Kubbadela {n} kwamobile money tazyizwaani|Litefo tse {n} tsa mobile money ha li a tokanisoa|Kulipila {n} kwa mobile money kechi kunyana|Kuzeya {n} kwamobile money kakwanyana|Kufweta {n} kwamobile money kuhana kuwana",
  "{name}'s PIN is locked": "PIN ya {name} yalyalwa|PIN ya {name} yatsekedwa|PIN ya {name} yaanjililwa|PIN ya {name} e notilwe|PIN ya {name} yadinga|PIN ya {name} yatwalekawu|PIN ya {name} yapindilwa",
  "Turn on two-factor sign-in to protect your account": "Tendeka two-factor ukusunga akaunti yobe|Yatsani two-factor kuteteza akaunti yanu|Amwiite two-factor kukwabilila akaunti yanu|Mu bulele two-factor ho sireletsa akaunti|Tendeka two-factor kulinda akaunti yenu|Tachikishenu two-factor kukinga akaunti yenu|Tachika two-factor kukinga akaunti yenu"
});
Object.assign(DICT_MORE, {
  "Announcements": "Amashiwi ya bakalamba|Zilengezo|Zibalusyo|Litaba|Byamba|Yakumwekesha|Vyakumwekesa",
  "Post announcement": "Landa amashiwi|Ikani chilengezo|Amubikke cibalusyo|Mu \xF1ole litaba|Bika byamba|Bikenu yakumwekesha|Bika vyakumwekesa",
  "Also send as SMS to all members": "Tumeni na pa SMS kuli bonse|Tumizaninso ngati SMS kwa mamembala onse|Amutume alimwi a SMS kubamembala boonse|Mu romele hape ka SMS ku bamemba kaufela|Tuma na SMS kwa bamembala bonse|Tumenu naSMS kudi amembala ejima|Tuma naSMS kuli vamembala vosena",
  "Announcement posted": "Amashiwi alandwa|Chilengezo chaikidwa|Cibalusyo cabikkwa|Litaba le \xF1olilwe|Byamba byabikwa|Yakumwekesha yabikawu|Vyakumwekesa vyabikwa",
  "Delete this announcement?": "Mufumya aya mashiwi?|Chotsani chilengezochi?|Mulasula cibalusyo eeci?|Mu tuhe litaba le?|Mufumya byamba bino?|Mufumisha yakumwekesha yeniyi?|Mufumisa vyakumwekesa kanou?",
  "Announcement deleted": "Amashiwi afumishiwa|Chilengezo chachotsedwa|Cibalusyo casulwa|Litaba le tuhilwe|Byamba byafumishiwa|Yakumwekesha yafumishawu|Vyakumwekesa vyafumisiwa",
  "Avoid names and personal details. Phones are often shared and SMS is not private.": "Mwileka ukulemba amashina nefyabumwine. Ama feni yaba pamo kabili SMS taili ya bwine.|Pewani kulemba mayina ndi zinsinsi. Foni zimagawidwa ndipo SMS si yachinsinsi.|Mutalembi mazina azyakulisisikizya. Mafoni alabelesyegwa antoomwe alimwi SMS tiili yakusisikizya.|Mu se ke mu \xF1ole mabizo kamba litaba la sephiri. Li-foni li sebelisiwa hamoho mi SMS ha i sephiri.|Kemwalembai mazhina ne bya bufwishi. Foni yatumiwa pamo kabiji SMS kechi ya bufwishi.|Kanamwalembi mazina nivyakufwika. Mafoni atu\xF1a\xF1a hamu kaha SMS kayakufwika.|Kamwasoneka mazina navyakufwika. Mafoni vizatiswa hamwe kaha SMS kuhana kufwika.",
  "Write the announcement first": "Landeni amashiwi kubalilapo|Lembani chilengezo choyamba|Amulembe cibalusyo kusaanguna|Mu \xF1ole litaba pele|Lemba byamba kutangilila|Lembenu yakumwekesha tutwala|Soneka vyakumwekesa kutunda",
  "Announcements can be at most 300 characters": "Amashiwi tayafwile ukucilapo ifilembo 300|Zilengezo zisapitirire zilembo 300|Zibalusyo tazyeelede kwiinda mabala 300|Litaba ha li a lokela ho feta litaba tse 300|Byamba kebiyanjile kupitilila bilembwa 300|Yakumwekesha kayelela kupitilila yilembu 300|Vyakumwekesa kavyelela kupitilila vilembo 300",
  "Announcement not found": "Amashiwi taboneke|Chilengezo sichinapezeke|Cibalusyo tacisanduki|Litaba ha li fumanehi|Byamba kechi byaboneka|Yakumwekesha kakwanika|Vyakumwekesa kuhana kuhwanika",
  "Loan requests": "Ukupempa inkongole|Zopempha ngongole|Kukumbila ngongole|Likope tsa koloto|Kupula mwingo|Kulomba mbongo yakuzeya|Kulomba vilanga",
  "Request a loan": "Pempeni inkongole|Pemphani ngongole|Amukumbile ngongole|Mu kope koloto|Pula mwingo|Lombenu mbongo yakuzeya|Lomba chilanga",
  "Send request": "Tuma ukupempa|Tumizani pempho|Amutume kukumbila|Mu romele kope|Tuma kupula|Tumenu kulomba|Tuma kulomba",
  "Request sent": "Ukupempa kwatumwa|Pempho latumizidwa|Kukumbila kwatumwa|Kope e rometswe|Kupula kwatumwa|Kulomba kwatumbi|Kulomba kwatumwa",
  "Approve": "Vomela|Vomerezani|Amuzumine|Mu tiyise|Zumina|Zumina|Zumina",
  "Cancel": "Leka|Siyani|Amulekele|Mu fele|Leka|Hanjikenu|Lekela",
  "approved": "cavomelwa|chavomerezedwa|cizuminwe|e tiyisitswe|kyazuminwa|chazumino|chazuminwa",
  "cancelled": "calekwa|chasiyidwa|calekelwe|e felisitswe|kyalekwa|chahanjikawu|chalekelwa",
  "Loan request approved": "Ukupempa kwavomelwa|Pempho lavomerezedwa|Kukumbila kwazumininwa|Kope e amohetswe|Kupula kwazumina|Kulomba kwazuminawu|Kulomba kwazuminwa",
  "Loan request rejected": "Ukupempa kwakanwa|Pempho lakanidwa|Kukumbila kwakaanwa|Kope e hanilwe|Kupula kwakanwa|Kulomba kwakanawu|Kulomba kwakanwa",
  "Reason for rejecting (shown to the member)": "Cinshi mwakana (cilamwesha umwina)|Chifukwa chokana (chimaonetsedwa kwa membala)|Nkaambo nzi mukaana (cilalangwa mumembala)|Lebaka la ho hana (le bonts'oa memba)|Mulandu wa kukana (ukalangwa na membala)|Mulandu wakukana (wakalangwa namembala)|Mulandu wakukana (wakalangwa namembala)",
  "Loan request not found": "Ukupempa taboneke|Pempho sinapezeke|Kukumbila tacisanduki|Kope ha e fumanehi|Kupula kechi kwaboneka|Kulomba kakwanika|Kulomba kuhana kuhwanika",
  "This request has already been decided": "Ukupempa kwalipwishiwa kale|Pempho layankhulidwa kale|Kukumbila kwacisinizyidwe kale|Kope e se e rarolotswe|Kupula kwapwa kale|Kulomba kwakumisha kale|Kulomba kwapwa kale",
  "You already have a request waiting for a decision": "Mwaliba na ukupempa ukulindila|Muli ndi pempho lomwe likudikira|Mulijisi kukumbila kucilindide|U na ni kope e emetseng qeto|Mwakweta kupula kwalindila|Mwakweti kulomba kwalindila|Mweli nakulomba kwalindila",
  "{name} requested a loan of {amount}": "{name} apempele inkongole ya {amount}|{name} wapempha ngongole ya {amount}|{name} wakumbila ngongole ya {amount}|{name} u kopile koloto ya {amount}|{name} wapula mwingo wa {amount}|{name} walomba mbongo yakuzeya {amount}|{name} walomba chilanga cha {amount}",
  "Download my data": "Fumya ifyalembwa fyandi|Tsitsani zambiri zanga|Amukwezye zyakulembwa zyangu|Mu jarolle litaba la ka|Kula bilembwa byami|Kuluwenu yakulembeka yami|Kulula vyasonekwa vyami",
  "Download full backup (JSON)": "Fumya ifyalembwa fyonse (JSON)|Tsitsani zonse zosunga (JSON)|Amukwezye zyoonse zyakubambilwa (JSON)|Mu jarolle likopi kaufela (JSON)|Kula byonse bya kusunga (JSON)|Kuluwenu yejima yakusanda (JSON)|Kulula vyosena vyakusanda (JSON)"
});

// src/i18n-new.js
var row = (bem, nya, toi, loz) => [bem, nya, toi, loz, "", "", ""].join("|");
var DICT_NEW = {
  // member portal tabs and pay form
  "Pay": row("Lipila", "Lipirani", "Bbadela", "Lifa"),
  "Chat": row("Ukulanshanya", "Macheza", "Kwaambaula", "Ku bulelelana"),
  "Make a contribution": row("Lipileni ifya kusunga", "Perekani zopereka", "Bbadela kubbadela kwako", "Fa seabo sa hao"),
  "Send the money by mobile money to your group, then enter the amount and the transaction ID from the payment message. An officer confirms it and it is added to your savings.": row(
    "Tumeni indalama pa mobile money ku cilimba, pa numa mulembe ubunonshi na transaction ID ukufuma ku mashiwi ya kulipila. Umukalamba alefikapo, indalama ikengaongelwa ku fyo mwasunga.",
    "Tumizani ndalama pa mobile money ku gulu lanu, kenako lembani ndalama ndi transaction ID kuchokera mu uthenga wolipira. Mtsogoleri adzatsimikiza ndipo idzawonjezedwa ku ndalama zanu zosunga.",
    "Amutume mali kwiinda mukuvwiya mali kubunga bwanu, kuzwa waalemba mali alimwi a transaction ID kuzwa kumulumbe wakubbadela. Mulangizi uyakusimpe alimwi mali ayakubikkwa kuzyakubamba zyanu.",
    "Mu romele mali ka mobile money ku sikwata sa mina, mi mu \xF1ole mali ni transaction ID ye zwa kwa taba ya ku lifa. Mueteleli u ka i tiisa mi i ka ekezwa kwa mali a mina a ku boloka."
  ),
  "Paid with": row("Mwalipile na", "Mwalipira ndi", "Mwabbadela a", "Mu lifile ka"),
  "Transaction ID": row("Transaction ID", "Transaction ID", "Transaction ID", "Transaction ID"),
  "Sent. An officer will confirm it.": row("Yatumwa. Umukalamba akafikapo.", "Yatumizidwa. Mtsogoleri adzatsimikiza.", "Yatumwa. Mulangizi uyakusimpe.", "I romelwe. Mueteleli u ka i tiisa."),
  "Send": row("Tuma", "Tumizani", "Tuma", "Roma"),
  "confirmed": row("yafikapo", "yatsimikizidwa", "yasimpwa", "i tiisitwe"),
  // change PIN
  "Change my PIN": row("Cinjeni PIN yandi", "Sinthani PIN yanga", "Amucince PIN yangu", "Fetola PIN ya ka"),
  "Current PIN": row("PIN iyamulolo", "PIN yamakono", "PIN yanu yamunoono", "PIN ya cwale"),
  "New 4-digit PIN": row("PIN impya ya manambala 4", "PIN yatsopano ya manambala 4", "PIN mpya ya manamba 4", "PIN ye nca ya linomoro ze 4"),
  "Save PIN": row("Sungeni PIN", "Sungani PIN", "Bika PIN", "Boloka PIN"),
  "PIN changed": row("PIN yacinjwa", "PIN yasinthidwa", "PIN yacincwa", "PIN i fetotwe"),
  // sign in: first-time PIN
  "Set my PIN": row("Bikeni PIN yandi", "Ikani PIN yanga", "Amubikke PIN yangu", "Beya PIN ya ka"),
  "Ask an officer to set your PIN, then sign in with your phone number and PIN.": row("Pempeni umukalamba abike PIN yenu, pa numa mwingile ne nambala ya feni ne PIN.", "Pemphani mtsogoleri kuti akhazikitse PIN yanu, kenako lowani ndi nambala ya foni ndi PIN.", "Amukumbile mulangizi kuti abikke PIN yanu, kuzwa mwatanta kwiinda mu namba ya foni a PIN.", "Mu kope mueteleli a mu beye PIN, mi mu kene ka nomoro ya mulaho ni PIN."),
  "Back to sign in": row("Bwelela ku kwingila", "Bwererani ku kulowa", "Boolela kukwingila", "Kutela ku kena"),
  "Set PIN": row("Bika PIN", "Ikani PIN", "Bikka PIN", "Beya PIN"),
  "Enter a 4-digit PIN for {name}": row("Lembeni PIN ya manambala 4 ya {name}", "Lembani PIN ya manambala 4 ya {name}", "Lemba PIN ya manamba 4 ya {name}", "\xD1ola PIN ya linomoro ze 4 ya {name}"),
  "PIN set; tell the member their PIN": row("PIN yabikwa; ishibisheni umunyina PIN yakwe", "PIN yakhazikitsidwa; uzani membala PIN yake", "PIN yabikkwa; amwaambile bamembala PIN yabo", "PIN i beilwe; mu bolelele memba PIN ya hae"),
  // chat
  "Messages": row("Amashiwi", "Mauthenga", "Milumbe", "Manzwi"),
  "Message the officers": row("Tumeni amashiwi ku bakalamba", "Tumizirani atsogoleri uthenga", "Amutume mulumbe kubalangizi", "Mu romele manzwi ku baeteleli"),
  "Your chairperson, treasurer and secretary can read and answer here.": row("Umukalamba, umusungi wa ndalama ne kalemba bengabelenga no kwasuka pano.", "Wapampando, osunga ndalama ndi mlembi angawerenge ndi kuyankha pano.", "Sicibbadela, mubbadeli alimwi amulembi balakonzya kubala alimwi kwiingula aawa.", "Mueteleli, mubolaki wa mali ni mubali ba kona ku bala ni ku araba mwa."),
  "Write a message\u2026": row("Lembeni amashiwi\u2026", "Lembani uthenga\u2026", "Lemba mulumbe\u2026", "\xD1ola manzwi\u2026"),
  "Write a reply\u2026": row("Lembeni icasuko\u2026", "Lembani yankho\u2026", "Lemba lwiingulo\u2026", "\xD1ola karabo\u2026"),
  "Talk with members of your group. Every officer can see and answer these messages.": row("Lanshanyeni na bamembala ba cilimba. Bakalamba bonse bengabona no kwasuka.", "Lankhulani ndi mamembala a gulu lanu. Atsogoleri onse amatha kuona ndi kuyankha.", "Amwaambule abamembala bakabunga kanu. Balangizi boonse balakonzya kubona alimwi kwiingula.", "Mu bulelelane ni bamemba ba sikwata. Baeteleli kaufela ba kona ku bona ni ku araba."),
  "Choose a member to start.": row("Sala umunyina ukutendeka.", "Sankhani membala kuti muyambe.", "Amusale mamembala kutalika.", "Mu bute memba ku qala."),
  "No members yet.": row("Takuli abanyina.", "Palibe mamembala.", "Taakwe bamembala.", "Ha ku na bamemba."),
  // pot
  "Pot": row("Indalama shonse", "Ndalama zonse", "Mali aali kabunga", "Mali a sikwata"),
  "How much money the group holds right now.": row("Indalama ifyo icilimba cili nafyo nomba.", "Ndalama zomwe gulu liri nazo tsopano.", "Mali aali kubunga buyo aino ciindi.", "Mali a sikwata ka nako ye."),
  "Money in the pot": row("Indalama mu cilimba", "Ndalama mu gulu", "Mali mukabunga", "Mali mwa sikwata"),
  "Lent out, not yet repaid": row("Ifyatolwa ifishilipilwa", "Zobwerekedwa zosabweza", "Zyakulomwa taziinduli kubbadelwa", "Se si adimilwe se si si ka lifiwa"),
  "Online payments waiting": row("Ifyalipilwa pa intaneti ifilindile", "Zolipira pa intaneti zodikira", "Zyakubbadela zyalindide", "Ku lifa ku lindile"),
  "Online payments": row("Ukulipila pa intaneti", "Zolipira pa intaneti", "Kubbadela kwiinda ku intaneti", "Ku lifa ka intaneti"),
  "Check each one against the mobile-money message or your account before confirming. Confirming adds it to the member\u2019s savings.": row("Lingenieni fyonse na mashiwi ya mobile money ilyo mukasuminisha.", "Yerekezerani chilichonse ndi uthenga wa mobile money musanatsimikize.", "Amulingisye cilacila a mulumbe wa mobile money katutasimpi.", "Mu bone se se\xF1we ni se se\xF1we ka taba ya mobile money pele mu tiisa."),
  "Reason for rejecting (optional)": row("Ico mwakaana (tacikakilwe)", "Chifukwa chokana (sichofunikira)", "Cakaanda (tacikkomene)", "Ke ka mang ha mu kana (ha i hatelelwi)"),
  "Payment recorded": row("Ukulipila kwalembwa", "Malipiro alembedwa", "Kubbadela kwalembwa", "Ku lifa ku \xF1olilwe"),
  "Payment rejected": row("Ukulipila kwakaanwa", "Malipiro akanidwa", "Kubbadela kwakaandwa", "Ku lifa ku ganilwe"),
  "No online payments yet.": row("Takuli ukulipila pa intaneti.", "Palibe malipiro pa intaneti.", "Taakwe kubbadela kwiinda ku intaneti.", "Ha ku na ku lifa ka intaneti."),
  "Savings by member": row("Ifyasungwa pa munyina", "Zosunga za membala aliyense", "Zyakubamba zya mamembala", "Mali a ku boloka a memba"),
  "Method": row("Inshila", "Njira", "Nzila", "Mokwa"),
  "Confirm": row("Sumina", "Tsimikizani", "Simpa", "Tiisa"),
  "Loan repayments": row("Ukubwesha inkongole", "Kubweza ngongole", "Kubbadela ngongole", "Ku lifa koloto"),
  "Paid out": row("Ifyalipilwa", "Zolipidwa", "Zyakabbadelwa", "Se si lifilwe"),
  "Group pool": row("Indalama sha cilimba", "Ndalama za gulu", "Mali aabunga", "Mali a sikwata"),
  "Query sent": row("Ukubuuta kwatumwa", "Funso latumizidwa", "Mubuzyo watumwa", "Potso i romelwe"),
  "Welcome back": row("Mwalibwela bwino", "Takulandirani kachiwiri", "Mwazoola kabotu", "Mu amuhelehile hape"),
  "Sign in with your phone number and 4-digit PIN.": row("Ingileni ne nambala ya feni ne PIN ya manambala 4.", "Lowani ndi nambala ya foni ndi PIN ya manambala 4.", "Amwingile a namba ya foni a PIN ya manamba 4.", "Mu kene ka nomoro ya mulaho ni PIN ya linomoro ze 4."),
  "PIN or password": row("PIN nelyo icipasila", "PIN kapena mawu achinsinsi", "PIN naa pasiwedi", "PIN kamba pasiwedi"),
  "Create my password": row("Pangeni icipasila canu", "Pangani mawu anga achinsinsi", "Amupange pasiwedi yanu", "Mu bope pasiwedi ya mina"),
  "Choose your own password of 8 or more characters. You can then sign in with it instead of your PIN.": row("Salileni icipasila ca fibelelo 8 nelyo ukucila. Mukengingila na cona mu kuntu kwa PIN.", "Sankhani mawu achinsinsi a zilembo 8 kapena kuposera. Mutha kulowa nawo pa malo pa PIN.", "Amusale pasiwedi ya zyaamba 8 naa kwiinda. Mulakonzya kwingila andiyo mubusena bwa PIN.", "Mu bute pasiwedi ya litaba li 8 kamba ku fitisa. Mu kona ku kena ka yona ku fapana ni PIN."),
  "Current PIN or password": row("PIN nelyo icipasila icamulolo", "PIN kapena mawu achinsinsi apano", "PIN naa pasiwedi yamunoono", "PIN kamba pasiwedi ya cwale"),
  "New password (8+ characters)": row("Icipasila cipya (fibelelo 8+)", "Mawu achinsinsi atsopano (zilembo 8+)", "Pasiwedi mpya (zyaamba 8+)", "Pasiwedi ye nca (litaba 8+)"),
  "Repeat new password": row("Bwekeshapo icipasila cipya", "Bwerezani mawu achinsinsi atsopano", "Amubweede pasiwedi mpya", "Mu pheze pasiwedi ye nca"),
  "Save password": row("Sungeni icipasila", "Sungani mawu achinsinsi", "Bika pasiwedi", "Boloka pasiwedi"),
  "Password saved": row("Icipasila casungwa", "Mawu achinsinsi asungidwa", "Pasiwedi yabikkwa", "Pasiwedi i bolokilwe"),
  "The two passwords do not match": row("Ifipasila fibili tafipalana", "Mawu awiri sakufanana", "Pasiwedi zyobilo tazyakozyana", "Pasiwedi ze peli ha li swana"),
  "Allow PIN setup": row("Basuminishe ukubika PIN", "Alolereni kukhazikitsa PIN", "Amulekele kubikka PIN", "Lumelela ku beya PIN"),
  "Setup open": row("Ukubika kwaseguka", "Kukhazikitsa kwatsegula", "Kubikka kwazibuka", "Ku beya ku butilwe"),
  "Ask an officer to allow PIN setup for your number. Then choose your own PIN here (and a longer password if you like).": row("Pempeni umukalamba aleke mubike PIN ku nambala yenu. Pa numa salileni PIN yenu pano (ne cipasila cilepa nga mulefwaya).", "Pemphani mtsogoleri kuti alole kukhazikitsa PIN pa nambala yanu. Kenako sankhani PIN yanu pano (ndi mawu achinsinsi aatali ngati mukufuna).", "Amukumbile mulangizi kuti amulekele kubikka PIN ku namba yanu. Kuzwa amusale PIN yanu aawa (a pasiwedi ilampa kuti mwayanda).", "Mu kope mueteleli a mu lumelele ku beya PIN ku nomoro ya mina. Mi mu bute PIN ya mina mwa (ni pasiwedi ye telele ha mu bata)."),
  "Password (optional, 8+ characters)": row("Icipasila (tacikakilwe, fibelelo 8+)", "Mawu achinsinsi (osafunikira, zilembo 8+)", "Pasiwedi (tiikkomene, zyaamba 8+)", "Pasiwedi (ha i hatelelwi, litaba 8+)"),
  "Save and sign in": row("Sungeni mwingile", "Sungani ndi kulowa", "Bika alimwi mwingile", "Boloka mi mu kene"),
  "The member can now choose their own PIN or password for the next 24 hours": row("Umunyina nomba engasala PIN nelyo icipasila mu maawala 24", "Membala tsopano atha kusankha PIN kapena mawu achinsinsi mu maola 24", "Mamembala mpawo balakonzya kusala PIN naa pasiwedi mumawoola aali 24", "Memba u kona ku bute PIN kamba pasiwedi ka lihora ze 24"),
  "Download for Excel": row("Fumya ya Excel", "Tsitsani ya Excel", "Amukwezye ya Excel", "Jarolla ya Excel"),
  "Print or save as PDF": row("Printa nelyo sungeni nga PDF", "Sindikizani kapena sungani ngati PDF", "Amupirinte naa mubike mbuli PDF", "Gatisa kamba boloka ka PDF"),
  "Contributions per week": row("Ifyasungwa pa cungulo", "Zopereka pa sabata", "Kubbadela mu wiki", "Seabo ka veke"),
  "Not paid this period": row("Abashalipila muli ici ciputulwa", "Osalipira nthawi ino", "Batabbadela mu ciindi eci", "Ba sa lifang nako ye"),
  "Send reminder": row("Tumeni ukwibukisha", "Tumizani chikumbutso", "Amutume kuibusya", "Roma ku gopotsa"),
  "Everyone has paid this period.": row("Bonse balipila muli ici ciputulwa.", "Aliyense walipira nthawi ino.", "Boonse babbadela mu ciindi eci.", "Kaufela ba lifile mwa nako ye."),
  "Reminders queued": row("Ukwibukisha kwatumwa", "Zikumbutso zatumizidwa", "Kuibusya kwatumwa", "Ku gopotsa ku romelwe"),
  "Receipt": row("Rasiti", "Risiti", "Rasiti", "Risiti"),
  "Privacy and terms": row("Ubumbombo ne mafunde", "Chinsinsi ndi malamulo", "Bufwambaana alimwi mibelesyo", "Mpilo ya lipitso ni milao"),
  "Back": row("Bwelela", "Bwererani", "Boolela", "Kutela"),
  "auditor": row("umupima wa mabuku", "woyang ana ndi mabuku", "mulanganya mabuku", "mubali wa libuka"),
  "Recent server errors": row("Ifyabipa fya server fyapa kale", "Zolakwika zaposachedwa", "Mapenzi aamuselevha aakumpelelo", "Liphoso la server la haufinyane"),
  "No errors. Everything is running well.": row("Takuli ifyabipa. Fyonse fili bwino.", "Palibe zolakwika. Zonse zikuyenda bwino.", "Taakwe mapenzi. Zyoonse zili kabotu.", "Ha ku na liphoso. Se si ka bomnete."),
  "When": row("Lilali", "Liti", "Lili", "Neng"),
  "Where": row("Kwi", "Kuti", "Kuli", "Kai"),
  "Problem": row("Icabipa", "Vuto", "Mapenzi", "Bothata"),
  "You were invited to an online meeting.": row("Mwapokelela ukwita ku kukumana pa intaneti.", "Mwaitanidwa ku msonkhano wa pa intaneti.", "Mwaitwa kumuswaangano wa aintaneti.", "Mu memilwe kwa kopano ya inthanete."),
  "Dismiss": row("Leka", "Tsekani", "Amwaleke", "Tlohela"),
  "Copy invite link": row("Koppa ulupiya lwa kwita", "Koperani ulalo woitanira", "Amukopye lulumbe lwakwiita", "Kopa kamba ya memo"),
  "Invite link copied. Paste it in WhatsApp or SMS.": row("Ulupiya lwa kwita lwakopwa. Lipandeni pa WhatsApp nelyo SMS.", "Ulalo waukopedwa. Uyikeni pa WhatsApp kapena SMS.", "Lulumbe lwakopwa. Amulubike a WhatsApp naa SMS.", "Kamba i kopilwe. Mu i behe mwa WhatsApp kamba SMS."),
  "Group chat": row("Ukulanshanya kwa cilimba", "Macheza a gulu", "Kwaambaula kwakabunga", "Ku bulelelana ha sikwata"),
  "Members": row("Abanyina", "Mamembala", "Bamembala", "Bamemba"),
  "Officers": row("Abakalamba", "Atsogoleri", "Balangizi", "Baeteleli"),
  "Member messages": row("Amashiwi ya banyina", "Mauthenga a mamembala", "Milumbe ya bamembala", "Manzwi a bamemba"),
  "Everyone in your group can read this room. Be kind and keep it about the group.": row("Bonse mu cilimba bengabelenga pano. Mube ne cikuuku, mulande pa fya cilimba.", "Aliyense mu gulu lanu amatha kuwerenga pano. Khalani aulemu ndipo lankhulani za gulu.", "Boonse mukabunga balakonzya kubala aawa. Amube abuuya, amwaambe zyakabunga.", "Kaufela mwa sikwata ba kona ku bala mwa. Mu be ni mutauso, mu bulele za sikwata."),
  "Everyone in the group can read this room.": row("Bonse mu cilimba bengabelenga pano.", "Aliyense mu gulu amatha kuwerenga pano.", "Boonse mukabunga balakonzya kubala aawa.", "Kaufela mwa sikwata ba kona ku bala mwa."),
  "Write to the group\u2026": row("Lembeni ku cilimba\u2026", "Lembani ku gulu\u2026", "Lemba kukabunga\u2026", "\xD1ola ku sikwata\u2026"),
  "Delete this message?": row("Mulefwaya ukufutwa amashiwi aya?", "Kodi mukufuna kufufuta uthenga uwu?", "Mwayanda kusowa mulumbe ooyu?", "Mu bata ku hlakola manzwi ao?"),
  "Message a member": row("Tumeni amashiwi ku munyina", "Tumizirani membala uthenga", "Amutume mulumbe kumamembala", "Mu romele memba manzwi"),
  "No other members yet.": row("Takuli abanyina bambi.", "Palibe mamembala ena.", "Taakwe bamembala bamwi.", "Ha ku na bamemba ba bangwe."),
  "Private: only you and {name} can read this.": row("Ya bwamba: imwe na {name} fye mwengabelenga.", "Zachinsinsi: inu ndi {name} nokha amene mungawerenge.", "Ncakasolo: nywe a {name} buyo mulakonzya kubala.", "Ke lekunutu: ni wena feela ni {name} ba kona ku bala."),
  "Still owed": row("Ifishilipilwa", "Zotsala", "Zisyaalide", "Se si setseng"),
  "Pay in full": row("Lipila fyonse", "Lipirani zonse", "Bbadela zyoonse", "Lifa kaufela"),
  "Close": row("Cala", "Tsekani", "Amuzibike", "Tlela"),
  "Saving\u2026": row("Ukusunga\u2026", "Kusunga\u2026", "Kubika\u2026", "Ku boloka\u2026"),
  "Enter a valid amount": row("Lembeni ubunonshi bwa cine", "Lembani ndalama yoyenera", "Amulembe mali aamubotu", "Mu \xF1ole mali a nepahetseng"),
  "Please confirm": row("Fwaileni musuminishe", "Chonde tsimikizani", "Amusimpe", "Ka kopo mu tiise"),
  "Please answer": row("Fwaileni mwasuke", "Chonde yankhani", "Amwiingule", "Ka kopo mu arabe"),
  "Yes, continue": row("Ee, endelela", "Inde, pitirizani", "Inzya, amuyendelele", "Ee, tswelela"),
  "OK": row("Nshiwa", "Chabwino", "Ndilibotu", "Ku lukile")
};

// src/i18n.jsx
var LANGS = [
  ["en", "English"],
  ["bem", "Ichibemba"],
  ["nya", "Chinyanja"],
  ["toi", "Chitonga"],
  ["loz", "Silozi"],
  ["kqn", "Kikaonde"],
  ["lun", "Chilunda"],
  ["lue", "Luvale"]
];
var SLOT = { bem: 0, nya: 1, toi: 2, loz: 3, kqn: 4, lun: 5, lue: 6 };
var DICT = {
  // navigation
  "Home": "Ku ng'anda|Kunyumba|Munzi|Hae|Ku nzubo|Ku nzu|Ku nzo",
  "Dashboard": "Ukulolesha|Chiwonetsero|Kulangilila|Kubonisa|Kulangulula|Kutala|Kutala",
  "Ledger": "Ibuku lya ndalama|Buku la ndalama|Bbuku lyamali|Buka ya mali|Buku ya mali|Buku dya mbongo|Buku lyambongo",
  "Meetings": "Ukukumana|Misonkhano|Miswaangano|Likopano|Kukumana|Michipompelu|Nkunguluko",
  "Loans": "Inkongole|Ngongole|Ngongole|Likoloto|Mwingo|Mbongo yakuzeya|Vilanga",
  "Members": "Abanyina|Mamembala|Bamembala|Bamemba|Bamembala|Amembala|Vamembala",
  "More": "Ifingi|Zina|Zimbi|Tse \xF1wi|Byambi|Hiyedi|Vyeka",
  "Payments": "Ukulipila|Malipiro|Kubbadela|Litefo|Kulipila|Kuzeya|Kufweta",
  "Disputes": "Amakani|Mikangano|Mazwanga|Likanyiso|Makani|Makani|Makani",
  "Share-out": "Ukwabana|Logawana|Kupekezya|Ku aanya|Kupana|Kupana|Kwabana",
  "Statements": "Ifyalembwa|Ma statement|Ma statement|Li-statement|Ma statement|Ma statement|Ma statement",
  "SMS log": "Ifya SMS|Mauthenga a SMS|||||",
  "Audit log": "Ibuku lya kulolesha|Mbiri ya kafukufuku|Rekodi yakulangisisya|Buka ya ku lekisisa|Buku ya kulondolola|Buku dyakulondolola|Buku lyakulondolola",
  "Security": "Ukusunga umutende|Chitetezo|Cakulikwabilila|Polokeho|Bukinzo|Kukinga|Kukinga",
  "Log out": "Fuma|Tulukani|Amufume|Mu tswe|Fumamo|Fumamu|Fuma",
  "VILLAGE BANKING": "UKUSUNGA MU CILIMBA|KUSUNGA MU GULU|KUBBADELA MUCIBUNGA|KU BOLOKA MWA SIKWATA|KUSUNGA MU KIPWILO|KUSANDA MU CHIKUMBU|KUSEKA MWACHISAKA",
  "Language": "Ululimi|Chilankhulo|Ciyaluulo|Puo|Mwa kwamba|Mwakulumbulwila|Lilimi",
  "Loading\u2026": "Isubilile\u2026|Dikirani\u2026|Amulindile\u2026|Mu lete\u2026|Lindai\u2026|Lindenu\u2026|Lindenu\u2026",
  "Choose\u2026": "Sala\u2026|Sankhani\u2026|Amusale\u2026|Mu hete\u2026|Sala\u2026|Sakulenu\u2026|Sakulenu\u2026",
  // people and accounts
  "Member": "Umwina|Membala|Membala|Memba|Membala|Membala|Membala",
  "Name": "Ishina|Dzina|Zina|Libizo|Zhina|Dijina|Lizina",
  "Full name": "Ishina lyonse|Dzina lonse|Zina lyoonse|Libizo kaufela|Zhina yonse|Dijina dyejima|Lizina lyosena",
  "Your name": "Ishina lyobe|Dzina lanu|Zina lyanu|Libizo la mina|Zhina yenu|Dijina dyenu|Lizina lyenu",
  "Phone": "Feni|Foni|Foni|Foni|Foni|Foni|Foni",
  "Phone number": "Inambala ya feni|Nambala ya foni|Namba yafoni|Nomoro ya foni|Nambala ya foni|Nambala ya foni|Nambala ya foni",
  "Password": "|Chinsinsi|||||",
  "New password": "Password ipya|Password yatsopano|Password mpya|Password e nca|Password ya pya|Password yipya|Password yipya",
  "Current password": "Password ya nomba|Password yapano|Password yamuno|Password ya sunu|Password ya lelo|Password yamucha\xF1a|Password yamunako",
  "Authenticator code": "Code ya Authenticator|Khodi ya Authenticator|Code ya Authenticator|Code ya Authenticator|Code ya Authenticator|Code ya Authenticator|Code ya Authenticator",
  "Role": "Umulimo|Udindo|Mulimo|Mosebezi|Mwingilo|Mudimu|Mulimo",
  "Status": "Imibele|Mkhalidwe|Mbwaabede|Maemo|Mikalile|Mwikalilu|Mukwakwo",
  "Add member": "Ikata umwina|Onjezani membala|Amuyunge membala|Mu tahise memba|Ongeza membala|Ongeja membala|Ongeza membala",
  "Reset PIN": "Shintilila PIN|Konzaninso PIN|Amuyibweze PIN|Mu buyiseze PIN|Ibuula PIN|Dilula PIN|Hulula PIN",
  "Group name": "Ishina lya cilimba|Dzina la gulu|Zina lyacibunga|Libizo la sikwata|Zhina ya kipwilo|Dijina dyachikumbu|Lizina lyachisaka",
  "Location": "Ncende|Malo|Busena|Sibaka|Mbalo|Hena|Handu",
  // money
  "Amount": "Ubunonshi|Ndalama|Mali|Mali|Mali|Mbongo|Mbongo",
  "Amount (K)": "Ubunonshi (K)|Ndalama (K)|Mali (K)|Mali (K)|Mali (K)|Mbongo (K)|Mbongo (K)",
  "Savings": "Ukusunga|Zosungidwa|Mali aabbadelwa|Mali a bolokilwe|Mali yasungwa|Mbongo yasandi|Mbongo yasekwa",
  "Total savings": "Yonse iya kusunga|Zosungidwa zonse|Mali oonse aabbadelwa|Mali kaufela a bolokilwe|Mali yonse yasungwa|Mbongo yejima yasandi|Mbongo yosena yasekwa",
  "Savings after": "Ukusunga panuma|Zosungidwa pambuyo|Mali amakwesi|Mali ka mora|Mali panyuma|Mbongo kunyima|Mbongo kuyehi",
  "Members' savings": "Ukusunga kwa banyina|Zosungidwa za mamembala|Mali aabbadelwa aabamembala|Mali a bolokilwe a bamemba|Mali yasungwa ya bamembala|Mbongo yasandi ya amembala|Mbongo yasekwa ya vamembala",
  "Cash in the pool": "Ndalama shaikatilwe|Ndalama mu thumba|Mali mucisaka|Mali mwa setulo|Mali mu bwine|Mbongo muchisaka|Mbongo muchisaka",
  "Contribution": "Ukusunga|Zopereka|Kubbadela|Ku boloka|Kusunga|Kusanda|Kuseka",
  "Contributions": "Ukusunga|Zopereka|Kubbadela|Ku boloka|Kusunga|Kusanda|Kuseka",
  "Contribution (K)": "Ukusunga (K)|Zopereka (K)|Kubbadela (K)|Ku boloka (K)|Kusunga (K)|Kusanda (K)|Kuseka (K)",
  "Contributed": "Fyasungwa|Zoperekedwa|Cabbadelwa|Se ba bolokile|Kyasungwa|Chasandi|Chasekwa",
  "Fine": "Ifine|Chindapusa|Cilango|Sisupo|Ifine|Ifine|Ifine",
  "Fines": "Ifine|Zindapusa|Milango|Lisupo|Ifine|Ifine|Ifine",
  "Fines collected": "Ifine fyaputulwa|Zindapusa zosonkhanitsidwa|Milango iikkedwe|Lisupo ze ba bokile|Ifine yaangulwa|Ifine yasonkelwa|Ifine vyasonekwa",
  "Late fine (K)": "Ifine lya kwelela (K)|Chindapusa chochedwa (K)|Cilango cakuccererwa (K)|Sisupo sa ku liehela (K)|Ifine ya kukowela (K)|Ifine yakuchelela (K)|Ifine yakuhwehwa (K)",
  "Absence fine (K)": "Ifine ya kubula (K)|Chindapusa chosapezeka (K)|Cilango cakutaboneka (K)|Sisupo sa ku ba sa teng (K)|Ifine ya kubula (K)|Ifine yakuhana (K)|Ifine yakuhana (K)",
  "Apply late fines": "Lemba ifine fya kwelela|Perekani zindapusa zochedwa|Amubikke milango yakuccererwa|Mu beye lisupo za ku liehela|Bika ifine ya kukowela|Bika ifine yakuchelela|Bika ifine yakuhwehwa",
  "Principal": "Ndalama shatendeka|Ndalama yoyamba|Mali aakusaanguna|Mali a pili|Mali ya kusanguka|Mbongo yakusambilila|Mbongo yakusaka",
  "Principal (K)": "Ndalama shatendeka (K)|Ndalama yoyamba (K)|Mali aakusaanguna (K)|Mali a pili (K)|Mali ya kusanguka (K)|Mbongo yakusambilila (K)|Mbongo yakusaka (K)",
  "Interest": "|Chiwongola dzanja|||||",
  "Instalments": "Ifipande|Magawo|Zipande|Likalolo|Bipande|Mapandu|Vipande",
  "Loan limit (\xD7 savings)": "Umupaka wa nkongole (\xD7 ukusunga)|Malire a ngongole (\xD7 zosungidwa)|Mupaka wangongole (\xD7 kubbadela)|Mubeso wa koloto (\xD7 ku boloka)|Mupaka wa mwingo (\xD7 kusunga)|Mpaka wambongo yakuzeya (\xD7 kusanda)|Mpaka wachilanga (\xD7 kuseka)",
  "Outstanding": "Ifyashala|Zotsala|Cisyedwe|Se si \u0161etile|Kyashala|Chasala\xF1a|Chasalako",
  "Next due": "Ukulipila kwakonkapo|Malipiro otsatira|Kubbadela kutobelela|Ku busa ku latelezi|Kulipila kutwajilako|Kuzeya kwakukonkelaku|Kufweta kwakukonda",
  "Due": "Ukulipila pa|Tsiku lolipira|Buzuba bwakubbadela|Ku lifa ka|Kulipila pa|Kuzeya dehi|Kufweta ku",
  "Paid": "Fyalipilwa|Walipira|Bwabbadelwa|Ku lifilwe|Kwalipwa|Kwazeyi|Kwafwetwa",
  "Schedule": "Ndandanda|Ndandanda|Ndandanda|Lenaneo|Ndandanda|Ndandanda|Ndandanda",
  "Disburse loan": "Peela inkongole|Perekani ngongole|Amupe ngongole|Mu file koloto|Pa mwingo|Pana mbongo yakuzeya|Pa chilanga",
  "Record repayment": "Landa ukulipila|Lembani malipiro|Amulembe kubbadela|Mu \xF1ole ku busa|Lemba kulipila|Lemba kuzeya|Soneka kufweta",
  "Pool": "|Thumba|||||",
  "Payout": "Ukupeela|Kulipira|Kubbadelela|Ku lifa|Kupana|Kupana|Kupa",
  "Pay out pot": "Peela ndalama shonse|Lipirani ndalama zonse|Amubbadele mali oonse|Mu lifele mali kaufela|Pana mali yonse|Pana mbongo yejima|Pa mbongo yosena",
  "Share-out statement": "Ifyalembwa fya kwabana|Chikalata cha logawana|Statement ya kupekezya|Statement ya ku aanya|Statement ya kupana|Statement ya kupana|Statement ya kwabana",
  "Recalculate": "Bwekeshapo ukubala|Werenganinso|Amubale alubo|Mu balele hape|Bala kabiji|Balenu kapwa|Bala lyehi",
  "Approve and close cycle": "Vomela no kupwisha inshiku|Vomerezani ndi kutseka nthawi|Amuzumine akumana nsaka|Mu tiyise mi mu notise nako|Zumina ne kupwisha nshiku|Zumina nikukumisha nsa\xF1u|Zumina nakuhwisa nyaka",
  // ledger and records
  "Date": "Inshiku|Tsiku|Buzuba|Lizazi|Dyubo|Dehi|Chisuku",
  "When": "Lilali|Liti|Lili|Lili|Lili|Kweni|Lyehi",
  "Type": "Ifyo ciba|Mtundu|Mulimo|Mofuta|Mushindo|Mushindu|Mushindo",
  "By": "Na|Ndi|Kuzwa kuli|Ki|Na|Nawa|Na",
  "To": "Kuli|Kwa|Kuli|Ku|Kwa|Kudi|Kuli",
  "Who": "Nani|Ndani|Nguni|Ki mang|Ani|Njiyi|Ngweji",
  "Message": "Ubutumwa|Uthenga|Mulumbe|Molaetsa|Mukanda|Kalata|Mujimbu",
  "Entry": "Icalembwa|Cholembedwa|Cakulembwa|Se si \xF1olilwe|Kilembwa|Chakulembeka|Chasonekwa",
  "Entity": "Icintu|Chinthu|Cintu|Selo|Kintu|Chuma|Chuma",
  "Details": "Ifyalembwa|Zambiri|Makani|Lintha|Mapo|Ifyakutala|Vyuma",
  "Action": "Icakucita|Zochita|Cakucita|Ketso|Kyakuba|Chakuzata|Chakuzata",
  "Post entry": "Landa icalembwa|Lembani|Amulembe|Mu \xF1ole|Lemba|Lemba|Soneka",
  "Post": "Landa|Tumizani|Amutume|Mu tume|Tuma|Tuma|Tuma",
  "Reverse": "Bwesha|Bwezani|Amubweze|Mu busise|Bwezha|Zeyesha|Fwetesa",
  "Verify ledger chain": "Alolesheshe ibuku|Tsimikizani buku la ndalama|Amulange bbuku|Mu lekisise buka|Lengai buku|Talenu buku|Talenu buku",
  "Delete": "Ukufutapo|Chotsani|Amusule|Ku tuhela|Kufumya|Kufumisha|Kufumisa",
  "Delete this cycle": "Futa inshiku ishi|Chotsani nthawi iyi|Amusule nsaka eeyi|Mu tuhele nako ye|Fumya nshiku ino|Fumisha nsa\xF1u yeniyi|Fumisa nyaka kanou",
  "Update": "Shintilila|Sinthani|Amucince|Mu fetole|Shinja|Shinjika|Shinjika",
  "Open": "Fungula|Tsegulani|Amuzibule|Mu bulele|Fungula|Bula|Fungula",
  "Start": "Tendeka|Yambani|Amutalike|Mu simule|Tendeka|Tachikisha|Tachika",
  "End": "Ukupwa|Mapeto|Kumana|Ku fela|Kupwa|Kukumisha|Kuhwa",
  // cycles and meetings
  "No open cycle.": "Takwaba nshiku ishipyanga.|Palibe nthawi yotseguka.|Takuli nsaka iibuluzidwe.|Ha ku na nako e bulezi.|Kechi kuli nshiku yafunguka.|Kakuli nsa\xF1u yabulika.|Kuhana nyaka yafungulwa.",
  "Open cycle": "Tendeka inshiku|Tsegulani nthawi|Amutalike nsaka|Mu bulele nako|Tendeka nshiku|Tachikisha nsa\xF1u|Tachika nyaka",
  "Open a new savings cycle": "Tendeka inshiku shipya sha kusunga|Tsegulani nthawi yatsopano yosunga|Amutalike nsaka mpya yakubbadela|Mu bulele nako ye nca ya ku boloka|Tendeka nshiku ya kusunga ya pya|Tachikisha nsa\xF1u yipya yakusanda|Tachika nyaka yipya yakuseka",
  "Start meeting": "Tendeka ukukumana|Yambitsani msonkhano|Amutalike muswaangano|Mu simule kopano|Tendeka kukumana|Tachikisha chipompelu|Tachika nkunguluko",
  "Meeting date": "Inshiku ya kukumana|Tsiku la msonkhano|Buzuba bwamuswaangano|Lizazi la kopano|Dyubo dya kukumana|Dehi dyachipompelu|Chisuku chankunguluko",
  "Attendance": "Ukuboneka|Kupezeka|Kuboneka|Ku ba teng|Kuboneka|Kuwanika|Kuhwanika",
  "Save attendance": "Sunga ukuboneka|Sungani kupezeka|Bbadela kuboneka|Mu boloke ku ba teng|Sunga kuboneka|Sanda kuwanika|Seka kuhwanika",
  "Present": "Aliko|Alipo|Uliko|U teng|Ulipo|Ali|Alipo",
  "Absent": "Tabaliko|Palibe|Taboneki|Ha ba teng|Kechi alipo|Kakwali|Kuhana",
  "No meetings yet.": "Takwaba ukukumana.|Palibe misonkhano.|Takuli miswaangano.|Ha ku na likopano.|Kechi kukumana.|Kakuli michipompelu.|Kuhana nkunguluko.",
  "No disputes.": "Takwaba amakani.|Palibe mikangano.|Takuli mazwanga.|Ha ku na likanyiso.|Kechi makani.|Kakuli makani.|Kuhana makani.",
  // disputes, payments, sms
  "Uphold": "Ukwishibila|Vomerezani|Amuzumine|Mu tiyise|Zumina|Tondolwenu|Zumina",
  "Reject": "Ukukana|Kanani|Amukaane|Mu hanele|Kana|Kana|Kana",
  "Resolution": "Ukupwisha|Chigamulo|Cisinizyo|Qeto|Kipwisho|Chakukumisha|Mpwisho",
  "Raised": "Ifyo bapusha|Choperekedwa|Cakutumwa|Se si tisizwe|Kyatumwa|Chatumbi|Chatumwa",
  "Mobile money payments": "Ukulipila pa mobile money|Malipiro a mobile money|Kubbadela amobile money|Ku lifa ka mobile money|Kulipila na mobile money|Kuzeya na mobile money|Kufweta na mobile money",
  "Confirmation text": "Amalembo ya kushininkisha|Mawu otsimikizira|Majwi aakusinizya|Mutsebiso wa ku tiyisa|Mazwi a kusuminisha|Mazu akutondolola|Mazu akusimbwila",
  "Read receipt": "Belenga|Werengani|Amubale|Mu bale|Bala|Balenu|Bala",
  "Match to member": "Pamfya kuli umwina|Gwirizanitsani ndi membala|Amulange mumembala|Mu tokanise ni memba|Ambukanya na membala|Kwatishayi na membala|Hanyanya na membala",
  "Delivered": "Fyafikile|Zafika|Cisikide|Li fihezi|Kyafika|Chafika|Chafika",
  "Queued": "Fileshiba|Zikudikira|Zilindide|Li lutelezi|Kimwe|Chikutala|Vikulindila",
  "Failed": "Fyalepwa|Zalephera|Cilemene|Li hanyehile|Kyalema|Chalema|Chalemena",
  "Retry": "Esha kabili|Yesaninso|Amuyeeye alubo|Mu leke hape|Eshaiko kabiji|Eshenu kapwa|Eseka lyehi",
  "Print statement": "Sindika|Sindikizani|Amukatile|Mu hatise|Sindika|Sindika|Sindika",
  "Statements and exports": "Ma statement ne kutumina|Ma statement ndi kutumiza kunja|Ma statement alimwi akutuma|Li-statement ni ku romela|Ma statement ne kutuma|Ma statement nikutuma|Ma statement nakutuma",
  "Export ledger (CSV)": "Tuma ibuku (CSV)|Tumizani buku (CSV)|Amutume bbuku (CSV)|Mu romele buka (CSV)|Tuma buku (CSV)|Tuma buku (CSV)|Tuma buku (CSV)",
  // security and settings
  "Change password": "Shinta password|Sinthani password|Amucince password|Mu fetole password|Shinja password|Shinjika password|Shinjika password",
  "Set up two-factor": "Longeshapo two-factor|Konzani two-factor|Amubambe two-factor|Mu lukulule two-factor|Bika two-factor|Bika two-factor|Bika two-factor",
  "Turn on": "Tendeka|Yatsani|Amutanguni|Mu bulele|Pesha|Tachikisha|Hunga",
  "Turn off": "Pwisha|Zimitsani|Amuyime|Mu notise|Dinga|Twalekawu|Pindila",
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
  "My entries": "Ifyalembwa fyandi|Zolembedwa zanga|Zakulembwa zangu|Se ne \xF1oliwe sa ka|Bilembwa byami|Vyakulembeka yami|Vyasonekwa vyami",
  "My loans": "Inkongole yandi|Ngongole zanga|Ngongole zangu|Likoloto za ka|Mwingo wami|Mbongo yakuzeya yami|Vilanga vyami",
  "Projected share-out": "Ukwabana ukwakulolelwa|Gawo loyerekezeka|Cibeela cilangilwa|Karolo e lakazelwa|Kipande kyalolelwa|Chipandu chakulandulwa|Kaputu kakulwezeka",
  "Loan balance": "Inkongole yashala|Ngongole yotsala|Ngongole iisyedwe|Koloto e \u0161etile|Mwingo washala|Mbongo yakuzeya yasala\xF1a|Chilanga chasalako",
  "Next payment": "Ukulipila kwakonkapo|Malipiro otsatira|Kubbadela kutobelela|Ku busa ku latelezi|Kulipila kutwajilako|Kuzeya kwakukonkelaku|Kufweta kwakukonda",
  "Query": "Epusha|Funsani|Amubuzye|Mu botise|Pula|Diwulenu|Pwenu",
  "Query sent": "Ukwipusha kwatumwa|Funso latumizidwa|Mubuzyo watumwa|Potiso i tumilwe|Kupula kwatumwa|Kudiwula kwatumbi|Kupwa kwatumwa",
  "Group pool": "Ndalama sha cilimba|Ndalama za gulu|Mali acibunga|Mali a sikwata|Mali a kipwilo|Mbongo yachikumbu|Mbongo yachisaka",
  "Reversed": "Yabwekeshiwa|Zabwezedwa|Cabweezyedwe|Li busitswe|Kyabwezhewa|Chazeyeshi|Chafwetesewa",
  "No entries yet.": "Tapali ifyalembwa.|Palibe zolembedwa.|Takuli cakulembwa.|Ha ku na se si \xF1olilwe.|Kechi kilembwa.|Kakuli chakulembeka.|Kuhana chasonekwa.",
  "No loans.": "Takwaba inkongole.|Palibe ngongole.|Takuli ngongole.|Ha ku na koloto.|Kechi mwingo.|Kakuli mbongo yakuzeya.|Kuhana chilanga.",
  "Under review": "Cilolwa|Ikuunikidwa|Cilangilwa|Si talwa|Kilangwa|Chitalwa|Chitalwa",
  "Code": "",
  "Ref": ""
};
Object.assign(DICT, DICT_MORE, DICT_NEW);
var current = (() => {
  try {
    return localStorage.getItem("gs_lang") || "en";
  } catch {
    return "en";
  }
})();
var fill = (str, vars) => str.replace(/\{(\w+)\}/g, (_, k) => vars && vars[k] !== void 0 ? vars[k] : "");
var escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var templates = null;
function getTemplates() {
  if (templates) return templates;
  templates = Object.keys(DICT).filter((k) => k.includes("{")).map((key) => {
    const names = [];
    const pattern = escapeRe(key).replace(/\\\{(\w+)\\\}/g, (_, n) => {
      names.push(n);
      return "(.+?)";
    });
    return { key, names, re: new RegExp("^" + pattern + "$") };
  });
  return templates;
}
function tr(text, vars, lang = current) {
  if (typeof text !== "string" || !text) return text;
  if (lang === "en") return fill(text, vars);
  const slot = SLOT[lang];
  const pick = (key) => {
    const e = DICT[key];
    return e && slot !== void 0 ? e.split("|")[slot] : "";
  };
  const direct = pick(text);
  if (direct) return fill(direct, vars);
  if (!vars) {
    for (const tp of getTemplates()) {
      const m = tp.re.exec(text);
      if (m) {
        const v = {};
        tp.names.forEach((n, i) => {
          v[n] = m[i + 1];
        });
        const out = pick(tp.key);
        if (out) return fill(out, v);
      }
    }
  }
  return fill(text, vars);
}
var I18n = createContext({ lang: "en", setLang() {
}, t: (s, v) => fill(s, v) });
function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem("gs_lang") || "en";
    } catch {
      return "en";
    }
  });
  const setLang = useCallback((l) => {
    current = l;
    setLangState(l);
    try {
      localStorage.setItem("gs_lang", l);
    } catch {
    }
    document.documentElement.lang = l;
  }, []);
  const t = useCallback((s, vars) => tr(s, vars, lang), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return /* @__PURE__ */ React.createElement(I18n.Provider, { value }, children);
}
var useT = () => useContext(I18n).t;
var useLang = () => useContext(I18n);
function LanguageSelect({ className = "langsel" }) {
  const { lang, setLang } = useLang();
  return /* @__PURE__ */ React.createElement("select", { className, value: lang, onChange: (e) => setLang(e.target.value), "aria-label": "Language" }, LANGS.map(([c, n]) => /* @__PURE__ */ React.createElement("option", { key: c, value: c }, n)));
}
export {
  DICT,
  LANGS,
  LangProvider,
  LanguageSelect,
  tr,
  useLang,
  useT
};
