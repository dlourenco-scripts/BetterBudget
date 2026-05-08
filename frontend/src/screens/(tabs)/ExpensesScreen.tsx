import React, {useState} from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {router} from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Feather} from '@expo/vector-icons';
import {BottomSheet, Header, Spacer, Text, Wrapper} from '@/components';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

interface ExpenseItem {
  id: string;
  title: string;
  value: string;
  subText: string;
}

const ExpensesScreen = () => {
  const color = useThemeColor();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const isDark = color.bg === '#171A21';
  const [showAddExpenseSheet, setShowAddExpenseSheet] =
    useState<boolean>(false);

  const [expenses] = useState<ExpenseItem[]>([
    {id: '1', title: 'Rent', value: '26,000', subText: 'Dec-23'},
    {id: '2', title: 'Maintenance', value: '26,000', subText: 'Dec-23'},
    {id: '3', title: 'Comcast', value: '26,000', subText: 'Dec-23'},
  ]);

  const [debts] = useState<ExpenseItem[]>([
    {id: '4', title: 'Loan', value: '26,000', subText: 'Dec-23'},
    {id: '5', title: 'Student Loan', value: '26,000', subText: 'Dec-23'},
    {id: '6', title: 'Credit Card', value: '26,000', subText: 'Dec-23'},
  ]);

  const allItems = [...expenses, ...debts];

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds(new Set([id]));
    }
  };

  const handleCardPress = (id: string) => {
    if (isSelectionMode) {
      toggleSelection(id);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === allItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allItems.map(e => e.id)));
    }
  };

  const handleDeleteAction = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const renderItem = (item: ExpenseItem) => (
    <View
      key={item.id}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginVertical: 5,
      }}>
      {isSelectionMode && (
        <TouchableOpacity
          onPress={() => toggleSelection(item.id)}
          style={{
            borderRadius: 50,
            backgroundColor: color.inputField,
            padding: 10,
          }}>
          <Image
            source={
              selectedIds.has(item.id)
                ? appImages.SelectBox
                : appImages.UnSelectBox
            }
            tintColor={color.primary}
            style={{
              width: widthPixel(18),
              height: heightPixel(18),
              resizeMode: 'contain',
            }}
          />
        </TouchableOpacity>
      )}
      <View style={{flex: 1}}>
        <GradientExpandableCard
          title={item.title}
          value={item.value}
          subText={item.subText}
          titleStyle={{
            fontSize: fontPixel(15),
            fontWeight: 'medium',
          }}
          valueStyle={{
            fontSize: fontPixel(15),
            fontWeight: 'medium',
          }}
          onLongPress={() => handleLongPress(item.id)}
          onPress={() => handleCardPress(item.id)}
        />
      </View>
    </View>
  );

  return (
    <Wrapper keyboardProps={{stickyHeaderIndices: [0], bounces: false}}>
      <Header
        title="Expenses"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={isSelectionMode}
        onBackPress={() => {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
        }}
        leftComponent={undefined}
        rightComponent={
          !isSelectionMode ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                backgroundColor: color.iconCardBg,
                borderRadius: 50,
                padding: 8,
              }}
              onPress={() => setShowAddExpenseSheet(true)}>
              <Image
                source={appImages.AddImg}
                style={{
                  height: heightPixel(20),
                  width: widthPixel(20),
                  resizeMode: 'contain',
                  tintColor: color.tabicon,
                }}
              />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Selection Mode Header */}
      {isSelectionMode && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 10,
            marginBottom: 10,
          }}>
          <TouchableOpacity
            onPress={handleSelectAll}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}>
            <View
              style={{
                backgroundColor: isDark ? color.black : color.inputField,
                padding: 10,
                borderRadius: 50,
              }}>
              <Image
                source={
                  selectedIds.size === allItems.length && allItems.length > 0
                    ? appImages.SelectBox
                    : appImages.UnSelectBox
                }
                tintColor={color.primary}
                style={{
                  width: widthPixel(18),
                  height: heightPixel(18),
                  resizeMode: 'contain',
                }}
              />
            </View>
            <Text
              size={14}
              variant="medium"
              color={color.tabicon}
              style={{textDecorationLine: 'underline'}}>
              Select All
            </Text>
          </TouchableOpacity>

          <View style={{flexDirection: 'row', gap: 15}}>
            <TouchableOpacity
              onPress={() => {
                router.navigate(
                  '/auth/RecurringExpenses?fromExpenses=true&isEdit=true',
                );
              }}
              style={{
                backgroundColor: color.notificationbg,
                borderRadius: 50,
                padding: 7,
              }}>
              <Feather name="edit" size={20} color={color.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDeleteAction}
              style={{
                backgroundColor: color.notificationbg,
                borderRadius: 50,
                padding: 7,
              }}>
              <Ionicons name="trash-outline" size={20} color={color.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text size={15} variant="medium" color={color.black}>
          Expenses
        </Text>
        <Spacer height={10} />
        {expenses.map(renderItem)}

        <Spacer height={20} />
        <Text size={15} variant="medium" color={color.black}>
          Debt
        </Text>
        <Spacer height={10} />
        {debts.map(renderItem)}
        <Spacer height={50} />
      </ScrollView>

      <BottomSheet
        visible={showAddExpenseSheet}
        onClose={() => setShowAddExpenseSheet(false)}
        title="What do you want to add?"
        backgroundColor={color.inputField}>
        <Spacer height={20} />
        <View
          style={{
            marginBottom: heightPixel(60),
          }}>
          <TouchableOpacity
            style={{
              backgroundColor: color.primary,
              padding: 8,
              borderRadius: 6,
              paddingHorizontal: widthPixel(15),
            }}
            activeOpacity={0.8}
            onPress={() => {
              setShowAddExpenseSheet(false);
              router.navigate('/auth/RecurringExpenses?fromHome=true');
            }}>
            <Text size={16} variant="regular" color={color.black}>
              Recuring Expense
            </Text>
          </TouchableOpacity>
          <Spacer height={10} />
          <TouchableOpacity
            style={{
              backgroundColor: 'transparent',
              padding: 8,
              borderRadius: 6,
              paddingHorizontal: widthPixel(15),
            }}
            activeOpacity={0.8}
            onPress={() => {
              setShowAddExpenseSheet(false);
              router.navigate('/auth/Debt?fromHome=true');
            }}>
            <Text size={16} variant="regular" color={color.black}>
              Debt
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </Wrapper>
  );
};

export default ExpensesScreen;

const styles = StyleSheet.create({});
