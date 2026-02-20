import { useState, useEffect } from 'react';
import { Surah, Verse } from '../data/quran';
import { fetchVersesByPage } from '../services/quranService';
import { verifyRecitationWithGemini } from '../services/verificationService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { Mic, MicOff, RefreshCw, CheckCircle, ChevronRight, ChevronLeft, Keyboard, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface RecitationViewProps {
  surah: Surah;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSurahChange: (surahId: number) => void;
  onProgressUpdate: (surahId: number, percent: number) => void;
}

export const RecitationView = ({ surah, currentPage, onPageChange, onSurahChange, onProgressUpdate }: RecitationViewProps) => {
  const [verses, setVerses] = useState<Verse[]>([]);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [revealedWordIndices, setRevealedWordIndices] = useState<number[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerseCompleted, setIsVerseCompleted] = useState(false);
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [typedInput, setTypedInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch verses when page changes
  useEffect(() => {
    const loadVerses = async () => {
      setIsLoading(true);
      const fetchedVerses = await fetchVersesByPage(currentPage);
      
      // Filter verses to only include those belonging to the current Surah
      // Verse key format is "surah_id:verse_number"
      const surahVerses = fetchedVerses.filter(v => {
        const [verseSurahId] = v.verse_key.split(':');
        return parseInt(verseSurahId) === surah.id;
      });

      setVerses(surahVerses);
      setCurrentVerseIndex(0);
      setRevealedWordIndices([]);
      setIsVerseCompleted(false);
      setIsLoading(false);
    };
    loadVerses();
  }, [currentPage, surah.id]);

  const currentVerse = verses[currentVerseIndex];

  const { text: transcript, isListening: hookIsListening, startListening, stopListening, resetText: resetTranscript } = useSpeechRecognition('ar-SA');

  // Sync hook state with local state
  useEffect(() => {
    if (transcript) {
      setSpokenText(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    setIsListening(hookIsListening);
  }, [hookIsListening]);

  // Verify recitation when speech stops or typing is submitted
  useEffect(() => {
    if (!currentVerse) return;

    const verify = async (input: string) => {
      if (!input.trim()) return;
      
      setIsVerifying(true);
      const result = await verifyRecitationWithGemini(currentVerse, input);
      setIsVerifying(false);

      // Check if all words are matched
      const allWordsMatched = result.matchedWordIds.length === currentVerse.words.length;

      if (allWordsMatched) {
        // Reveal all words
        setRevealedWordIndices(currentVerse.words.map((_, i) => i));
        setIsVerseCompleted(true);
        
        // Update progress (simple calculation based on verses completed in this session)
        const percent = Math.round(((currentVerseIndex + 1) / verses.length) * 100);
        onProgressUpdate(surah.id, percent);
      } else {
        // Reveal matched words
        const matchedIndices = currentVerse.words
          .map((word, index) => result.matchedWordIds.includes(word.id) ? index : -1)
          .filter(i => i !== -1);
        
        setRevealedWordIndices(prev => Array.from(new Set([...prev, ...matchedIndices])));
      }
    };

    const debounce = setTimeout(() => {
      if (inputMode === 'voice' && !isListening && spokenText) {
        verify(spokenText);
      } else if (inputMode === 'text' && typedInput) {
        verify(typedInput);
      }
    }, 1000);

    return () => clearTimeout(debounce);
  }, [spokenText, isListening, typedInput, currentVerse, inputMode, verses.length, currentVerseIndex, onProgressUpdate, surah.id]);

  const handleNextVerse = () => {
    if (currentVerseIndex < verses.length - 1) {
      setCurrentVerseIndex(prev => prev + 1);
      setRevealedWordIndices([]);
      setIsVerseCompleted(false);
      setSpokenText('');
      setTypedInput('');
      resetTranscript();
    } else {
      // End of verses for this Surah on this page
      
      // Check if Surah continues on next page
      if (currentPage < surah.pages[1]) {
        onPageChange(currentPage + 1);
      } else {
        // Surah ends here. Go to next Surah if available.
        if (surah.id < 114) {
          onSurahChange(surah.id + 1);
        } else {
          console.log("End of Quran reached");
        }
      }
    }
  };

  const handlePrevVerse = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(prev => prev - 1);
      setRevealedWordIndices([]);
      setIsVerseCompleted(false);
    } else {
      // Start of verses for this Surah on this page
      
      // Check if Surah continues from previous page
      if (currentPage > surah.pages[0]) {
        onPageChange(currentPage - 1);
      } else {
        // Start of Surah. Go to previous Surah if available.
        if (surah.id > 1) {
          onSurahChange(surah.id - 1);
        }
      }
    }
  };

  const resetSpokenText = () => {
    setSpokenText('');
    resetTranscript();
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-divine-200 border-t-divine-500 rounded-full animate-spin"></div>
          <p className="text-divine-600 font-serif text-lg animate-pulse">Loading Page {currentPage}...</p>
        </div>
      </div>
    );
  }

  if (!currentVerse) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p className="text-divine-600">No verses found for this page.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col relative">
      {/* Top Bar: Navigation & Progress */}
      <div className="p-6 flex justify-between items-center border-b border-divine-100/50 bg-white/30 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-serif text-divine-900 tracking-wide">{surah.name_simple}</h2>
          <span className="text-sm text-divine-600 font-mono bg-divine-50 px-2 py-1 rounded-md border border-divine-100">
            Page {currentPage} • Verse {currentVerseIndex + 1} / {verses.length}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevVerse}
            className="p-2 rounded-full hover:bg-divine-100 disabled:opacity-30 text-divine-800 transition-colors"
            disabled={currentPage === 1 && currentVerseIndex === 0}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={handleNextVerse}
            className="p-2 rounded-full hover:bg-divine-100 disabled:opacity-30 text-divine-800 transition-colors"
            disabled={currentPage === 604 && currentVerseIndex === verses.length - 1}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Recitation Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 overflow-y-auto min-h-[400px]">
        <div className="max-w-4xl w-full text-center" dir="rtl">
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-8 leading-loose">
            {currentVerse.words.map((word, index) => {
              const isRevealed = revealedWordIndices.includes(index);
              const isNext = !isRevealed && (index === 0 || revealedWordIndices.includes(index - 1));

              return (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0.5, filter: 'blur(10px)' }}
                  animate={{ 
                    opacity: isRevealed ? 1 : 0.15, 
                    filter: isRevealed ? 'blur(0px)' : 'blur(4px)',
                    scale: isRevealed ? 1 : 0.95,
                    y: isRevealed ? 0 : 10
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`relative px-3 py-2 rounded-xl transition-all duration-500 ${
                    isNext ? 'bg-heaven-100/50 ring-1 ring-divine-200/50 shadow-[0_0_15px_rgba(255,215,100,0.3)]' : ''
                  }`}
                >
                  <span className="font-serif text-5xl md:text-7xl text-divine-900 block mb-3 font-medium drop-shadow-sm">
                    {word.text}
                  </span>
                  {isRevealed && (
                    <motion.span 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-base text-divine-500 font-sans block font-light tracking-wide"
                    >
                      {word.translation}
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Verification Status Indicator */}
        <div className="h-10 mt-12 flex items-center justify-center">
          {isVerifying && !isVerseCompleted && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-divine-700 bg-heaven-50/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium border border-divine-200 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-divine-500 animate-pulse" />
              <span>Listening & Verifying...</span>
            </motion.div>
          )}
        </div>

        {isVerseCompleted && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8 flex flex-col items-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center text-emerald-600 mb-6 shadow-lg shadow-emerald-100/50 border border-emerald-200">
              <CheckCircle className="w-10 h-10" />
            </div>
            <p className="text-emerald-800 font-serif text-2xl mb-6">Verse Completed</p>
            <button 
              onClick={handleNextVerse}
              className="px-8 py-3 bg-gradient-to-r from-divine-500 to-divine-600 hover:from-divine-600 hover:to-divine-700 text-white rounded-full font-medium transition-all shadow-lg shadow-divine-500/30 hover:shadow-xl hover:scale-105 tracking-wide uppercase text-sm"
            >
              Next Verse
            </button>
          </motion.div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-6 bg-white/40 backdrop-blur-xl border-t border-divine-100/50">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          
          {/* Mode Toggle */}
          <div className="flex justify-center gap-2 mb-2 bg-white/40 p-1 rounded-full w-fit mx-auto border border-divine-100/50">
            <button 
              onClick={() => { setInputMode('voice'); stopListening(); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
                inputMode === 'voice' 
                  ? 'bg-divine-100 text-divine-900 shadow-sm' 
                  : 'text-divine-600 hover:bg-divine-50'
              }`}
            >
              <Mic className="w-4 h-4" /> Voice
            </button>
            <button 
              onClick={() => { setInputMode('text'); stopListening(); }}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all ${
                inputMode === 'text' 
                  ? 'bg-divine-100 text-divine-900 shadow-sm' 
                  : 'text-divine-600 hover:bg-divine-50'
              }`}
            >
              <Keyboard className="w-4 h-4" /> Typing
            </button>
          </div>

          {/* Input Area */}
          <div className="relative">
            {inputMode === 'voice' && (
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => {
                      setRevealedWordIndices([]);
                      resetSpokenText();
                      stopListening();
                    }}
                    className="p-4 rounded-full bg-white/60 text-divine-600 hover:bg-white hover:text-divine-800 transition-all shadow-sm border border-divine-100"
                    title="Restart Verse"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>

                  <button
                    onClick={isListening ? stopListening : startListening}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 shadow-xl border-4 border-white/50 ${
                      isListening 
                        ? 'bg-red-500 text-white shadow-red-500/30 animate-pulse scale-105' 
                        : 'bg-gradient-to-br from-divine-400 to-divine-600 text-white shadow-divine-500/40 hover:scale-110'
                    }`}
                  >
                    {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                  </button>

                  <button
                    onClick={() => {
                      // Hint: Reveal next word
                      const nextIndex = revealedWordIndices.length;
                      if (nextIndex < currentVerse.words.length) {
                        setRevealedWordIndices(prev => [...prev, nextIndex]);
                      }
                    }}
                    className="p-4 rounded-full bg-white/60 text-divine-600 hover:bg-white hover:text-divine-800 transition-all shadow-sm border border-divine-100"
                    title="Hint (Reveal Next Word)"
                  >
                    <span className="font-serif font-bold text-xl">?</span>
                  </button>
                </div>
                
                <div className="h-8 flex items-center justify-center">
                  {isListening ? (
                    <p className="text-sm text-divine-600 animate-pulse font-medium">Listening to your recitation...</p>
                  ) : (
                    <p className="text-sm text-divine-400">Tap microphone to begin</p>
                  )}
                </div>
                
                {spokenText && (
                  <div className="text-xs text-divine-400/80 max-w-md text-center truncate px-4 py-2 bg-white/30 rounded-lg border border-divine-50">
                    Detected: "{spokenText}"
                  </div>
                )}
              </div>
            )}

            {inputMode === 'text' && (
              <div className="flex gap-2 max-w-xl mx-auto w-full">
                <input
                  type="text"
                  dir="rtl"
                  value={typedInput}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder="Type the verse here..."
                  className="flex-1 px-6 py-4 rounded-2xl border border-divine-200 focus:outline-none focus:ring-2 focus:ring-divine-400/50 bg-white/60 backdrop-blur-sm font-serif text-xl placeholder:text-divine-300 text-divine-900 shadow-inner"
                  autoFocus
                />
                <button 
                  onClick={() => setTypedInput('')}
                  className="p-4 rounded-2xl bg-white/60 text-divine-500 hover:bg-white hover:text-divine-700 border border-divine-200 transition-colors"
                >
                  <RefreshCw className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
