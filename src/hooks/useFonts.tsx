import {useEffect, useState} from 'react';
import * as Font from 'expo-font';
import {fonts} from '@/constants/fonts';

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const loadFonts = async () => {
      await Font.loadAsync({
        [fonts.bold]: require('../assets/fonts/Poppins-Bold.ttf'),
        [fonts.semibold]: require('../assets/fonts/Poppins-SemiBold.ttf'),
        [fonts.medium]: require('../assets/fonts/Poppins-Medium.ttf'),
        [fonts.regular]: require('../assets/fonts/Poppins-Regular.ttf'),
        [fonts.italic]: require('../assets/fonts/Poppins-Italic.ttf'),
        [fonts.semibolditalic]: require('../assets/fonts/Poppins-SemiBoldItalic.ttf'),
        [fonts.mediumitalic]: require('../assets/fonts/Poppins-MediumItalic.ttf'),
        [fonts.PoltawskiNowy]: require('../assets/fonts/PoltawskiNowy-Italic-VariableFont_wght.ttf'),
      });
      setFontsLoaded(true);
    };

    loadFonts();
  }, []);

  return fontsLoaded;
};
