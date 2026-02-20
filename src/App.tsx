/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { HeavenlyBackground } from './components/HeavenlyBackground';
import { SurahSidebar } from './components/SurahSidebar';
import { RecitationView } from './components/RecitationView';
import { ALL_SURAHS, Surah } from './data/quran';

export default function App() {
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('noor-quran-progress');
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load progress', e);
      }
    }
  }, []);

  // Handle responsive sidebar
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync selectedSurah with currentPage
  useEffect(() => {
    if (!currentPage) return;
    
    // Only update if the current Surah is NOT on the current page
    if (selectedSurah && currentPage >= selectedSurah.pages[0] && currentPage <= selectedSurah.pages[1]) {
      return;
    }

    const correctSurah = ALL_SURAHS.find(s => currentPage >= s.pages[0] && currentPage <= s.pages[1]);
    if (correctSurah && correctSurah.id !== selectedSurah?.id) {
      setSelectedSurah(correctSurah);
    }
  }, [currentPage, selectedSurah]);

  const handleProgressUpdate = useCallback((surahId: number, percent: number) => {
    setProgress(prev => {
      const newProgress = { ...prev, [surahId]: Math.max(prev[surahId] || 0, percent) };
      localStorage.setItem('noor-quran-progress', JSON.stringify(newProgress));
      return newProgress;
    });
  }, []);

  const handleSurahSelect = useCallback((surah: Surah) => {
    setSelectedSurah(surah);
    setCurrentPage(surah.pages[0]); // Start at the first page of the Surah
    if (isMobile) setIsSidebarOpen(false);
  }, [isMobile]);

  const handleSurahChange = useCallback((surahId: number) => {
    const nextSurah = ALL_SURAHS.find(s => s.id === surahId);
    if (nextSurah) {
      handleSurahSelect(nextSurah);
    }
  }, [handleSurahSelect]);

  return (
    <HeavenlyBackground>
      <div className="flex h-[100dvh] overflow-hidden">
        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden absolute top-4 left-4 z-50 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-divine-900"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {(isSidebarOpen || !isMobile) && (
            <motion.div
              initial={isMobile ? { x: "-100%", opacity: 0 } : { x: 0, opacity: 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={isMobile ? { x: "-100%", opacity: 0 } : undefined}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`fixed md:relative z-40 h-full ${isMobile ? 'shadow-2xl' : ''}`}
            >
              <SurahSidebar 
                surahs={ALL_SURAHS} 
                selectedSurah={selectedSurah} 
                onSelect={handleSurahSelect}
                progress={progress}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 relative w-full h-full overflow-hidden">
          {selectedSurah && currentPage ? (
            <RecitationView 
              surah={selectedSurah}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onSurahChange={handleSurahChange}
              onProgressUpdate={handleProgressUpdate} 
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="max-w-md"
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-heaven-100 to-divine-100 flex items-center justify-center shadow-xl shadow-divine-100/50 animate-float">
                  <div className="w-16 h-16 text-divine-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-4xl font-serif text-divine-900 mb-4">Welcome to Noor Quran</h1>
                <p className="text-divine-600/80 text-lg leading-relaxed">
                  Select a Surah from the sidebar to begin your recitation journey. 
                  May your heart find peace in the words of Allah.
                </p>
              </motion.div>
            </div>
          )}
        </main>
      </div>
    </HeavenlyBackground>
  );
}

