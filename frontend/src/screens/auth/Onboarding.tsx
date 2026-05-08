import React, {useRef, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {router} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Spacer, Text} from '@/components';
import {SegmentedProgressButton} from '@/components/others/SegmentedProgressButton';
import {appImages, AppSvgs} from '@/constants/assets';
import {colors} from '@/constants/colors';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel} from '@/services/responsive';

export const onboardingData = [
  {
    id: '1',
    title: 'Create Your Budget',
    description:
      'Design a budget that works for you. Track income and expenses, then save or pay down debt knowing your budget stays balanced.',
    image: appImages.Budgetimg,
  },
  {
    id: '2',
    title: 'Add Income',
    description:
      'Enter your income effortlessly to build a budget that fits your finances.',
    image: appImages.Incomeimg,
  },
  {
    id: '3',
    title: 'Add Debt',
    description:
      'Keep track of your debt in one place, stay focused on becoming debt-free, and automatically apply extra funds to speed up the process.',
    image: appImages.Debtimg,
  },
  {
    id: '4',
    title: 'Add Your Savings',
    description:
      'Track your savings and monitor progress toward your financial goals.',
    image: appImages.SavingMoneyimg,
  },
  {
    id: '5',
    title: 'View Insights',
    description:
      'See the bigger picture of your finances. Track spending vs. income, explore historical trends, and use tools like Simulated Budget and Financial Forecast to plan smarter.',
    image: appImages.Insight,
  },
  {
    id: '6',
    title: 'Recurring & One Time Expense',
    description:
      'Add both recurring and one-time expenses to your budget to stay in control and prevent unexpected shortfalls.',
    image: appImages.ExpenseOnboarding,
  },
];

const {width} = Dimensions.get('screen');

const Onboarding = () => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = createStyles(color);

  //  Use momentum end to get correct page index
  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(newIndex);
  };

  const goNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToOffset({
        offset: width * (currentIndex + 1),
        animated: true,
      });
    } else {
      router.replace('/auth/CreateBudget');
    }
  };
  const skip = () => {
    router.replace('/auth/CreateBudget');
  };

  const renderItem = ({item}: any) => {
    return (
      <View style={styles.slideContainer}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
        <Spacer height={30} />
        <View style={styles.textWrap}>
          <Text
            size={28}
            variant="semibold"
            color={color.primary}
            style={styles.title}>
            {item.title}
          </Text>
          <Spacer height={30} />
          <Text
            variant="regular"
            size={16}
            color={color.black}
            style={styles.description}>
            {item.description}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Spacer height={10} />
      <Image
        source={
          color.bg === '#121212'
            ? appImages.BudgetLogo
            : appImages.BudgetLogolight
        }
        style={styles.logo}
        resizeMode="contain"
      />
      {/* center area */}
      <View style={styles.centerArea}>
        <FlatList
          ref={flatListRef}
          data={onboardingData}
          keyExtractor={i => i.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={renderItem}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={styles.flat}
          contentContainerStyle={styles.flatContent}
        />
      </View>
      {/* bottom fixed controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity onPress={skip}>
          <Text
            size={21}
            variant="semibold"
            color={isDarkMode ? '#7A7F8C' : color.black}>
            Skip
          </Text>
        </TouchableOpacity>

        <SegmentedProgressButton
          totalSteps={onboardingData.length}
          currentIndex={currentIndex}
          onPress={goNext}
          inactiveColor={isDarkMode ? '#FFFFFF' : '#3A2A1A'}
          activeColor={isDarkMode ? '#7A7F8C' : '#F5D9A8'}
          iconColor={isDarkMode ? '#FFFFFF' : undefined}
        />
      </View>
    </SafeAreaView>
  );
};

const createStyles = (color: any) => {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: color.bg,
      marginBottom: Platform.OS === 'ios' ? 0 : 10,
    },
    logo: {
      width: widthPixel(320),
      height: widthPixel(131),
      alignSelf: 'center',
    },
    centerArea: {
      flex: 1, // takes remaining space between logo and bottom controls
      justifyContent: 'center',
      alignItems: 'center',
    },
    flat: {
      flex: 1,
    },
    flatContent: {
      flexGrow: 1,
    },
    slideContainer: {
      width, // full screen width for paging
      flex: 1,
      justifyContent: 'center', // <-- centers vertically inside available centerArea
      alignItems: 'center',
      // paddingHorizontal: 5,
    },
    image: {
      width: widthPixel(221),
      height: heightPixel(221),
      marginBottom: 20,
    },
    textWrap: {
      width: '95%',
      alignItems: 'center',
    },
    title: {
      textAlign: 'center',
      marginBottom: 10,
    },
    description: {
      textAlign: 'center',
      paddingHorizontal: 10,
    },
    bottomControls: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 48,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      alignItems: 'center',
    },
  });
};

export default Onboarding;
