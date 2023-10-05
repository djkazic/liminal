export const formatNumber = number => {
  let finalNumber = number;
  if (typeof number !== 'number' || !Number.isInteger(number)) {
    finalNumber = Number(number);
  }
  const reversedNumberString = number.toString().split('').reverse().join('');
  const formattedString = reversedNumberString.replace(/(\d{3})(?=\d)/g, '$1 ');
  return formattedString.split('').reverse().join('');
};
