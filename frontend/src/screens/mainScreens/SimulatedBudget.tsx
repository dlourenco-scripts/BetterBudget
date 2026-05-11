import React, {useState} from 'react';
import {Image, StyleSheet, TouchableOpacity, View} from 'react-native';
import {router} from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Feather} from '@expo/vector-icons';
import {Button, FullFlex, Header, Spacer, Text, Wrapper} from '@/components';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

interface Expense {
  id: string;
  title: string;
  value: string;
  subText: string;
}

const SimulatedBudget = () => {
  const color = useThemeColor();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isDark = color.bg === '#171A21';
  const [expenses] = useState<Expense[]>([]);

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
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map(e => e.id)));
    }
  };

  const handleEmailAction = () => {
    // Return to previous content by exiting selection mode
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteAction = () => {
    // Delete selected expenses and return to previous content
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  return (
    <Wrapper keyboardProps={{stickyHeaderIndices: [0], bounces: false}}>
      <Header
        canGoBack={isSelectionMode}
        onBackPress={() => {
          setIsSelectionMode(false);
          setSelectedIds(new Set());
        }}
        title="Simulated Budget"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        leftComponent={
          !isSelectionMode ? (
            <TouchableOpacity
              activeOpacity={0.6}
              style={{
                borderRadius: 50,
                backgroundColor: color.tabBackground,
                padding: 5,
              }}
              onPress={() => router.back()}>
              <Feather name="chevron-left" size={24} color={color.tabicon} />
            </TouchableOpacity>
          ) : undefined
        }
        rightComponent={
          !isSelectionMode ? (
            <TouchableOpacity
              activeOpacity={0.6}
              style={{
                borderRadius: 50,
                backgroundColor: color.tabBackground,
                padding: 5,
              }}
              onPress={() =>
                router.navigate('/auth/RecurringExpenses?fromSimulated=true')
              }>
              <Feather name="plus" size={22} color={color.tabicon} />
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
                  selectedIds.size === expenses.length && expenses.length > 0
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
              onPress={() =>
                router.navigate(
                  '/auth/RecurringExpenses?fromSimulated=true&isEdit=true',
                )
              }
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

      <Spacer height={heightPixel(30)} />
      <GradientExpandableCard
        title="Monthly Income"
        value="0.00"
        titleStyle={{
          fontSize: fontPixel(15),
          fontWeight: 'medium',
        }}
        valueStyle={{
          fontSize: fontPixel(15),
          fontWeight: 'medium',
        }}
      />
      <Spacer height={heightPixel(30)} />
      <Text size={fontPixel(15)} variant="medium" color={color.black}>
        Expenses
      </Text>
      <Spacer height={heightPixel(5)} />

      {expenses.length > 0 ? (
        expenses.map(expense => (
          <View
            key={expense.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              marginVertical: 5,
            }}>
            {isSelectionMode && (
              <TouchableOpacity
                onPress={() => toggleSelection(expense.id)}
                style={{
                  borderRadius: 50,
                  backgroundColor: color.inputField,
                  padding: 10,
                }}>
                <Image
                  source={
                    selectedIds.has(expense.id)
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
                title={expense.title}
                value={expense.value}
                subText={expense.subText}
                titleStyle={{
                  fontSize: fontPixel(15),
                  fontWeight: 'medium',
                }}
                valueStyle={{
                  fontSize: fontPixel(15),
                  fontWeight: 'medium',
                }}
                onLongPress={() => handleLongPress(expense.id)}
                onPress={() => handleCardPress(expense.id)}
              />
            </View>
          </View>
        ))
      ) : (
        <Text size={14} color={color.tabicon}>
          No simulated expenses yet.
        </Text>
      )}

      <FullFlex />
      {!isSelectionMode && (
        <Button
          title="Simulated Budget"
          onPress={() => router.navigate('/mainScreens/SimulateBudget')}
        />
      )}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default SimulatedBudget;
