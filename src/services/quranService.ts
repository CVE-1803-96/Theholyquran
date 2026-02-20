import { Verse, removeDiacritics } from '../data/quran';

interface APIVerse {
  id: number;
  verse_key: string;
  text_uthmani: string;
  words: {
    id: number;
    position: number;
    text_uthmani: string;
    text_imlaei: string;
    translation: { text: string };
    char_type_name: string;
  }[];
}

export const fetchVersesByPage = async (pageNumber: number): Promise<Verse[]> => {
  try {
    const response = await fetch(
      `https://api.quran.com/api/v4/verses/by_page/${pageNumber}?language=en&words=true&word_fields=text_uthmani,text_imlaei,text_simple&per_page=50`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch verses');
    }

    const data = await response.json();
    const verses: APIVerse[] = data.verses;

    return verses.map(v => ({
      id: v.id,
      verse_key: v.verse_key,
      text_uthmani: v.text_uthmani,
      words: v.words
        .filter(w => w.char_type_name !== 'end') // Filter out end markers
        .map(w => ({
          id: w.id,
          text: w.text_uthmani,
          cleanText: removeDiacritics(w.text_imlaei || w.text_uthmani),
          translation: w.translation.text
        }))
    }));
  } catch (error) {
    console.error('Error fetching Quran data:', error);
    return [];
  }
};
