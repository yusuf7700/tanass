// Vaqtinchalik namuna ma'lumotlar.
// Firebase ulanganda bu fayl o'rniga Firestore'dan o'qiladi (bir xil shaklda).
const SAMPLE_TEXTS = [
  {
    id: 'demo-1',
    title: 'Kunlik salomlashuv',
    level: 'A2',
    audioUrl: '',
    text: 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ',
    progress: 0
  },
  {
    id: 'demo-2',
    title: 'Oila haqida',
    level: 'B1',
    audioUrl: '',
    text: 'هَذِهِ أُسْرَتِي، أَبِي وَأُمِّي وَأَخِي الصَّغِيرُ',
    progress: 40
  },
  {
    id: 'demo-3',
    title: 'Kundalik ish tartibi',
    level: 'B2',
    audioUrl: '',
    text: 'أَسْتَيْقِظُ كُلَّ يَوْمٍ فِي السَّاعَةِ السَّادِسَةِ صَبَاحًا وَأَذْهَبُ إِلَى الْعَمَلِ',
    progress: 100
  }
];

// Har bir matnni so'zlarga (probel bo'yicha) ajratib beradi.
function splitIntoWords(text) {
  return text.trim().split(/\s+/);
}
