import React, {useState} from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import {router} from 'expo-router';
import {AntDesign, Entypo, Feather} from '@expo/vector-icons';
import {
  BottomSheet,
  Button,
  CustomModal,
  InfoTooltip,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import CustomHeader, {Budget} from '@/components/others/CustomHeader';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import ProgressBar from '@/components/others/ProgressBar';
import WalkthroughTooltip from '@/components/others/WalkthroughTooltip';
import {appImages} from '@/constants/assets';
import {colors} from '@/constants/colors';
import {useCurrency} from '@/context/CurrencyProvider';
import {useColorScheme} from '@/hooks/useColorScheme';
import {useThemeColor} from '@/hooks/useThemeColor';
import {heightPixel, widthPixel, wp} from '@/services/responsive';

const HomeScreen = () => {
  const color = useThemeColor();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const {currencySymbol} = useCurrency();

  // Budget data - in real app, this would come from state/API
  const [budgets, setBudgets] = useState<Budget[]>([
    {id: '1', name: 'Home Budget'},
    {id: '2', name: 'Office Budget'},
  ]);
  // Primary budget ID - auto-select first one if only one budget exists
  const [primaryBudgetId, setPrimaryBudgetId] = useState<string>(
    budgets.length === 1 ? budgets[0].id : '1',
  );

  const handlePrimaryBudgetChange = (budgetId: string) => {
    setPrimaryBudgetId(budgetId);
  };

  // Custom colors for specific bottom sheets in dark mode
  const customSheetBg = isDarkMode ? '#171A21' : undefined;
  const customInputBg = isDarkMode ? '#0F1115' : undefined;
  const [date, setDate] = useState(dayjs('2024-12-15'));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [showAddbudgetList, setShowAddbudgetList] = useState(false);
  const [showExpenseInfo, setShowExpenseInfo] = useState(false);
  const [showCarryOverSheet, setShowCarryOverSheet] = useState(false);
  const [showtoltip, setShowtoltip] = useState(false);
  const [showOnetimeExpensesSheet, setShowOnetimeExpensesSheet] =
    useState(false);

  const ExpandedcardData = [
    {
      id: '1',
      title: 'Debit Card',
      value: '26,000',
      items: [
        {
          date: 'Dec–23',
          label: 'Furniture',
          tag: 'One Time',
          tagBg: colors.light.tabicon,
          tagColor: colors.light.primary,
          amount: '1880.51',
        },
        {
          date: 'Dec–23',
          label: 'Maintenance Work',
          tag: 'Variable',
          tagBg: colors.light.white,
          tagColor: colors.light.tabicon,
          amount: '18380.51',
        },
        {
          date: 'Dec–23',
          label: 'Gas',
          tag: 'Variable',
          tagBg: colors.light.white,
          tagColor: colors.light.tabicon,
          amount: '18380.51',
        },
      ],
    },
    {
      id: '2',
      title: 'Credit Card',
      value: '26,000',
      items: [
        {
          date: 'Dec–23',
          label: 'Furniture',
          tag: 'One Time',
          tagBg: colors.light.tabicon,
          tagColor: colors.light.primary,
          amount: '1880.51',
        },
        {
          date: 'Dec–23',
          label: 'Maintenance Work',
          tag: 'Variable',
          tagBg: colors.light.white,
          tagColor: colors.light.tabicon,
          amount: '18380.51',
        },
        {
          date: 'Dec–23',
          label: 'Gas',
          tag: 'Variable',
          tagBg: colors.light.white,
          tagColor: colors.light.tabicon,
          amount: '18380.51',
        },
      ],
    },
    {
      id: 3,
      title: 'Bank Account',
      value: '26,000',
      items: [
        {
          date: 'Dec–23',
          label: 'Furniture',
          tag: 'One Time',
          tagBg: colors.light.tabicon,
          tagColor: colors.light.primary,
          amount: '1880.51',
        },
        {
          date: 'Dec–23',
          label: 'Maintenance Work',
          tag: 'Variable',
          tagBg: colors.light.white,
          tagColor: colors.light.tabicon,
          amount: '18380.51',
        },
        {
          date: 'Dec–23',
          label: 'Gas',
          tag: 'Variable',
          tagBg: colors.light.white,
          tagColor: colors.light.tabicon,
          amount: '18380.51',
        },
      ],
    },
  ];
  const NewBudgetData = [
    {
      id: 1,
      title: 'Income',
      onPress: () => {
        router.push({
          pathname: '/auth/AddIncome',
          params: {fromHome: 'true'},
        });
      },
    },
    {
      id: 2,
      title: 'One-Time Expense',
      onPress: () => {
        setShowOnetimeExpensesSheet(true);
      },
    },
    {
      id: 3,
      title: 'Recurring Expense',
      onPress: () => {
        router.push({
          pathname: '/auth/RecurringExpenses',
          params: {fromHome: 'true'},
        });
      },
    },
    {
      id: 4,
      title: 'Debt',
      onPress: () => {
        router.push({
          pathname: '/auth/Debt',
          params: {fromHome: 'true'},
        });
      },
    },
  ];

  const goPrev = () => {
    setDate(prev => prev.subtract(1, 'month'));
  };

  const goNext = () => {
    setDate(prev => prev.add(1, 'month'));
  };

  const handleDeletePress = () => {
    setShowDeleteModal(true);
  };

  const handleAddBudgetPress = () => {
    setShowAddBudgetModal(true);
  };

  const handleDeleteConfirm = () => {
    console.log('Budget deleted');
    setShowDeleteModal(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const handleCopyExpenses = () => {
    console.log('Copy expenses');
    setShowAddBudgetModal(false);
    router.push({
      pathname: '/auth/CreateBudget',
      params: {
        fromHome: 'true',
        fromBudgetCreation: 'true',
        fromCopyExpenses: 'true',
      },
    });
  };

  const handleCreateNew = () => {
    console.log('Create new budget');
    setShowAddBudgetModal(false);
    router.push({
      pathname: '/auth/CreateBudget',
      params: {fromHome: 'true', fromBudgetCreation: 'true'},
    });
  };

  return (
    <>
      <Wrapper keyboardProps={{stickyHeaderIndices: [0], bounces: false}}>
        <View style={{width: '100%', backgroundColor: color.bg}}>
          <Spacer
            height={20}
            style={{backgroundColor: color.bg}}
            width={wp(100)}
          />
          <CustomHeader
            onDeletePress={handleDeletePress}
            onAddBudgetPress={handleAddBudgetPress}
            budgets={budgets}
            primaryBudgetId={primaryBudgetId}
            onPrimaryBudgetChange={handlePrimaryBudgetChange}
          />
          <Spacer
            height={20}
            style={{backgroundColor: color.bg}}
            width={wp(100)}
          />
        </View>
        <WalkthroughTooltip
          stepNumber={1}
          title="To Save"
          content="The amount you've chosen to set aside for savings this cycle. It adds to your total savings and is deducted from your remaining balance."
          placement="bottom">
          <View
            style={{
              backgroundColor: color.secondaryheader,
              borderWidth: 1,
              borderColor: color.primary,
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 15,
              width: '100%',
            }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
              }}>
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}>
                  <Image
                    source={appImages.Arrowimg}
                    style={{
                      height: heightPixel(15),
                      width: widthPixel(15),
                      resizeMode: 'contain',
                      tintColor: color.tabicon,
                    }}
                  />
                  <Text size={14} color={color.black} variant="semibold">
                    To Save
                  </Text>
                </View>
                <Spacer height={10} />
                <Text size={18} variant="medium" color={color.primary}>
                  {currencySymbol}500.0
                </Text>
              </View>
              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                  }}>
                  <Image
                    source={appImages.ArrowDownimg}
                    style={{
                      height: heightPixel(15),
                      width: widthPixel(15),
                      resizeMode: 'contain',
                      tintColor: color.tabicon,
                    }}
                  />
                  <Text size={14} color={color.black} variant="medium">
                    Total Savings
                  </Text>
                </View>
                <Spacer height={10} />
                <Text
                  size={18}
                  variant="medium"
                  color={color.black}
                  style={{textAlign: 'right'}}>
                  {currencySymbol}10,000
                </Text>
              </View>
            </View>
            <Spacer height={20} />
            <ProgressBar />
          </View>
        </WalkthroughTooltip>

        <Spacer height={20} />
        <View style={styles.row}>
          <Text size={16} color={color.black} variant="semibold">
            Pay Date
          </Text>
          <TouchableOpacity onPress={goPrev} style={styles.arrowBtn}>
            <AntDesign name="left" size={14} color={color.dateText} />
          </TouchableOpacity>
          <Text style={styles.dateText}>{date.format('MMMM, DD, YYYY')}</Text>
          <TouchableOpacity onPress={goNext} style={styles.arrowBtn}>
            <AntDesign name="right" size={14} color={color.dateText} />
          </TouchableOpacity>
        </View>
        <Spacer height={20} />
        <WalkthroughTooltip
          stepNumber={2}
          title="Total Payments"
          content="Your total expenses for this cycle."
          placement="top">
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: color.walletbg,
              padding: 15,
              borderRadius: 10,
              width: '100%',
            }}>
            <View
              style={{
                alignItems: 'center',
                gap: 5,
              }}>
              <Image
                source={appImages.Paymentimg}
                style={{
                  height: heightPixel(33),
                  width: widthPixel(36),
                  resizeMode: 'contain',
                  tintColor: color.white,
                }}
              />
              <Text size={18} variant="semibold" color={color.white}>
                {currencySymbol}4.000.00
              </Text>
              <Text size={11} color={color.white}>
                Total Payments
              </Text>
            </View>

            <View
              style={{
                width: 1,
                height: 80,
                backgroundColor: color.white,
                opacity: 0.3,
              }}
            />

            <WalkthroughTooltip
              stepNumber={3}
              title="Carry Over"
              content="Carry Over lets you roll unused money from this budget into the next, so you can cover future expenses or keep a cushion."
              placement="top">
              <View
                style={{
                  alignItems: 'center',
                  gap: 5,
                }}>
                <Image
                  source={appImages.CarryOverimg}
                  style={{
                    height: heightPixel(33),
                    width: widthPixel(36),
                    resizeMode: 'contain',
                    tintColor: color.white,
                  }}
                />
                <Text size={18} variant="semibold" color={color.white}>
                  {currencySymbol}0
                </Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={{
                    borderRadius: 20,
                    backgroundColor: color.white,
                    alignSelf: 'flex-start',
                    padding: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => setShowCarryOverSheet(true)}>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text size={10} variant="medium" color={color.primary}>
                      Carry Over
                    </Text>
                    <Entypo
                      name="chevron-right"
                      size={13}
                      color={color.primary}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </WalkthroughTooltip>

            <View
              style={{
                width: 1,
                height: 80,
                backgroundColor: color.white,
                opacity: 0.3,
              }}
            />

            <WalkthroughTooltip
              stepNumber={4}
              title="Remaining"
              content="What's left after subtracting your expenses from your income. This is the amount you still have available."
              placement="top">
              <View
                style={{
                  alignItems: 'center',
                  gap: 5,
                }}>
                <Image
                  source={appImages.Walletimg}
                  style={{
                    height: heightPixel(33),
                    width: widthPixel(36),
                    resizeMode: 'contain',
                    tintColor: color.white,
                  }}
                />
                <Text size={18} variant="semibold" color={color.white}>
                  {currencySymbol}100
                </Text>
                <Text size={11} color={color.white}>
                  Total Remaining
                </Text>
              </View>
            </WalkthroughTooltip>
          </View>
        </WalkthroughTooltip>
        <Spacer height={20} />
        <WalkthroughTooltip
          stepNumber={5}
          title="Income"
          content="Your total income for this cycle."
          placement="top">
          <View
            style={{
              width: '100%',
            }}>
            <GradientExpandableCard title="Income" value="20,000" />
          </View>
        </WalkthroughTooltip>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}>
          <Text size={15} variant="medium" color={color.black}>
            Expenses
          </Text>
          <TouchableOpacity onPress={() => setShowExpenseInfo(true)}>
            <Image
              source={appImages.Aboutimg}
              style={{
                height: heightPixel(18),
                width: widthPixel(18),
                resizeMode: 'contain',
              }}
            />
          </TouchableOpacity>
        </View>
        <FlatList
          scrollEnabled={false}
          data={ExpandedcardData}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{paddingBottom: 30}}
          renderItem={({item}) => (
            <GradientExpandableCard
              title={item.title}
              value={item.value}
              expandedGradientColors={{default: ['#FFD479', '#FFAD3D']}}>
              <View style={{gap: 10}}>
                {item.items.map((row, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                    }}>
                    <Text size={11} color="#000">
                      {row.date}
                    </Text>
                    <Text size={12} color="#000" variant="medium">
                      {row.label}
                    </Text>
                    <View
                      style={{
                        backgroundColor: row.tagBg,
                        borderRadius: 20,
                        paddingHorizontal: 5,
                        paddingVertical: 2,
                        alignSelf: 'flex-start',
                      }}>
                      <Text size={8} variant="medium" color={row.tagColor}>
                        {row.tag}
                      </Text>
                    </View>
                    <View style={{flex: 1}} />
                    <Text size={12} color="#000" variant="medium">
                      {currencySymbol}
                      {row.amount}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={{
                  marginTop: 15,
                  padding: 3,
                  backgroundColor: '#FFF3DE',
                  borderRadius: 5,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => router.navigate('/mainScreens/DebitCard')}
                activeOpacity={0.8}>
                <Text variant="medium" size={14} color={colors.light.tabicon}>
                  View All
                </Text>
              </TouchableOpacity>
            </GradientExpandableCard>
          )}
        />
        <Spacer height={10} />
        <Text size={15} variant="medium" color={color.black}>
          Debt
        </Text>
        <GradientExpandableCard title="Loan" value="20,000" subText="Dec-23" />
      </Wrapper>

      {/* Add Budget Modal */}
      <TouchableOpacity
        activeOpacity={0.9}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 100,
          backgroundColor: color.primary,
          alignSelf: 'flex-end',
          padding: 15,
          position: 'absolute',
          bottom: 20,
          right: 20,
          borderWidth: 1,
          borderColor: isDarkMode ? '#000' : color.white,
        }}
        onPress={() => setShowAddbudgetList(true)}>
        <Image
          source={appImages.Plusimg}
          tintColor={isDarkMode ? '#000' : color.white}
          style={{
            height: heightPixel(20),
            width: widthPixel(20),
            resizeMode: 'contain',
          }}
        />
      </TouchableOpacity>

      {/* Delete Budget Modal */}
      <CustomModal
        visible={showDeleteModal}
        onClose={handleDeleteCancel}
        title="Delete Budget"
        message="Are you sure you want to delete the budget. You will not be able to restore the deleted budget again"
        primaryButtonText="Cancel"
        secondaryButtonText="Delete"
        onPrimaryPress={handleDeleteCancel}
        onSecondaryPress={handleDeleteConfirm}
      />

      {/* Add New Budget / Copy Expenses Modal */}
      <CustomModal
        visible={showAddBudgetModal}
        onClose={() => setShowAddBudgetModal(false)}
        title="Do you want to copy current Expenses?"
        message="This will bring all recurring expenses and any debt from your current budget into the new one. You can edit, add, or remove anything after"
        primaryButtonText="Copy Expenses"
        secondaryButtonText="Create New"
        onPrimaryPress={handleCopyExpenses}
        onSecondaryPress={handleCreateNew}
      />
      <BottomSheet
        visible={showAddbudgetList}
        onClose={() => setShowAddbudgetList(false)}
        title="What do you want to add?"
        hideTitleLine={false}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        <View style={{gap: widthPixel(15), marginBottom: heightPixel(30)}}>
          {NewBudgetData.map(item => (
            <TouchableOpacity
              key={item.id}
              style={{
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
                setShowAddbudgetList(false);
                item.onPress();
              }}>
              <Text variant="regular" size={16} color={color.black}>
                {item.title}
              </Text>
              <Feather name="chevron-right" size={22} color={color.walletbg} />
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>
      <BottomSheet
        visible={showOnetimeExpensesSheet}
        onClose={() => setShowOnetimeExpensesSheet(false)}
        title={'One-Time Expense'}
        maxHeight={550}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(12)} />
        <TextInput
          title="Expense Name"
          placeholder="Enter Expense Name"
          placeholderTextColor={color.tabicon}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
          // onChangeText={setCurrentSavingsAmount}
        />
        <Spacer height={heightPixel(12)} />
        <TextInput
          title="Amount"
          placeholder="0"
          placeholderTextColor={color.tabicon}
          inputContainerStyle={
            customInputBg ? {backgroundColor: customInputBg} : undefined
          }
          // onChangeText={setCurrentSavingsAmount}
          keyboardType="numeric"
          useCurrencyIcon={true}
        />
        <Spacer height={heightPixel(40)} />
        <Button
          title="Add"
          onPress={() => {
            // Handle update logic
            setShowOnetimeExpensesSheet(false);
          }}
        />
        <Spacer height={heightPixel(30)} />
      </BottomSheet>
      <BottomSheet
        visible={showCarryOverSheet}
        onClose={() => setShowCarryOverSheet(false)}
        title=""
        maxHeight={450}
        hideTitleLine={true}
        backgroundColor={color.inputField}>
        <Spacer height={heightPixel(20)} />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: widthPixel(10),
          }}>
          <Text size={22} variant="medium">
            Carry Over
          </Text>
          <TouchableOpacity onPress={() => setShowtoltip(true)}>
            <Image
              source={appImages.Aboutimg}
              style={{
                width: widthPixel(20),
                height: heightPixel(20),
                resizeMode: 'contain',
              }}
            />
          </TouchableOpacity>
        </View>
        <Spacer height={heightPixel(20)} />
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
        <Spacer height={heightPixel(20)} />
        <Button
          title="Update"
          onPress={() => {
            // Handle update logic
            setShowCarryOverSheet(false);
          }}
        />
        <Spacer height={heightPixel(40)} />
        <InfoTooltip
          visible={showtoltip}
          title="Carry Over :"
          content="Money held back from this budget cycle to cover next cycle’s expenses. The amount is deducted from your current available balance and transferred to the next cycle."
          onClose={() => setShowtoltip(false)}
          position="bottom-middle"
        />
      </BottomSheet>
      <InfoTooltip
        visible={showExpenseInfo}
        title="Expenses:"
        content="Grouped by payment method, shows all expenses paid from each source."
        onClose={() => setShowExpenseInfo(false)}
        position="bottom"
      />
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'center',
  },
  arrowBtn: {
    padding: 5,
  },
  dateText: {
    fontSize: 16,
    color: colors.light.dateText,
    fontWeight: '600',
    marginHorizontal: 12,
  },
});

export default HomeScreen;
