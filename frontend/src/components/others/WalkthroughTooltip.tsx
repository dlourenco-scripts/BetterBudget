import React from 'react';
import {
  Image,
  Platform,
  StatusBar,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';
import {appImages} from '@/constants/assets';
import {useWalkthrough, WALKTHROUGH_TOTAL_STEPS} from '@/context/WalkthroughProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';
import Text from '../common/Text';

const DARK_TOOLTIP_BG = '#6E5B3B';

interface WalkthroughTooltipProps {
  stepNumber: number;
  title?: string;
  content: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  onStepActive?: () => void;
  style?: StyleProp<ViewStyle>;
  displayDelay?: number;
}

const WalkthroughTooltip: React.FC<WalkthroughTooltipProps> = ({
  stepNumber,
  title,
  content,
  children,
  placement = 'bottom',
  style,
  onStepActive,
  displayDelay,
}) => {
  const colors = useThemeColor();
  const theme = useColorScheme();
  const isDarkMode = theme === 'dark';
  const {isStepVisible, nextStep, prevStep, skipWalkthrough} = useWalkthrough();

  const tooltipBgColor = isDarkMode ? DARK_TOOLTIP_BG : colors.white;
  const textColor = isDarkMode ? '#FFFFFF' : colors.black;

  const isVisible = isStepVisible(stepNumber);
  const isLastStep = stepNumber === WALKTHROUGH_TOTAL_STEPS;

  // New state for delayed visibility
  const [shouldShowTooltip, setShouldShowTooltip] = React.useState(
    displayDelay ? false : isVisible,
  );

  // Trigger onStepActive when this step becomes visible
  React.useEffect(() => {
    if (isVisible) {
      if (displayDelay) {
        const timer = setTimeout(() => {
          setShouldShowTooltip(true);
          if (onStepActive) {
            onStepActive();
          }
        }, displayDelay);
        return () => clearTimeout(timer);
      } else {
        setShouldShowTooltip(true);
        if (onStepActive) {
          onStepActive();
        }
      }
    } else {
      setShouldShowTooltip(false);
    }
  }, [isVisible, onStepActive, displayDelay]);

  const TooltipContent = () => (
    <View
      style={[
        styles.tooltipContainer,
        {backgroundColor: tooltipBgColor},
        style,
      ]}>
      <View style={styles.contentRow}>
        <View style={styles.starContainer}>
          <Image
            source={appImages.Star}
            style={styles.starIcon}
            resizeMode="contain"
          />
        </View>
        <View style={styles.textContainer}>
          {/* {title && (
            <Text
              variant="semibold"
              size={20}
              color={textColor}
              style={styles.title}>
              {title}
            </Text>
          )} */}
          <Text variant="regular" size={14} color={textColor}>
            {content}
          </Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={stepNumber === 1 ? skipWalkthrough : prevStep}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text variant="regular" size={14} color={colors.primary}>
            {stepNumber === 1 ? 'Skip' : 'Previous'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={nextStep}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text variant="regular" size={14} color={colors.primary}>
            {isLastStep ? 'Done' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Tooltip
      isVisible={shouldShowTooltip}
      content={<TooltipContent />}
      placement={placement}
      showChildInTooltip={true}
      useInteractionManager
      arrowStyle={{borderTopColor: tooltipBgColor}}
      onClose={skipWalkthrough}
      backgroundColor="rgba(0, 0, 0, 0.7)"
      tooltipStyle={{backgroundColor: 'transparent', padding: 0}}
      contentStyle={{borderRadius: widthPixel(12), padding: 0}}
      disableShadow
      childContentSpacing={8}>
      {children}
    </Tooltip>
  );
};

export default WalkthroughTooltip;

const styles = StyleSheet.create({
  tooltipContainer: {
    paddingTop: heightPixel(24),
    paddingBottom: heightPixel(16),
    paddingHorizontal: widthPixel(20),
    borderRadius: widthPixel(12),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  starContainer: {
    marginRight: widthPixel(12),
    marginTop: heightPixel(2),
  },
  starIcon: {
    width: widthPixel(24),
    height: widthPixel(24),
  },
  textContainer: {
    flex: 1,
  },
  title: {
    textAlign: 'left',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: widthPixel(15),
    width: '100%',
    marginTop: heightPixel(12),
  },
});
