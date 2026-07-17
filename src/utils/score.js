/**
 * Ball qiymatlarini normallashtirish.
 *
 * Nega kerak: `user_attempts.score` prod'da `numeric`, lekin dev'da `text` (schema drift), va
 * text ustunida "A1" kabi raqam bo'lmagan qiymatlar ham uchraydi. Bundan tashqari PostgREST
 * ba'zi tiplarni satr sifatida qaytaradi. Natijada UI'da `score.toFixed(1)` chaqirilganda
 * "toFixed is not a function" bilan butun sahifa qulab tushardi.
 *
 * Shuning uchun ball DOIM shu yerdan o'tkaziladi: satr bo'lsa songa o'giriladi, noto'g'ri
 * qiymat (masalan "A1") bo'lsa null qaytariladi - sahifa qulamaydi.
 */

/** Har qanday kirishni songa o'giradi. Faqat haqiqiy son qaytadi, aks holda null. */
export const toScore = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Ball mavjudmi? MUHIM: 0 ham haqiqiy IELTS bali, shuning uchun falsy tekshiruv ishlatilmaydi. */
export const hasScore = (value) => toScore(value) !== null;

/**
 * Ballni ko'rsatish uchun formatlaydi ("7.5"). Ball bo'lmasa fallback qaytaradi.
 * `score?.toFixed(1) || '0.0'` o'rniga ishlatiladi - u satr uchun crash berardi va
 * 0 balni ham '0.0' fallback bilan yashirardi.
 */
export const formatScore = (value, fallback = '—') => {
  const n = toScore(value);
  return n === null ? fallback : n.toFixed(1);
};
