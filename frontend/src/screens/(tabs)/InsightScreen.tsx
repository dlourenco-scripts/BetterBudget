import React, {useState} from 'react';
import {Image, TouchableOpacity, View} from 'react-native';
import {router} from 'expo-router';
import {Calendar} from 'react-native-calendars';
import {BarChart, LineChart} from 'react-native-gifted-charts';
import {Entypo, Feather, FontAwesome5} from '@expo/vector-icons';
import {
  BottomSheet,
  Header,
  Spacer,
  Text,
  TextInput,
  ToggleButton,
  Wrapper,
} from '@/components';
import {CircularProgress} from '@/components/others/CircularProgress';
import WalkthroughTooltip from '@/components/others/WalkthroughTooltip';
import {appImages} from '@/constants/assets';
import {colors} from '@/constants/colors';
import {useCurrency} from '@/context/CurrencyProvider';
import {useWalkthrough} from '@/context/WalkthroughProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

const getBarData = (isDark: boolean) => [
  {
    label: '1st Week',
    frontColor: '#F4A623',
    value: 5,
    spacing: 10,
  },
  {
    value: 10,
    frontColor: isDark ? '#FFFFFF' : '#3C2A1E',
    spacing: 50,
  },

  {
    label: '2nd Week',
    frontColor: '#F4A623',
    value: 7,
    spacing: 15,
  },
  {
    value: 3,
    frontColor: isDark ? '#FFFFFF' : '#3C2A1E',
    spacing: 50,
  },

  {
    label: '3rd Week',
    frontColor: '#F4A623',
    value: 2,
    spacing: 15,
  },
  {
    value: 7,
    frontColor: isDark ? '#FFFFFF' : '#3C2A1E',
    spacing: 50,
  },

  {
    label: '4th Week',
    frontColor: '#F4A623',
    value: 5,
    spacing: 15,
  },
  {
    value: 7,
    frontColor: isDark ? '#FFFFFF' : '#3C2A1E',
    spacing: 50,
  },
];

const getLineData = (textColor: string, currencySymbol: string) => [
  {value: 4000, dataPointText: `${currencySymbol}4,000`, textColor: textColor},
  {
    value: 10000,
    dataPointText: `${currencySymbol}10,000`,
    textColor: textColor,
  },
];

