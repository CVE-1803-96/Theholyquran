import { Surah } from '../data/quran';
import { motion } from 'motion/react';
import { BookOpen, CheckCircle } from 'lucide-react';

interface SurahSidebarProps {
  surahs: Surah[];
  selectedSurah: Surah | null;
  onSelect: (surah: Surah) => void;
  progress: Record<number, number>; // surahId -> percentage
}

export const SurahSidebar = ({ surahs, selectedSurah, onSelect, progress }: SurahSidebarProps) => {
  return (
    <div className="w-80 h-full overflow-y-auto border-r border-divine-100/50 bg-white/40 backdrop-blur-md p-4 pb-24 custom-scrollbar">
      <div className="mb-8 pt-4">
        <h1 className="text-3xl font-serif text-divine-800 mb-1 flex items-center gap-2 tracking-wide">
          <BookOpen className="w-6 h-6 text-divine-600" />
          <span>Noor Quran</span>
        </h1>
        <p className="text-sm text-divine-600/80 font-light tracking-wider uppercase pl-1">Recite · Memorize · Ascend</p>
      </div>

      <div className="space-y-3">
        {surahs.map((surah) => {
          const percent = progress[surah.id] || 0;
          const isSelected = selectedSurah?.id === surah.id;

          return (
            <motion.button
              key={surah.id}
              onClick={() => onSelect(surah)}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 border group ${
                isSelected 
                  ? 'bg-white/80 border-divine-200 shadow-lg shadow-divine-100/40' 
                  : 'bg-white/20 border-transparent hover:bg-white/60 hover:border-divine-100'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono ${
                      isSelected ? 'bg-divine-100 text-divine-800' : 'bg-white/50 text-divine-500'
                    }`}>
                      {String(surah.id).padStart(2, '0')}
                    </span>
                    <h3 className={`font-serif text-lg ${isSelected ? 'text-divine-900' : 'text-divine-700 group-hover:text-divine-900'}`}>
                      {surah.name_simple}
                    </h3>
                  </div>
                  <p className="text-xs text-divine-400 mt-1 pl-1">{surah.verses_count} Verses</p>
                </div>
                <span className="font-serif text-2xl text-divine-800/60 group-hover:text-divine-800/90 transition-colors">{surah.name_arabic}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-divine-100/50 rounded-full overflow-hidden mt-3">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  className={`h-full rounded-full ${percent === 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-divine-300 to-divine-500'}`}
                />
              </div>
              {percent === 100 && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-emerald-600 font-medium uppercase tracking-wider">
                  <CheckCircle className="w-3 h-3" /> Completed
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
