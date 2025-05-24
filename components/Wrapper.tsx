// components/Wrapper.tsx
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface WrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  applyPaddingTo?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string; // Option für Hintergrundfarbe
}

const Wrapper: React.FC<WrapperProps> = ({
  children,
  style,
  applyPaddingTo = ['top', 'bottom', 'left', 'right'],
  backgroundColor, // Standardmäßig keine Hintergrundfarbe vom Wrapper
}) => {
  const insets = useSafeAreaInsets();

  const wrapperStyle: ViewStyle = {
    flex: 1,
    paddingTop: applyPaddingTo.includes('top') ? insets.top : 0,
    paddingBottom: applyPaddingTo.includes('bottom') ? insets.bottom : 0,
    paddingLeft: applyPaddingTo.includes('left') ? insets.left : 0,
    paddingRight: applyPaddingTo.includes('right') ? insets.right : 0,
  };

  if (backgroundColor) {
    wrapperStyle.backgroundColor = backgroundColor;
  }

  return <View style={[wrapperStyle, style]}>{children}</View>;
};

export default Wrapper;