import React from 'react';
import { 
  Map, 
  Cpu, 
  Users, 
  Award, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Activity, 
  Trophy, 
  Zap,
  Globe,
  Star,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Layers,
  Wrench,
  Sun,
  Moon
} from 'lucide-react';
import { motion } from 'motion/react';
import { Language, translate, getCategoryKey } from '../translations.js';
import { Citizen, DashboardStats } from '../types.js';
import logo from '../assets/images/regenerated_image_1782543012047.png';

// Local Landing Page Translations
const landingTranslations: Record<Language, Record<string, string>> = {
  en: {
    hero_title: "Empowering Communities through GIS-enabled Civic Intelligence",
    hero_desc: "FactTrace unites vigilant citizens and municipal departments. Report infrastructure failures, verify evidence with spatial duplicate prevention, and unlock automated municipal work order dispatches.",
    enter_cta: "Launch GIS Console",
    report_issue_cta: "Report an issue",
    learn_more: "Learn How It Works",
    feature_gis_title: "Precision GIS Mapping",
    feature_gis_desc: "Pinpoint safety issues, water hazards, or potholes directly on a live Leaflet spatial map. Integrated reverse-geocoding displays physical street names instantly.",
    feature_ai_title: "AI Analysis & Image Scanner",
    feature_ai_desc: "Gemini models instantly scan uploaded or captured evidence images to generate accurate descriptions, auto-categorize issues, and guard against duplicate coordinates within a strict 15-meter zone.",
    feature_consensus_title: "Community Verification",
    feature_consensus_desc: "Decentralized consensus keeps reports high-fidelity. Citizens verify or flag reports, triggering automated municipal handover work orders.",
    feature_rewards_title: "Gamified Citizen Impact",
    feature_rewards_desc: "Earn Points for every valid civic report or audit action. Scale through tiered status levels from Recruit to Silver and Gold Sentinel.",
    system_vitality: "Real-Time System Vitality",
    vitality_subtitle: "Aggregated live telemetry from our active PostgreSQL database engine.",
    how_it_works: "The FactTrace Lifecycle",
    step_1_title: "1. Log Evidence",
    step_1_desc: "Take an active camera snapshot or record video on-site. The GIS coordinates populate instantly.",
    step_2_title: "2. AI Synthesis",
    step_2_desc: "The server-side intelligence checks for duplicates, drafts a concise work order summary, and classifies the category.",
    step_3_title: "3. Decentralized Audit",
    step_3_desc: "Nearby neighbors verify or flag reports. Verifications push the progress bar closer to dispatch thresholds.",
    step_4_title: "4. Direct Municipal Ingress",
    step_4_desc: "Autonomous dispatch drafts are compiled to target department desks (e.g. Sanitation, Water Utility) with ready-to-send work order formats.",
    top_guardians: "Honorable Civic Guardians",
    guardians_subtitle: "Vigilant neighborhood sentinels actively reporting and validating infrastructure tasks.",
    footer_tag: "FactTrace GIS Civic Intelligence Network"
  },
  gu: {
    hero_title: "જીઆઇએસ-સક્ષમ સિવિક ઇન્ટેલિજન્સ દ્વારા સમુદાયોનું સશક્તિકરણ",
    hero_desc: "ફેક્ટટ્રેસ સતર્ક નાગરિકો અને મ્યુનિસિપલ વિભાગોને એક કરે છે. માળખાકીય નિષ્ફળતાઓની જાણ કરો, અવકાશી નકલ અટકાવવા સાથે પુરાવાઓની ચકાસણી કરો અને સ્વચાલિત મ્યુનિસિપલ વર્ક ઓર્ડર સિંક કરો.",
    enter_cta: "જીઆઇએસ કન્સોલ શરૂ કરો",
    report_issue_cta: "સમસ્યાની જાણ કરો",
    learn_more: "તે કેવી રીતે કાર્ય કરે છે તે જાણો",
    feature_gis_title: "ચોક્કસ જીઆઇએસ મેપિંગ",
    feature_gis_desc: "લાઇવ લીફલેટ અવકાશી નકશા પર સીધા સુરક્ષા પ્રશ્નો, પાણીના જોખમો અથવા ખાડાઓ શોધો. સંકલિત રિવર્સ-જીઓકોડિંગ ભૌતિક શેરી નામો તરત દર્શાવે છે.",
    feature_ai_title: "એઆઈ વિશ્લેષણ અને છબી સ્કેનર",
    feature_ai_desc: "જેમિની મોડલ્સ સચોટ વર્ણનો ઉત્પન્ન કરવા, સમસ્યાઓનું આપમેળે વર્ગીકરણ કરવા અને ડુપ્લિકેટ અટકાવવા માટે અપલોડ કરેલી અથવા કેપ્ચર કરેલી છબીઓને તરત જ સ્કેન કરે છે.",
    feature_consensus_title: "સામુદાયિક ચકાસણી",
    feature_consensus_desc: "વિકેન્દ્રિત સર્વસંમતિ અહેવાલોને વિશ્વસનીય રાખે છે. નાગરિકો અહેવાલોની ચકાસણી કરે છે અથવા ફ્લેગ કરે છે.",
    feature_rewards_title: "ગેમિફાઇડ સિટિઝન ઇમ્પેક્ટ",
    feature_rewards_desc: "દરેક માન્ય અહેવાલ અથવા ઓડિટ ક્રિયા માટે પોઇન્ટ મેળવો. રિક્રુટથી સિલ્વર અને ગોલ્ડ સેન્ટિનલ સ્તરો પર જાઓ.",
    system_vitality: "રીઅલ-ટાઇમ સિસ્ટમ મહત્વપૂર્ણ આંકડા",
    vitality_subtitle: "અમારા સક્રિય પોસ્ટગ્રેએસક્યુએલ ડેટાબેઝ એન્જિનમાંથી એકત્રિત લાઇવ ટેલિમેટ્રી.",
    how_it_works: "ફેક્ટટ્રેસ જીવનચક્ર",
    step_1_title: "૧. પુરાવા નોંધો",
    step_1_desc: "સ્થળ પર જ સક્રિય કેમેરા સ્નેપશોટ લો અથવા વિડિયો રેકોર્ડ કરો. જીપીએસ કોઓર્ડિનેટ્સ તરત જ ભરાઈ જાય છે.",
    step_2_title: "૨. એઆઈ સંશ્લેષણ",
    step_2_desc: "સર્વર-સાઇડ ઇન્ટેલિજન્સ નકલો તપાસે છે, સંક્ષિપ્ત વર્ક ઓર્ડર સારાંશ તૈયાર કરે છે અને શ્રેણીનું વર્ગીકરણ કરે છે.",
    step_3_title: "૩. વિકેન્દ્રિત ઓડિટ",
    step_3_desc: "નજીકના પડોશીઓ અહેવાલો ચકાસે છે અથવા ફ્લેગ કરે છે. ચકાસણીઓ પ્રગતિ દર્શાવે છે.",
    step_4_title: "૪. મ્યુનિસિપલ ઇન્ગ્રેસ",
    step_4_desc: "સ્વાયત્ત ડિસ્પેચ ડ્રાફ્ટ લક્ષ્ય વિભાગના ડેસ્ક પર મોકલવા માટે તૈયાર થાય છે.",
    top_guardians: "સન્માનનીય નાગરિક રક્ષકો",
    guardians_subtitle: "સતર્ક પડોશી સેન્ટિનલ્સ જેઓ સક્રિયપણે અહેવાલ અને માળખાગત કાર્યોને માન્ય કરી રહ્યા છે.",
    footer_tag: "ફેક્ટટ્રેસ જીઆઇએસ સિવિક ઇન્ટેલિજન્સ નેટવર્ક"
  },
  hi: {
    hero_title: "जीआईएस-सक्षम नागरिक इंटेलिजेंस द्वारा समुदायों का सशक्तीकरण",
    hero_desc: "फैक्टट्रेस सतर्क नागरिकों और नगरपालिका विभागों को जोड़ता है। बुनियादी ढांचे की विफलताओं की रिपोर्ट करें, स्थानिक डुप्लिकेशन रोकथाम के साथ साक्ष्यों को सत्यापित करें, और स्वचालित कार्य आदेश सिंक करें।",
    enter_cta: "जीआईएस कंसोल लॉन्च करें",
    report_issue_cta: "समस्या की रिपोर्ट करें",
    learn_more: "जाने कैसे काम करता है",
    feature_gis_title: "सटीक जीआईएस मैपिंग",
    feature_gis_desc: "लाइव लीफलेट स्थानिक मानचित्र पर सीधे सुरक्षा चिंताओं, पानी के खतरों या गड्ढों का पता लगाएं। एकीकृत रिवर्स-जियोकोडिंग भौतिक सड़कों के नाम दिखाता है।",
    feature_ai_title: "एआई विश्लेषण और छवि स्कैनर",
    feature_ai_desc: "जेमिनी मॉडल सटीक विवरण उत्पन्न करने, समस्याओं को स्वचालित रूप से वर्गीकृत करने और डुप्लिकेट निर्देशांक को रोकने के लिए अपलोड या कैप्चर की गई छवियों को तुरंत स्कैन करते हैं।",
    feature_consensus_title: "सामुदायिक सत्यापन",
    feature_consensus_desc: "विकेंद्रीकृत आम सहमति रिपोर्टों को विश्वसनीय रखती है। नागरिक रिपोर्टों को सत्यापित करते हैं या संदिग्ध के रूप में चिह्नित करते हैं।",
    feature_rewards_title: "गेमीफाइड नागरिक प्रभाव",
    feature_rewards_desc: "प्रत्येक वैध नागरिक रिपोर्ट या ऑडिट कार्रवाई के लिए अंक अर्जित करें। रिक्रूट से सिल्वर और गोल्ड सेंटिनल स्तर तक बढ़ें।",
    system_vitality: "वास्तविक समय प्रणाली महत्वपूर्ण आंकड़े",
    vitality_subtitle: "हमारे सक्रिय PostgreSQL डेटाबेस इंजन से एकत्रित लाइव टेलीमेट्री।",
    how_it_works: "फैक्टट्रेस जीवनचक्र",
    step_1_title: "1. साक्ष्य दर्ज करें",
    step_1_desc: "मौके पर ही कैमरा स्नैपशॉट लें या वीडियो रिकॉर्ड करें। जीआईएस निर्देशांक तुरंत दर्ज हो जाते हैं।",
    step_2_title: "2. एआई संश्लेषण",
    step_2_desc: "सर्वर-साइड इंटेलिजेंस डुप्लीकेट की जांच करता है, एक संक्षिप्त कार्य आदेश सारांश तैयार करता है और श्रेणी वर्गीकृत करता है",
    step_3_title: "3. विकेंद्रीकृत ऑडिट",
    step_3_desc: "आस-पास के पड़ोसी रिपोर्ट सत्यापित करते हैं या ध्वजांकित करते हैं। सत्यापन प्रगति को प्रेषण सीमा के करीब धकेलता है।",
    step_4_title: "4. प्रत्यक्ष नगर निगम प्रविष्टि",
    step_4_desc: "सक्रिय कार्य आदेशों के प्रत्यक्ष प्रारूपों को लक्ष्य विभाग के डेस्क पर भेजने के लिए संकलित किया जाता है।",
    top_guardians: "माननीय नागरिक रक्षक",
    guardians_subtitle: "सजग पड़ोसी प्रहरी जो बुनियादी ढांचे के कार्यों की रिपोर्टिंग और सत्यापन में सक्रिय हैं।",
    footer_tag: "फैक्टट्रेस जीआईएस नागरिक इंटेलिजेंस नेटवर्क"
  }
};

