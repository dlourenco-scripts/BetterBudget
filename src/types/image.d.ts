type PickerMode = 'camera' | 'gallery';

export type PickerOptions = {
  mode: PickerMode;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
};
