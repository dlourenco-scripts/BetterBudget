import {Dimensions, PixelRatio} from 'react-native';

export const WINDOW_WIDTH = Dimensions.get('window').width;
export const WINDOW_HEIGHT = Dimensions.get('window').height;
export const SCREEN_WIDTH = Dimensions.get('screen').width;
export const SCREEN_HEIGHT = Dimensions.get('screen').height;

const widthBaseScale = WINDOW_WIDTH / 430;
const heightBaseScale = WINDOW_HEIGHT / 932;
export const wp = (p: any) => WINDOW_WIDTH * (p / 100);
export const hp = (p: any) => WINDOW_HEIGHT * (p / 100);

function normalize(size: any, based = 'width') {
  const newSize =
    based === 'height' ? size * heightBaseScale : size * widthBaseScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}
export const widthPixel = (size: number): number => {
  const newSize = size * widthBaseScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const heightPixel = (size: number): number => {
  const newSize = size * heightBaseScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const fontPixel = (size: number): number => {
  const newSize = size * widthBaseScale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};
export const emailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
