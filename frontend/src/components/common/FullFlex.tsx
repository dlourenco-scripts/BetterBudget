import React, {JSX} from 'react';
import {Text, View, ViewStyle} from 'react-native';

const FullFlex = ({
  style = {},
  children,
}: {
  style?: ViewStyle;
  children?: JSX.Element;
}) => {
  return (
    <View
      style={[
        {flex: 1, justifyContent: 'center', alignItems: 'center'},
        style,
      ]}>
      {children}
    </View>
  );
};

export default FullFlex;
