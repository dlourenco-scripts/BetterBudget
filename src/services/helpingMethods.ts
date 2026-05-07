import {Alert, Linking, Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';
import {PickerOptions} from '@/types/image';

export const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    const response = await NetInfo.fetch();
    return response?.isConnected ?? false;
  } catch (error) {
    console.error('Network check failed:', error);
    return false;
  }
};

export const KeyExtractor = (_: any, index: number) => {
  return index.toString();
};

export const isIOS = Platform.OS === 'ios';

export async function pickImage(
  options: PickerOptions,
): Promise<string | null> {
  const {mode, allowsEditing = true, aspect = [1, 9], quality = 0.7} = options;

  const permission =
    mode === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      'Permission Denied',
      `Please allow access to your ${
        mode === 'camera' ? 'camera' : 'photo library'
      }.`,
    );
    return null;
  }

  const result =
    mode === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          allowsEditing,
          aspect,
          quality,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          allowsEditing,
          aspect,
          quality,
        });

  if (!result.canceled) {
    return result.assets?.[0]?.uri ?? null;
  }

  return null;
}
export interface DropdownOption {
  label: string;
  value: string;
}

export function formatDropdownData(
  data: Array<string | {name: string}>,
): DropdownOption[] {
  if (!Array.isArray(data)) {
    console.error('Input data is not an array:', data);
    return [];
  }

  if (data.length === 0) {
    return [];
  }

  return data.map(item => {
    const name = typeof item === 'string' ? item : item.name;
    return {
      label: name,
      value: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    };
  });
}

export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'boolean') return !value;
  if (typeof value === 'number') return isNaN(value);
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (
      trimmed === '' ||
      trimmed === 'null' ||
      trimmed === 'undefined' ||
      trimmed === 'false' ||
      trimmed === 'nan'
    ) {
      return true;
    }
    return false;
  }
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;

  return false;
}
