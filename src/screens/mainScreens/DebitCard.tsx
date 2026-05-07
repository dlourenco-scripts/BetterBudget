import React, {useState} from 'react';
import {FlatList, Image, TouchableOpacity, View} from 'react-native';
import {Button, FullFlex, Header, Spacer, Text, Wrapper} from '@/components';
import GradientExpandableCard from '@/components/others/GradientExpandableButton';
import WalkthroughTooltip from '@/components/others/WalkthroughTooltip';
import {appImages} from '@/constants/assets';
import {useCurrency} from '@/context/CurrencyProvider';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

interface ExpenseItem {
  id: string;
  date: string;
  title: string;
  value: string;
  badge: string;
  badgeColor: string;
  badgeTextColor?: string;
  showCheckbox?: boolean;
}

const MOCK_DATA: ExpenseItem[] = [
  {
    id: '1',
    date: 'Dec-23',
    title: 'Gas',
    value: '360.96',
    badge: 'Variable',
    badgeColor: '#FFF3E0',
  },
  {
    id: '2',
    date: 'Dec-23',
    title: 'Gas',
    value: '360.96',
    badge: 'Variable',
    badgeColor: '#FFF3E0',
  },
  {
    id: '3',
    date: 'Dec-23',
    title: 'Gas',
    value: '360.96',
    badge: 'One-Time',
    badgeColor: '#F5E6D3',
    badgeTextColor: '#945628',
  },
  {
    id: '4',
    date: 'Dec-23',
    title: 'Gas',
    value: '360.96',
    badge: 'Variable',
    badgeColor: '#FFF3E0',
  },
  {
    id: '5',
    date: 'Dec-23',
    title: 'Gas',
    value: '360.96',
    badge: 'Variable',
    badgeColor: '#FFF3E0',
  },
  {
    id: '6',
    date: 'Dec-23',
    title: 'Gas',
    value: '360.96',
    badge: 'Variable',
    badgeColor: '#FFF3E0',
  },
  {
    id: '7',
    date: 'Dec-23',
    title: 'Gas',
    value: '360.96',
    badge: 'Variable',
    badgeColor: '#FFF3E0',
  },
  {
    id: '8',
    date: 'Dec-23',
    title: 'Gas',
    value: '360.96',
    badge: 'Variable',
    badgeColor: '#FFF3E0',
    showCheckbox: true,
  },
  {
    id: '9',
    date: 'Dec-23',
    title: 'Gas',
    value: '360.96',
    badge: 'Variable',
    badgeColor: '#FFF3E0',
    showCheckbox: true,
  },
];

const DebitCard = () => {
  const color = useThemeColor();
  const {currencySymbol} = useCurrency();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const toggleSelection = (id: string) => {
    setSelectedItem(prev => {
      if (prev === id) {
        return null;
      } else {
        return id;
      }
    });
  };

  const renderItem = ({item}: {item: ExpenseItem}) => {
    const isSelected = selectedItem === item.id;

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: widthPixel(10),
        }}>
        {item.showCheckbox && (
          <TouchableOpacity
            onPress={() => toggleSelection(item.id)}
            activeOpacity={0.7}>
            <Image
              source={
                isSelected
                  ? appImages.EllipseSelected
                  : appImages.EllipseUnselected
              }
              style={{
                width: 24,
                height: 24,
              }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
        <View style={{flex: 1}}>
          <GradientExpandableCard
            title={item.title}
            value={item.value}
            subText={item.date}
            badge={item.badge}
            badgeColor={item.badgeColor}
            badgeTextColor={item.badgeTextColor}
            containerStyle={{
              marginVertical: 5,
            }}
          />
        </View>
      </View>
    );
  };

  return (
    <Wrapper>
      <Header
        title="Debit Card"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={true}
      />

      <Spacer height={heightPixel(25)} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: widthPixel(10),
        }}>
        <Image
          source={appImages.ArrowUp}
          style={{height: 15, width: 15}}
          resizeMode="contain"
          tintColor={color.black}
        />
        <Text size={12} variant="regular" color={color.black}>
          This Cycle's Spending
        </Text>
        <Spacer height={heightPixel(10)} />
        <Text size={24} variant="medium" color={color.black}>
          {currencySymbol}50,130.67
        </Text>
      </View>
      <Spacer height={heightPixel(20)} />
      <FlatList
        data={MOCK_DATA}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: heightPixel(20),
        }}
      />
      <FullFlex />
      <View
        style={{
          flexDirection: 'row',
          gap: widthPixel(10),
          paddingBottom: heightPixel(10),
          paddingHorizontal: widthPixel(10),
        }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: heightPixel(15),
            borderRadius: 100,
            borderWidth: 1,
            borderColor: color.primary,
            backgroundColor: 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => {
            // Handle delete action
          }}>
          <Text size={17} variant="semibold" color={color.primary}>
            Delete
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: heightPixel(15),
            borderRadius: 100,
            backgroundColor: color.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => {
            // Handle edit action
          }}>
          <Text size={17} variant="semibold" color={color.black}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>
    </Wrapper>
  );
};

export default DebitCard;