const InsightScreen = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const {nextStep, currentStep} = useWalkthrough();
  const isDark = color.bg === colors.dark.bg;
  const customInputBg = isDark ? '#0F1115' : undefined;
  const [showInsightSheet, setShowInsightSheet] = React.useState(false);
  const [showFinancialSheet, setShowFinancialSheet] = useState(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);
  const [selectedForecastDate, setSelectedForecastDate] = useState('');

  // Auto-open sheet when reaching Step 7
  React.useEffect(() => {
    if (currentStep === 7) {
      setTimeout(() => {
        setShowInsightSheet(true);
      }, 500);
    }
  }, [currentStep]);

  return (
    <Wrapper
      keyboardProps={{stickyHeaderIndices: [0], bounces: false}}
      bottomSpace={false}
      containerStyle={{
        paddingHorizontal: 0,
      }}>
      <Header
        canGoBack={false}
        title="Insights"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        leftComponent={
          <TouchableOpacity
            activeOpacity={0.6}
            style={{
              borderRadius: 50,
              backgroundColor: color.tabBackground,
              padding: 5,
              marginHorizontal: 20,
            }}
            onPress={() => setShowInsightSheet(true)}>
            <Feather name="more-horizontal" size={22} color={color.tabicon} />
          </TouchableOpacity>
        }
      />
      <Spacer height={20} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 20,
          marginHorizontal: 15,
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 25,
            marginLeft: 40,
          }}>
          <CircularProgress progress={50} size={110} strokeWidth={5}>
            <Text
              variant="medium"
              size={13}
              color={color.black}
              style={{textAlign: 'center'}}>
              Monthly {'\n'} Overview
            </Text>
          </CircularProgress>
          <View
            style={{
              height: 110,
              width: 2,
              backgroundColor: color.primary,
            }}
          />
        </View>
        <View style={{flex: 1, justifyContent: 'center', marginLeft: 10}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <Image
              source={appImages.Paymentimg}
              style={{
                height: heightPixel(33),
                width: widthPixel(33),
                resizeMode: 'contain',
                tintColor: isDark ? color.white : undefined,
              }}
            />
            <View>
              <Text size={12} color={color.black}>
                Income
              </Text>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                <Text size={16} variant="bold" color={color.primary}>
                  + {currencySymbol}4.000.00
                </Text>
                <FontAwesome5
                  name="long-arrow-alt-up"
                  size={16}
                  color={color.primary}
                />
              </View>
            </View>
          </View>
          <View
            style={{
              width: '85%',
              height: 2,
              backgroundColor: color.primary,
              marginVertical: 10,
            }}
          />
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <Image
              source={appImages.Walletimg}
              style={{
                height: heightPixel(33),
                width: widthPixel(33),
                resizeMode: 'contain',
                tintColor: isDark ? color.white : undefined,
              }}
            />
            <View>
              <Text size={12} color={color.black}>
                Expenses
              </Text>
              <View
                style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                <Text size={16} variant="bold" color={color.tabicon}>
                  {currencySymbol} - 100.00
                </Text>
                <FontAwesome5
                  name="long-arrow-alt-down"
                  size={16}
                  color={color.tabicon}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
      <Spacer height={40} />
      <View
        style={{
          flex: 1,
          backgroundColor: color.primary,
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}>
        <Spacer height={40} />
        <View
          style={{
            backgroundColor: isDark ? '#1F1F1F' : '#FFF7EC',
            paddingHorizontal: widthPixel(25),
            paddingVertical: heightPixel(20),
            borderRadius: 25,
            paddingBottom: heightPixel(20),
          }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 10,
              alignItems: 'center',
            }}>
            <Text size={15} variant="medium" color={color.black}>
              April Expenses
            </Text>
            <View
              style={{
                backgroundColor: '#F6B756',
                padding: 8,
                borderRadius: 10,
              }}>
              <Image
                source={appImages.Calender}
                style={{
                  tintColor: '#000000',
                  height: heightPixel(20),
                  width: widthPixel(20),
                  resizeMode: 'contain',
                }}
              />
            </View>
          </View>

          <BarChart
            data={getBarData(isDark)}
            barWidth={widthPixel(7)}
            spacing={10}
            noOfSections={4}
            maxValue={20}
            stepValue={5}
            yAxisLabelTexts={['', '1k', '5k', '10k', '15k', '20k']}
            yAxisTextStyle={{
              color: color.black,
            }}
            yAxisThickness={0}
            xAxisThickness={2}
            xAxisColor="#707070"
            dashGap={3}
            dashWidth={2}
            hideRules={false}
            hideYAxisText={false}
            barBorderTopLeftRadius={4}
            barBorderTopRightRadius={4}
            labelWidth={40}
            yAxisLabelWidth={widthPixel(35)}
            labelsDistanceFromXaxis={5}
            xAxisLabelTextStyle={{
              color: color.black,
              fontSize: 12,
            }}
          />
        </View>
        <Spacer height={20} />
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          <Text size={18} variant="semibold" color={color.white}>
            Show Detailed Expenses
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={{
              borderRadius: 50,
              backgroundColor: color.white,
              padding: 5,
              alignSelf: 'flex-start',
            }}
            onPress={() => router.navigate('/mainScreens/Insights')}>
            <Entypo
              name="chevron-thin-right"
              size={15}
              color={isDark ? '#000000' : color.tabicon}
            />
          </TouchableOpacity>
        </View>
        <Spacer height={10} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <Text size={14} variant="semibold" color="#000000">
            Current Savings
          </Text>
          <Text size={14} variant="semibold" color={color.white}>
            Savings Goal
          </Text>
        </View>
        <Spacer height={15} />
        <View
          style={{
            backgroundColor: color.tabBackground,
            borderRadius: 50,
            paddingHorizontal: 10,
            paddingVertical: 5,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
          <View
            style={{
              flex: 1,
              backgroundColor: color.primary,
              borderRadius: 30,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 5,
              justifyContent: 'space-between',
            }}>
            <Text size={14} color="#000000">
              0%
            </Text>
            <Text size={14} color="#000000">
              4000%
            </Text>
          </View>
          <Text
            size={14}
            color={color.black}
            variant="italic"
            style={{
              marginLeft: 10,
            }}>
            {currencySymbol}10,000
          </Text>
        </View>
        <Spacer height={heightPixel(30)} />
        <View
          style={{
            backgroundColor: isDark ? '#1F1F1F' : '#FFF9F0',
            borderRadius: 32,
            paddingVertical: heightPixel(20),
          }}>
          <View
            style={{
              marginHorizontal: widthPixel(15),
              borderRadius: 20,
              backgroundColor: color.primary,
              alignSelf: 'flex-start',
              paddingHorizontal: widthPixel(10),
              paddingVertical: heightPixel(5),
            }}>
            <Text size={14} variant="medium" color="#000000">
              Projected Savings
            </Text>
          </View>
          <View
            style={{
              // width: '100%',
              marginLeft: widthPixel(-20),
            }}>
            <LineChart
              animateOnDataChange
              animationDuration={300}
              initialSpacing={widthPixel(20)}
              data={getLineData(
                isDark ? '#FFFFFF' : color.black,
                currencySymbol,
              )}
              thickness={widthPixel(3)}
              color="#F0A12A"
              dataPointsColor="#F0A12A"
              dataPointsRadius={0}
              areaChart={true}
              startFillColor="#FFBF47"
              endFillColor="#FFFFFF"
              startOpacity={1}
              endOpacity={0}
              hideAxesAndRules={true}
              maxValue={widthPixel(14000)}
              adjustToWidth={true}
              yAxisExtraHeight={0}
              trimYAxisAtTop={false}
              spacing={widthPixel(310)}
              textShiftX={-widthPixel(15)}
              textShiftY={-heightPixel(15)}
            />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginHorizontal: 25,
            }}>
            <View style={{alignItems: 'center'}}>
              <Text size={13} color={isDark ? '#FFFFFF' : color.black}>
                Jan 01, 2025
              </Text>
              <Text size={10} color={isDark ? '#FFFFFF' : color.black}>
                Current Date
              </Text>
            </View>
            <View style={{alignItems: 'center'}}>
              <Text size={13} color={isDark ? '#FFFFFF' : color.black}>
                Jan 01, 2025
              </Text>
              <Text size={10} color={isDark ? '#FFFFFF' : color.black}>
                Current Date
              </Text>
            </View>
          </View>
        </View>
      </View>
      <BottomSheet
        visible={showInsightSheet}
        onClose={() => setShowInsightSheet(false)}
        title=""
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(40)} />
        <View style={{gap: widthPixel(20), marginBottom: heightPixel(40)}}>
          <WalkthroughTooltip
            stepNumber={7}
            content="Click here for simulated budget"
            placement="top"
            displayDelay={1000}>
            <TouchableOpacity
              style={{
                width: '80%',
                backgroundColor: color.bg,
                borderRadius: heightPixel(12),
                paddingHorizontal: widthPixel(13),
                paddingVertical: heightPixel(12),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: color.primary,
                marginHorizontal: widthPixel(35),
              }}
              activeOpacity={0.8}
              onPress={() => {
                setShowInsightSheet(false);
                router.navigate('/mainScreens/SimulatedBudget');
              }}>
              <Text variant="medium" size={16} color={color.black}>
                Simulated Budget
              </Text>
              <Feather name="chevron-right" size={22} color={color.walletbg} />
            </TouchableOpacity>
          </WalkthroughTooltip>
          <WalkthroughTooltip
            stepNumber={8}
            content="Click here for financial forecast"
            placement="top"
            displayDelay={500}>
            <TouchableOpacity
              style={{
                width: '80%',
                backgroundColor: color.bg,
                borderRadius: heightPixel(12),
                paddingHorizontal: widthPixel(13),
                paddingVertical: heightPixel(12),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: color.primary,
                marginHorizontal: widthPixel(35),
              }}
              activeOpacity={0.8}
              onPress={() => {
                setShowInsightSheet(false);
                setSelectedTabIndex(0);
                setShowFinancialSheet(true);
              }}>
              <Text variant="medium" size={16} color={color.black}>
                Financial Forecast
              </Text>
              <Feather name="chevron-right" size={22} color={color.walletbg} />
            </TouchableOpacity>
          </WalkthroughTooltip>
        </View>
      </BottomSheet>
      <BottomSheet
        visible={showFinancialSheet}
        onClose={() => setShowFinancialSheet(false)}
        title="Projected Savings"
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={10} />
        <View style={{gap: widthPixel(20)}}>
          <ToggleButton
            options={['By Amount', 'By Date']}
            selectedIndex={selectedTabIndex}
            onToggle={setSelectedTabIndex}
          />
          {selectedTabIndex === 0 ? (
            <TextInput
              title="Amount"
              placeholder="0"
              placeholderTextColor={color.tabicon}
              keyboardType="numeric"
              useCurrencyIcon={true}
              inputContainerStyle={
                customInputBg ? {backgroundColor: customInputBg} : undefined
              }
            />
          ) : (
            <Calendar
              renderArrow={direction => (
                <Entypo
                  name={
                    direction === 'left'
                      ? 'chevron-thin-left'
                      : 'chevron-thin-right'
                  }
                  size={20}
                  color={color.black}
                />
              )}
              onDayPress={day => {
                setSelectedForecastDate(day.dateString);
                setShowFinancialSheet(false);
              }}
              markedDates={{
                ...Object.fromEntries(
                  Array.from({length: 8}, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const dateString = date.toISOString().split('T')[0];
                    return [
                      dateString,
                      {
                        marked: true,
                        dotColor: 'transparent',
                        textColor: color.primary,
                      },
                    ];
                  }),
                ),
                ...(selectedForecastDate
                  ? {
                      [selectedForecastDate]: {
                        selected: true,
                        selectedColor: color.primary,
                        selectedTextColor: color.black,
                      },
                    }
                  : {}),
              }}
              theme={
                {
                  backgroundColor: color.inputField,
                  calendarBackground: color.inputField,
                  textSectionTitleColor: color.black,
                  selectedDayBackgroundColor: color.primary,
                  selectedDayTextColor: color.black,
                  todayTextColor: color.primary,
                  dayTextColor: color.black,
                  textDisabledColor: color.disabled,
                  monthTextColor: color.black,
                  textMonthFontWeight: '600',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14,
                  arrowColor: color.black,
                  todayBackgroundColor: 'transparent',
                  'stylesheet.calendar.header': {
                    header: {
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                      alignSelf: 'center',
                      marginTop: 16,
                      marginBottom: 20,
                      backgroundColor: 'transparent',
                      borderRadius: 50,
                      paddingVertical: 12,
                      paddingHorizontal: 20,
                      width: '80%',
                    },
                    monthText: {
                      fontSize: 18,
                      fontWeight: '600',
                      color: color.black,
                      marginHorizontal: 30,
                    },
                    arrow: {
                      padding: 5,
                    },
                    arrowImage: {
                      tintColor: color.black,
                    },
                    week: {
                      marginTop: 10,
                      paddingTop: 20,
                      borderTopWidth: 1,
                      borderTopColor: color.border,
                      flexDirection: 'row',
                      justifyContent: 'space-around',
                    },
                  },
                  'stylesheet.day.basic': {
                    base: {
                      width: 32,
                      height: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    text: {
                      marginTop: 4,
                      fontSize: 16,
                      fontWeight: '400',
                      color: color.black,
                    },
                    today: {
                      backgroundColor: 'transparent',
                    },
                    todayText: {
                      color: color.primary,
                      fontWeight: '600',
                    },
                  },
                } as any
              }
              style={{
                borderRadius: 10,
              }}
            />
          )}
        </View>
        <Spacer height={40} />
      </BottomSheet>
    </Wrapper>
  );
};

export default InsightScreen;
