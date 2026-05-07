import React, {useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {router} from 'expo-router';
import {Header, Spacer, Text, ToggleButton, Wrapper} from '@/components';
import {colors} from '@/constants/colors';
import {useThemeColor} from '@/hooks/useThemeColor';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

interface BudgetItem {
  id: string;
  budgetName: string;
  email: string;
  access: string;
}

const History = () => {
  const color = useThemeColor();
  const [selectedTabIndex, setSelectedTabIndex] = useState<number>(0);

  const [sharedBudgets] = useState<BudgetItem[]>([
    {
      id: '1',
      budgetName: 'Home Budget',
      email: 'alin547@gmail.com',
      access: 'Can View',
    },
    {
      id: '2',
      budgetName: 'Home Budget',
      email: 'alin547@gmail.com',
      access: 'Can View',
    },
    {
      id: '3',
      budgetName: 'Home Budget',
      email: 'alin547@gmail.com',
      access: 'Can View',
    },
  ]);

  const [pendingInvites] = useState<BudgetItem[]>([
    {
      id: '4',
      budgetName: 'Home Budget',
      email: 'alin547@gmail.com',
      access: 'Can View',
    },
  ]);

  const handleEdit = (id: string) => {
    router.navigate('/mainScreens/SharingBudget');
  };

  const handleCancel = (id: string) => {
    console.log('Cancel budget:', id);
  };

  const handleResend = (id: string) => {
    console.log('Resend invite:', id);
  };

  const handleReject = (id: string) => {
    console.log('Reject invite:', id);
  };

  const handleAccept = (id: string) => {
    console.log('Accept invite:', id);
  };

  const renderBudgetCard = (item: BudgetItem, showEditButton: boolean) => (
    <View
      key={item.id}
      style={[
        styles.budgetCard,
        {borderColor: color.primary, backgroundColor: color.bg},
      ]}>
      <View style={styles.topRow}>
        <Text
          size={16}
          variant="medium"
          color={color.black}
          style={{marginLeft: widthPixel(6)}}>
          {item.budgetName}
        </Text>
        <View style={styles.buttonContainer}>
          {showEditButton && (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.equalWidthButton,
                  {backgroundColor: color.tabBackground},
                ]}
                onPress={() => handleEdit(item.id)}
                activeOpacity={0.8}>
                <Text size={14} variant="regular" color={color.black}>
                  Edit
                </Text>
              </TouchableOpacity>
              <Spacer width={widthPixel(10)} />
            </>
          )}
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.equalWidthButton,
              {backgroundColor: color.tabBackground},
            ]}
            onPress={() => handleCancel(item.id)}
            activeOpacity={0.8}>
            <Text size={14} variant="regular" color={color.black}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Spacer height={heightPixel(15)} />

      {/* Bottom Row: Email and Access */}
      <View style={styles.bottomRow}>
        <Text size={14} color={color.black} style={{marginLeft: widthPixel(6)}}>
          {item.email}
        </Text>
        <Text
          size={12}
          color={color.black}
          style={{marginRight: widthPixel(6)}}>
          Access: {item.access}
        </Text>
      </View>
    </View>
  );

  const renderPendingCard = (item: BudgetItem, isSharedByMe: boolean) => (
    <View
      key={item.id}
      style={[
        styles.budgetCard,
        {borderColor: color.primary, backgroundColor: color.bg},
      ]}>
      <View style={styles.topRow}>
        <Text
          size={16}
          variant="medium"
          color={color.black}
          style={{marginLeft: widthPixel(6)}}>
          {item.budgetName}
        </Text>
        <View style={styles.buttonContainer}>
          {isSharedByMe ? (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.equalWidthButton,
                  {backgroundColor: color.tabBackground},
                ]}
                onPress={() => handleResend(item.id)}
                activeOpacity={0.8}>
                <Text size={14} variant="regular" color={color.black}>
                  Resend
                </Text>
              </TouchableOpacity>
              <Spacer width={widthPixel(10)} />
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.equalWidthButton,
                  {backgroundColor: color.tabBackground},
                ]}
                onPress={() => handleCancel(item.id)}
                activeOpacity={0.8}>
                <Text size={14} variant="regular" color={color.black}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.equalWidthButton,
                  {backgroundColor: color.tabBackground},
                ]}
                onPress={() => handleReject(item.id)}
                activeOpacity={0.8}>
                <Text size={14} variant="regular" color={color.black}>
                  Reject
                </Text>
              </TouchableOpacity>
              <Spacer width={widthPixel(10)} />
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.equalWidthButton,
                  {backgroundColor: color.tabBackground},
                ]}
                onPress={() => handleAccept(item.id)}
                activeOpacity={0.8}>
                <Text size={14} variant="regular" color={color.black}>
                  Accept
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
      <Spacer height={heightPixel(15)} />
      <View style={styles.bottomRow}>
        <Text size={14} color={color.black} style={{marginLeft: widthPixel(6)}}>
          {item.email}
        </Text>
        <Text
          size={12}
          color={color.black}
          style={{marginRight: widthPixel(6)}}>
          Access: {item.access}
        </Text>
      </View>
    </View>
  );

  return (
    <Wrapper>
      <Header
        title="History"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack={true}
      />
      <Spacer height={heightPixel(15)} />
      <ToggleButton
        options={['Shared By Me', 'Shared With Me']}
        selectedIndex={selectedTabIndex}
        onToggle={setSelectedTabIndex}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Spacer height={heightPixel(30)} />
        <Text size={15} variant="regular" color={color.black}>
          Shared Budgets
        </Text>
        <Spacer height={heightPixel(15)} />
        {sharedBudgets.map(item =>
          renderBudgetCard(item, selectedTabIndex === 0),
        )}
        <Spacer height={heightPixel(30)} />
        <Text size={15} variant="regular" color={color.black}>
          Pending Invites
        </Text>
        <Spacer height={heightPixel(15)} />
        {pendingInvites.map(item =>
          renderPendingCard(item, selectedTabIndex === 0),
        )}

        <Spacer height={heightPixel(30)} />
      </ScrollView>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    paddingVertical: heightPixel(15),
    borderRadius: heightPixel(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetCard: {
    borderRadius: heightPixel(14),
    borderWidth: 1,
    paddingHorizontal: widthPixel(10),
    paddingVertical: heightPixel(15),
    marginBottom: heightPixel(15),
    shadowColor: '#000',
    shadowOffset: {
      width: 3,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: widthPixel(15),
    paddingVertical: heightPixel(5),
    borderRadius: heightPixel(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  equalWidthButton: {
    minWidth: widthPixel(75),
  },
});

export default History;
