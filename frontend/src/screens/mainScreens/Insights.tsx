import React, {useState} from 'react';
import {Image, ScrollView, TouchableOpacity, View} from 'react-native';
import {LineChart, PieChart} from 'react-native-gifted-charts';
import {Feather, FontAwesome5} from '@expo/vector-icons';
import {
  BottomSheet,
  Header,
  IconToggleButton,
  Spacer,
  Text,
  Wrapper,
} from '@/components';
import {appImages} from '@/constants/assets';
import {useCurrency} from '@/context/CurrencyProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

const Insights = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';

  // Dynamic chart colors for dark mode
  const chartColor2 = isDark ? '#FFFFFF' : '#3C2A1E';
  const chartRulesColor = isDark ? '#333333' : '#E8E8E8';
  const chartAxisColor = isDark ? '#333333' : '#E0E0E0';
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);
  const [selectedTimeline, setSelectedTimeline] = useState('Monthly');
  const [selectedCompare, setSelectedCompare] = useState('Expense');
  const [showTimelineSheet, setShowTimelineSheet] = useState(false);
  const [showCompareSheet, setShowCompareSheet] = useState(false);

  const timelineOptions = ['Monthly', 'Yearly'];
  const compareOptions = ['Expense', 'One-Time Expense', 'Debt'];

  const toggleOptions = [
    {label: 'Breakdown', icon: 'pie-chart-outline' as const},
    {label: 'Comparison', icon: 'stats-chart-outline' as const},
  ];

  // Sample data for pie chart
  const pieData = [
    {value: 33, color: '#FFC067', text: '33%'},
    {value: 34, color: '#FFD767', text: '34%'},
    {value: 33, color: '#FFAF3F', text: '33%'},
  ];

  // Sample categories data
  const categories = [
    {
      id: 1,
      icon: appImages.Housing,
      name: 'Housing',
      percentage: '33%',
      amount: `-${currencySymbol}1200`,
      isUp: false,
    },
    {
      id: 2,
      icon: appImages.Health,
      name: 'Health',
      percentage: '33%',
      amount: `-${currencySymbol}2500`,
      isUp: true,
    },
    {
      id: 3,
      icon: appImages.plane,
      name: 'Travel',
      percentage: '34%',
      amount: `-${currencySymbol}200`,
      isUp: false,
    },
  ];

  // Sample data for line chart
  const lineData1 = [
    {value: 700, label: 'Jan'},
    {value: 650, label: 'Feb'},
    {value: 550, label: 'Mar'},
    {value: 525, label: 'Apr'},
    {value: 400, label: 'May'},
    {value: 250, label: 'Jun', dataPointText: `-${currencySymbol}12,473`},
  ];

  const lineData2 = [
    {value: 650, label: 'Jan'},
    {value: 720, label: 'Feb'},
    {value: 450, label: 'Mar'},
    {value: 425, label: 'Apr'},
    {value: 350, label: 'May'},
    {value: 200, label: 'Jun', dataPointText: `-${currencySymbol}12,473`},
  ];

  const renderBreakdownView = () => (
    <View>
      {/* Pie Chart */}
      <View style={{alignItems: 'center', marginVertical: heightPixel(30)}}>
        <PieChart
          data={pieData}
          donut
          radius={widthPixel(90)}
          innerRadius={widthPixel(60)}
          innerCircleColor={isDark ? '#1F1F1F' : color.bg}
          centerLabelComponent={() => (
            <View style={{alignItems: 'center'}}>
              <Text size={20} variant="medium" color={color.black}>
                {currencySymbol}50,130
              </Text>
            </View>
          )}
        />
      </View>

      <Spacer height={heightPixel(30)} />

      {/* Category List */}
      {categories.map((category, index) => (
        <View
          key={category.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: heightPixel(20),
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: widthPixel(15),
              flex: 1,
            }}>
            <View
              style={{
                backgroundColor: color.primary,
                borderRadius: 50,
                padding: 10,
                width: widthPixel(34),
                height: widthPixel(34),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Image
                source={category.icon}
                style={{
                  width: widthPixel(18),
                  height: heightPixel(18),
                  resizeMode: 'contain',
                  tintColor: color.black,
                }}
              />
            </View>
            <Text size={17} variant="medium" color={color.black}>
              {category.name}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: widthPixel(45),
            }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: widthPixel(5),
              }}>
              <Text size={17} variant="medium" color={color.black}>
                {category.percentage}
              </Text>
              <Feather
                name={category.isUp ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={category.isUp ? '#FF6B6B' : '#4CAF50'}
              />
            </View>
            <Text
              size={17}
              variant="medium"
              color={color.primary}
              style={{minWidth: widthPixel(80), textAlign: 'right'}}>
              {category.amount}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderComparisonView = () => (
    <View>
      {/* Dropdown Filters */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: widthPixel(15),
          marginBottom: heightPixel(20),
        }}>
        <View style={{flex: 1}}>
          <Text
            size={12}
            variant="regular"
            color={color.black}
            style={{marginBottom: 8}}>
            Timeline
          </Text>
          <TouchableOpacity
            onPress={() => setShowTimelineSheet(true)}
            style={{
              backgroundColor: isDark ? color.inputField : color.newbg,
              borderRadius: widthPixel(12),
              paddingVertical: heightPixel(12),
              paddingHorizontal: widthPixel(15),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text size={14} variant="medium" color={color.black}>
              {selectedTimeline}
            </Text>
            <Image
              source={appImages.ArrowDown}
              style={{
                width: widthPixel(12),
                height: heightPixel(12),
                resizeMode: 'contain',
                tintColor: color.black,
              }}
            />
          </TouchableOpacity>
        </View>

        <View style={{flex: 1}}>
          <Text
            size={12}
            variant="regular"
            color={color.black}
            style={{marginBottom: 8}}>
            Compare
          </Text>
          <TouchableOpacity
            onPress={() => setShowCompareSheet(true)}
            style={{
              backgroundColor: isDark ? color.inputField : color.newbg,
              borderRadius: widthPixel(12),
              paddingVertical: heightPixel(12),
              paddingHorizontal: widthPixel(15),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <Text size={14} variant="medium" color={color.black}>
              {selectedCompare}
            </Text>
            <Image
              source={appImages.ArrowDown}
              style={{
                width: widthPixel(12),
                height: heightPixel(12),
                resizeMode: 'contain',
                tintColor: color.black,
              }}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Spacer height={30} />

      {/* Line Chart */}
      <View>
        <LineChart
          data={lineData1}
          data2={lineData2}
          height={heightPixel(260)}
          width={widthPixel(450)}
          spacing={widthPixel(55)}
          initialSpacing={widthPixel(20)}
          endSpacing={widthPixel(10)}
          color1="#F4A623"
          color2={chartColor2}
          thickness={2.5}
          dataPointsColor1="#F4A623"
          dataPointsColor2={chartColor2}
          dataPointsRadius={5}
          hideRules={false}
          rulesColor={chartRulesColor}
          rulesType="solid"
          hideYAxisText={false}
          yAxisColor="transparent"
          yAxisThickness={0}
          yAxisTextStyle={{
            color: color.black,
            fontSize: 13,
            fontFamily: 'regular',
          }}
          yAxisLabelPrefix={currencySymbol}
          yAxisLabelWidth={40}
          noOfSections={3}
          maxValue={750}
          stepValue={250}
          xAxisThickness={1}
          xAxisColor={chartAxisColor}
          showVerticalLines={false}
          xAxisLabelTexts={['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN']}
          xAxisLabelTextStyle={{
            color: color.black,
            fontSize: 12,
            fontFamily: 'medium',
          }}
          curved={true}
          textColor1="#F4A623"
          textColor2={chartColor2}
          textFontSize={13}
          textShiftY={-18}
          textShiftX={-18}
        />
      </View>
    </View>
  );

  return (
    <Wrapper>
      <Header
        canGoBack={true}
        title="Insights"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
      />
      <Spacer height={heightPixel(20)} />
      <IconToggleButton
        options={toggleOptions}
        selectedIndex={selectedTabIndex}
        onToggle={setSelectedTabIndex}
      />
      <Spacer height={heightPixel(30)} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: widthPixel(8),
        }}>
        <Image
          source={appImages.ArrowUp}
          tintColor={color.black}
          style={{
            width: widthPixel(14),
            height: heightPixel(14),
            resizeMode: 'contain',
          }}
        />
        <Text size={12} variant="regular" color={color.black}>
          Total Spending in 2024
        </Text>
      </View>
      <Text size={24} variant="medium" color={color.black}>
        {currencySymbol}50,130.67
      </Text>
      <Spacer height={heightPixel(40)} />

      {/* Conditional Rendering based on selected tab */}
      {selectedTabIndex === 0 ? renderBreakdownView() : renderComparisonView()}

      {/* Timeline Bottom Sheet */}
      <BottomSheet
        visible={showTimelineSheet}
        onClose={() => setShowTimelineSheet(false)}
        title="Timeline"
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        <View style={{marginBottom: heightPixel(40)}}>
          {timelineOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setSelectedTimeline(option);
                setShowTimelineSheet(false);
              }}
              style={{
                backgroundColor:
                  selectedTimeline === option
                    ? color.primary
                    : isDark
                      ? color.inputField
                      : color.white,
                borderRadius: widthPixel(12),
                paddingVertical: heightPixel(12),
                paddingHorizontal: widthPixel(20),
              }}>
              <Text size={16} variant="regular" color={color.black}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

      {/* Compare Bottom Sheet */}
      <BottomSheet
        visible={showCompareSheet}
        onClose={() => setShowCompareSheet(false)}
        title="Compare"
        backgroundColor={color.inputField}>
        <View style={{marginBottom: heightPixel(30)}}>
          {compareOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setSelectedCompare(option);
                setShowCompareSheet(false);
              }}
              style={{
                backgroundColor:
                  selectedCompare === option
                    ? color.primary
                    : isDark
                      ? color.inputField
                      : color.white,
                borderRadius: widthPixel(12),
                paddingVertical: heightPixel(12),
                paddingHorizontal: widthPixel(20),
              }}>
              <Text size={16} variant="regular" color={color.black}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
    </Wrapper>
  );
};

export default Insights;