interface LandingPageProps {
  lang: Language;
  stats: DashboardStats | null;
  leaderboard: Citizen[];
  onEnterPlatform: () => void;
  isDarkMode: boolean;
  onChangeLanguage: (newLang: Language) => void;
  onToggleDarkMode: () => void;
}

export default function LandingPage({ 
  lang, 
  stats, 
  leaderboard, 
  onEnterPlatform, 
  isDarkMode,
  onChangeLanguage,
  onToggleDarkMode
}: LandingPageProps) {
  const getLText = (key: string) => {
    return landingTranslations[lang]?.[key] || landingTranslations.en[key] || key;
  };

  const getBadgeDetails = (points: number) => {
    if (points >= 300) return { name: 'Gold Citizen', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50' };
    if (points >= 150) return { name: 'Silver Citizen', color: 'bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    if (points >= 50) return { name: 'Bronze Citizen', color: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-900/50' };
    return { name: 'Citizen Recruit', color: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/50' };
  };

  return (
    <div id="landing_page_container" className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 font-sans overflow-x-hidden flex flex-col transition-colors duration-200">
      
      {/* Decorative Top-Right Mesh Grid */}
      <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Landing Header */}
      <header id="landing_header" className="max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 relative z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 p-1 bg-blue-600/10 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <img
              src={logo}
              alt="FactTrace"
              className="w-10 h-10 rounded-lg shadow-md object-cover select-none"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
              FactTrace
            </h1>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono tracking-widest uppercase mt-0.5">
              {translate('subtitle', lang)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Header empty right-hand side as requested */}
        </div>
      </header>

      {/* Main Hero & Content Section */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 md:py-20 flex flex-col gap-20 relative z-10">
        
        {/* HERO SECTION */}
        <section id="landing_hero" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold font-mono">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>DECENRTRALIZED COMMUNITY CONSENSUS ENGINE</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-[1.12] text-slate-900 dark:text-white">
              {getLText('hero_title')}
            </h2>

            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-normal max-w-xl">
              {getLText('hero_desc')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEnterPlatform}
                className="px-7 py-4 font-black tracking-wider uppercase rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-3 border border-blue-500/30"
              >
                <span>{getLText('report_issue_cta')}</span>
                <ArrowRight className="h-5 w-5 stroke-[2.5]" />
              </motion.button>

              <a
                href="#how-it-works-section"
                className="px-7 py-4 text-sm font-bold tracking-wide rounded-2xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition duration-150 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{getLText('learn_more')}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Visual Platform Device Illustration */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Ambient Background Blur Elements */}
            <div className="absolute w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute w-56 h-56 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative w-full max-w-sm rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-5 shadow-2xl backdrop-blur-md"
            >
              {/* Header inside device */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[10px] uppercase tracking-widest font-mono font-black text-slate-500 dark:text-slate-400">
                    Live telemetry link
                  </span>
                </div>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                </div>
              </div>

              {/* simulated report feed mockup */}
              <div className="space-y-3.5">
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100/50 dark:border-blue-900/30 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded uppercase">
                      Street Infrastructure
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono font-medium">FT-4912</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                    Critical Pothole & Road Split
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    Severe fissure across bicycle corridor blocking local transit lanes.
                  </p>
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200/30 dark:border-slate-800/40 text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3 text-blue-500" /> 14 Verifications</span>
                    <span className="flex items-center gap-1"><Award className="h-3 w-3 text-amber-500" /> Dispatch ready</span>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/10 rounded-xl border border-amber-100/50 dark:border-amber-900/20 text-left opacity-80">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded uppercase">
                      Water Utility
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">FT-4908</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">
                    Main water valve leakage
                  </h4>
                  <div className="flex items-center gap-3 mt-2 text-[9px] font-mono font-bold text-slate-500">
                    <span className="flex items-center gap-1 text-amber-600"><Activity className="h-3 w-3 text-amber-500 animate-pulse" /> processing telemetry</span>
                  </div>
                </div>
              </div>

              {/* Bottom launch invite */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-left">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-mono block">Autonomous Handover</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">Draft Work Orders Live</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={onEnterPlatform}
                  className="p-2 bg-blue-600 text-white rounded-lg shadow cursor-pointer"
                >
                  <ArrowRight className="h-4.5 w-4.5" />
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SYSTEM VITALITY STATS DECK */}
        <section id="system-vitality-section" className="space-y-6 text-center">
          <div className="max-w-2xl mx-auto space-y-2">
            <h3 className="text-xs font-black font-mono tracking-widest text-blue-600 dark:text-blue-400 uppercase">
              {getLText('system_vitality')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {getLText('vitality_subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div
              whileHover={{ y: -4 }}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center"
            >
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                {translate('total_reports', lang)}
              </div>
              <div className="text-3xl font-mono font-extrabold text-blue-600 dark:text-blue-400 mt-2">
                {stats ? stats.total_reports : "—"}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Filer contributions</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center"
            >
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                {translate('open_reports', lang)}
              </div>
              <div className="text-3xl font-mono font-extrabold text-amber-500 mt-2">
                {stats ? stats.open_reports : "—"}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Pending verification</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center"
            >
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                {translate('resolved', lang)}
              </div>
              <div className="text-3xl font-mono font-extrabold text-emerald-500 mt-2">
                {stats ? stats.resolved_reports : "—"}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Community solved</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center col-span-2 md:col-span-1"
            >
              <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                {translate('top_category', lang)}
              </div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-200 truncate mt-3 font-mono">
                {stats ? translate(getCategoryKey(stats.top_category), lang) : "—"}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 font-mono">Primary hotspot</p>
            </motion.div>
          </div>
        </section>

        {/* FOUR PILLARS BENTO GRID */}
        <section id="pillars-section" className="space-y-8">
          <div className="text-left space-y-2">
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">
              Core platform mechanics
            </span>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Deconstructed System Architecture
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-4">
              <div className="p-3 bg-blue-100/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl w-fit">
                <Map className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {getLText('feature_gis_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {getLText('feature_gis_desc')}
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-4">
              <div className="p-3 bg-purple-100/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 text-purple-600 dark:text-purple-400 rounded-xl w-fit">
                <Cpu className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {getLText('feature_ai_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {getLText('feature_ai_desc')}
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-4">
              <div className="p-3 bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl w-fit">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {getLText('feature_consensus_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {getLText('feature_consensus_desc')}
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-4">
              <div className="p-3 bg-amber-100/60 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 rounded-xl w-fit">
                <Award className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {getLText('feature_rewards_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {getLText('feature_rewards_desc')}
              </p>
            </div>
          </div>
        </section>

        {/* SYSTEM LIFECYCLE CHRONOLOGY (HOW IT WORKS) */}
        <section id="how-it-works-section" className="space-y-10 scroll-mt-20">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
              End-to-end operation
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
              {getLText('how_it_works')}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Connecting visual line for desktop */}
            <div className="hidden md:block absolute top-12 left-1/8 right-1/8 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />

            <div className="p-5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-mono font-black flex items-center justify-center shadow-md">
                1
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2">
                {getLText('step_1_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {getLText('step_1_desc')}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-mono font-black flex items-center justify-center shadow-md">
                2
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2">
                {getLText('step_2_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {getLText('step_2_desc')}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-mono font-black flex items-center justify-center shadow-md">
                3
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2">
                {getLText('step_3_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {getLText('step_3_desc')}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-mono font-black flex items-center justify-center shadow-md">
                4
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 mt-2">
                {getLText('step_4_title')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {getLText('step_4_desc')}
              </p>
            </div>
          </div>
        </section>

        {/* LEADERBOARD PREVIEW / BADGES SPOTLIGHT */}
        {leaderboard.length > 0 && (
          <section id="leaderboard-preview-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/40 p-6 md:p-10 rounded-3xl">
            <div className="lg:col-span-5 text-left space-y-4">
              <div className="p-2 bg-amber-100/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 rounded-xl w-fit">
                <Trophy className="h-5 w-5" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {getLText('top_guardians')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {getLText('guardians_subtitle')}
              </p>
              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onEnterPlatform}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <span>View Full Live Leaderboard</span>
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            <div className="lg:col-span-7 w-full">
              <div className="space-y-2 max-w-md mx-auto">
                {leaderboard.slice(0, 3).map((item, index) => {
                  const badge = getBadgeDetails(item.points);
                  return (
                    <div
                      key={item.id || index}
                      className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 font-mono font-black text-xs flex items-center justify-center rounded-full ${
                          index === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' :
                          index === 1 ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' :
                          'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                            {item.nickname}
                          </span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase mt-0.5 ${badge.color}`}>
                            {badge.name}
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded">
                        {item.points} PTS
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* bottom Call To Action Card */}
        <section id="cta-card-section">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 p-8 md:p-14 text-center text-white border border-blue-500/30 shadow-2xl">
            {/* Visual Mesh overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)]" />
            
            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <h3 className="text-2xl md:text-4xl font-black tracking-tight">
                Secure. Audit. Solve.
              </h3>
              <p className="text-xs md:text-sm text-blue-100 leading-relaxed max-w-lg mx-auto">
                Join thousands of neighborhood guardians auditing infrastructure failures, water blockages, and traffic hazards in real-time. Together, we trace facts and expedite municipal responses.
              </p>
              
              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onEnterPlatform}
                  className="px-8 py-4 font-black tracking-widest uppercase rounded-2xl bg-white text-blue-700 hover:bg-slate-50 shadow-xl cursor-pointer inline-flex items-center gap-3 border border-slate-100"
                >
                  <span>Launch GIS Console</span>
                  <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                </motion.button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Landing Footer */}
      <footer id="landing_footer" className="mt-auto py-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-100/50 dark:bg-slate-900/10 text-center relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-widest uppercase">
            {getLText('footer_tag')} — {new Date().getFullYear()}
          </p>
          <div className="flex gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest">
            <span>Leaflet GIS</span>
            <span>•</span>
            <span>Gemini AI</span>
            <span>•</span>
            <span>Drizzle PostgreSQL</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
