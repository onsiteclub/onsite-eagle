// Type overrides for Expo components to work with React 18.3 types
// This is needed due to type incompatibility between React 18 and React 19 types

declare module 'expo-camera' {
  import React from 'react';

  export interface BarcodeScanningResult {
    type: string;
    data: string;
  }

  export interface CameraViewProps {
    style?: any;
    children?: React.ReactNode;
    ref?: React.Ref<any>;
    barcodeScannerSettings?: {
      barcodeTypes?: string[];
    };
    onBarcodeScanned?: (result: BarcodeScanningResult) => void;
  }

  export class CameraView extends React.Component<CameraViewProps> {
    takePictureAsync(options?: { quality?: number; base64?: boolean }): Promise<{ uri: string } | null>;
  }

  export function useCameraPermissions(): [
    { granted: boolean } | null,
    () => Promise<{ granted: boolean }>
  ];
}

declare module 'expo-router' {
  import React from 'react';

  export interface StackProps {
    screenOptions?: any;
    children?: React.ReactNode;
  }

  export interface StackScreenProps {
    name?: string;
    options?: any;
    children?: React.ReactNode;
  }

  export const Stack: React.FC<StackProps> & {
    Screen: React.FC<StackScreenProps>;
  };

  export interface TabsProps {
    screenOptions?: any;
    children?: React.ReactNode;
  }

  export interface TabScreenProps {
    name: string;
    options?: {
      title?: string;
      tabBarLabel?: string;
      tabBarIcon?: (props: { focused: boolean; color: string }) => React.ReactNode;
    };
  }

  export const Tabs: React.FC<TabsProps> & {
    Screen: React.FC<TabScreenProps>;
  };

  export function useLocalSearchParams<T>(): T;
  export const router: {
    push: (href: string) => void;
    back: () => void;
    replace: (href: string) => void;
  };
  export const Link: React.FC<{ href: string; asChild?: boolean; children?: React.ReactNode }>;
}
