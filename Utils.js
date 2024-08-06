import RNFS from 'react-native-fs';

export const formatNumber = number => {
  let finalNumber = number;
  if (typeof number !== 'number' || !Number.isInteger(number)) {
    finalNumber = Number(number);
  }
  const reversedNumberString = number.toString().split('').reverse().join('');
  const formattedString = reversedNumberString.replace(/(\d{3})(?=\d)/g, '$1 ');
  return formattedString.split('').reverse().join('');
};

export const fetchFee = async () => {
  try {
    const response = await fetch(
      'https://mempool.space/api/v1/fees/recommended'
    );
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    const data = await response.json();
    return data.hourFee;
  } catch (error) {
    console.error(
      'There has been a problem with your fetch operation:',
      error
    );
  }
};

const BuildConfig = require('react-native-build-config');

export const macaroonExists = async () => {
  const lndPath = RNFS.DocumentDirectoryPath;
  const flavor = BuildConfig.default.FLAVOR_network;
  const network = flavor.toLowerCase().includes('mainnet') ? 'mainnet' : 'testnet';
  const filePath = `${lndPath}/data/chain/bitcoin/${network}/admin.macaroon`;
  return await RNFS.exists(filePath);
};