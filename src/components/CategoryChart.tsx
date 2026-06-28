import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Issue } from '../types.js';
import { Language, translate } from '../translations.js';
import { PieChart as PieIcon, BarChart3, Info } from 'lucide-react';

interface CategoryChartProps {
  issues: Issue[];
  lang: Language;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Street Infrastructure': '#3b82f6', // blue-500
  'Sanitation': '#10b981', // emerald-500
  'Road Obstruction': '#f59e0b', // amber-500
  'Water Utility': '#06b6d4', // cyan-500
  'Electrical Infrastructure': '#8b5cf6', // purple-500
  'Parks & Recreation': '#22c55e', // green-500
  'Public General': '#64748b', // slate-500
};

const DEFAULT_COLOR = '#94a3b8'; // slate-400

const localTranslations: Record<Language, {
  section_title: string;
  no_data: string;
  total_count: string;
  percentage_label: string;
}> = {
  en: {
    section_title: "Category Distribution",
    no_data: "No reported issues available for analysis. Start by submitting a new report!",
    total_count: "Total Reports Analyzed",
    percentage_label: "Percentage"
  },
  gu: {
    section_title: "શ્રેણી વિતરણ",
    no_data: "વિશ્લેષણ માટે કોઈ અહેવાલો ઉપલબ્ધ નથી. નવો અહેવાલ સબમિટ કરીને પ્રારંભ કરો!",
    total_count: "કુલ અહેવાલોનું વિશ્લેષણ",
    percentage_label: "ટકાવારી"
  },
  hi: {
    section_title: "श्रेणी वितरण",
    no_data: "विश्लेषण के लिए कोई रिपोर्ट उपलब्ध नहीं है। एक नई रिपोर्ट सबमिट करके शुरुआत करें!",
    total_count: "कुल रिपोर्टों का विश्लेषण",
    percentage_label: "प्रतिशत"
  }
};

export default function CategoryChart({ issues, lang }: CategoryChartProps) {
  const t = localTranslations[lang] || localTranslations.en;

  // Filter out any invalid or duplicate issues if appropriate, or just map all
  const validIssues = issues.filter(issue => issue.status !== 'duplicate');

  // Aggregate issue counts by category
  const categoryCounts = validIssues.reduce((acc, issue) => {
    const cat = issue.category || 'Public General';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalReports = validIssues.length;

  // Map to recharts data format
  const chartData = Object.entries(categoryCounts).map(([catKey, count]) => {
    const percentage = totalReports > 0 ? ((count / totalReports) * 100).toFixed(1) : '0';
    return {
      name: translate(catKey, lang),
      rawCategory: catKey,
      value: count,
      percentage: `${percentage}%`
    };
  }).sort((a, b) => b.value - a.value); // Sort descending

  if (totalReports === 0) {
    return (
      <div className="mt-6 p-5 border border-slate-150 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl text-center">
        <Info className="h-6 w-6 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t.no_data}
        </p>
      </div>
    );
  }

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const color = CATEGORY_COLORS[data.rawCategory] || DEFAULT_COLOR;
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-lg text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-bold text-slate-800 dark:text-slate-100">{data.name}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            {translate('total_reports', lang)}: <span className="font-bold text-slate-900 dark:text-white">{data.value}</span>
          </p>
          <p className="text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
            {t.percentage_label}: {data.percentage}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieIcon className="h-4 w-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {t.section_title}
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          {totalReports} {lang === 'en' ? 'Reports' : lang === 'gu' ? 'અહેવાલો' : 'रिपोर्ट्स'}
        </span>
      </div>

      {/* Chart Section */}
      <div className="h-[200px] w-full flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CATEGORY_COLORS[entry.rawCategory] || DEFAULT_COLOR} 
                  className="hover:opacity-85 transition-opacity cursor-pointer duration-200"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text inside Donut Pie */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
            {totalReports}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
            {lang === 'en' ? 'Active' : lang === 'gu' ? 'સક્રિય' : 'सक्रिय'}
          </span>
        </div>
      </div>

      {/* Category Labels and Legend Grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
        {chartData.map((entry, idx) => {
          const color = CATEGORY_COLORS[entry.rawCategory] || DEFAULT_COLOR;
          return (
            <div 
              key={idx} 
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span 
                  className="h-2 w-2 rounded-full shrink-0" 
                  style={{ backgroundColor: color }} 
                />
                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate">
                  {entry.name}
                </span>
              </div>
              <div className="text-right shrink-0 pl-2">
                <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                  {entry.value}
                </span>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 ml-1.5">
                  ({entry.percentage})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
