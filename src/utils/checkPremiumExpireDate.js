export const checkPremiumExpireDate = (expireDate) => {
  // Если пришел null или undefined - возвращаем false
  if (expireDate === null || expireDate === undefined) {
    return false;
  }
  
  try {
    // Создаем объекты Date для сравнения
    const expireDateTime = new Date(expireDate);
    const currentDateTime = new Date();
    
    // Проверяем, что дата корректна
    if (isNaN(expireDateTime.getTime())) {
      return false;
    }
    
    // Сравниваем даты: если expireDate в будущем - true, иначе false
    return expireDateTime > currentDateTime;
    
  } catch (error) {
    // В случае ошибки парсинга даты возвращаем false
    console.error('Error parsing premium expiration date:', error);
    return false;
  }
};