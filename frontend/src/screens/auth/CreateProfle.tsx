import React, {useState} from 'react';
import {Alert, Image, TouchableOpacity, View} from 'react-native';
import {router} from 'expo-router';
import {
  Button,
  FullFlex,
  Header,
  Spacer,
  Text,
  TextInput,
  Wrapper,
} from '@/components';
import {appImages} from '@/constants/assets';
import {useThemeColor} from '@/hooks/useThemeColor';
import {userApi} from '@/network/api';
import {pickImage} from '@/services/helpingMethods';
import {widthPixel} from '@/services/responsive';
import {useAuthStore} from '@/store';

const CreateProfle = () => {
  const [image, setImage] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const color = useThemeColor();
  const updateUserData = useAuthStore(state => state.updateUserData);

  const handleImagePick = async () => {
    const uri = await pickImage({
      mode: 'gallery',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (uri) {
      setImage(uri);
      console.log('uri', uri);
    } else {
      Alert.alert('No Image Selected');
    }
  };

  const handleGetStarted = async () => {
    setSubmitted(true);
    if (
      !fullName.trim() ||
      !selectedGoal ||
      (selectedGoal === 'savings' && !savingsGoal.trim())
    ) {
      return;
    }

    setSaving(true);
    try {
      const response = await userApi.update({
        fullName,
        profileImage: image || '',
        goalType: selectedGoal === 'debt' ? 'debt' : 'save',
        savingsGoal: selectedGoal === 'savings' ? Number(savingsGoal || 0) : 0,
        onboardingComplete: true,
      });

      if (response.success && response.data) {
        updateUserData(response.data);
      }

      router.replace('/auth/Onboarding');
    } catch (error) {
      router.replace('/auth/Onboarding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Wrapper>
      <Header title="Complete Profile" canGoBack={false} />
      <Spacer height={30} />
      <View
        style={{
          borderRadius: widthPixel(100),
          width: widthPixel(122),
          height: widthPixel(122),
          backgroundColor: color.profileBackground,
          justifyContent: 'center',
          alignItems: 'center',
          alignSelf: 'center',
        }}>
        <TouchableOpacity onPress={handleImagePick}>
          {image ? (
            <Image
              source={{uri: image}}
              style={{
                width: widthPixel(122),
                height: widthPixel(122),
                borderRadius: widthPixel(100),
              }}
            />
          ) : (
            <Image
              source={appImages.Cameraimg}
              style={{
                width: widthPixel(33),
                height: widthPixel(33),
                resizeMode: 'contain',
              }}
            />
          )}
        </TouchableOpacity>
      </View>
      <Spacer height={20} />
      <Text size={15} variant="medium" style={{textAlign: 'center'}}>
        Upload Profile Picture
      </Text>
      <Spacer height={60} />
      <TextInput
        title="Name"
        placeholder="Enter your full name"
        value={fullName}
        onChangeText={setFullName}
        error="Name is required"
        touched={submitted && !fullName.trim()}
      />
      <Spacer height={40} />
      <Text
        size={15}
        variant="medium"
        style={{marginHorizontal: widthPixel(13)}}>
        Primary Goal
      </Text>
      <Spacer height={10} />
      <View
        style={{
          flexDirection: 'row',
          // justifyContent: 'space-between',
          // marginHorizontal: widthPixel(13),
          backgroundColor: color.tabBackground,
          borderRadius: widthPixel(18),
          gap: widthPixel(10),
          padding: widthPixel(3),
        }}>
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            backgroundColor:
              selectedGoal === 'savings' ? color.bg : color.tabBackground,
            borderWidth: submitted && !selectedGoal ? 1 : 0,
            borderColor: color.errortext || '#FF4D4F',
            borderTopLeftRadius: widthPixel(18),
            borderBottomLeftRadius: widthPixel(18),
            padding: widthPixel(10),
          }}
          onPress={() => setSelectedGoal('savings')}>
          <Image
            source={appImages.SavingMoneyimg}
            style={{
              height: widthPixel(32),
              width: widthPixel(32),
              resizeMode: 'contain',
            }}
          />
          <Text>Build Savings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'center',
            borderTopRightRadius: widthPixel(18),
            borderBottomRightRadius: widthPixel(18),
            borderColor:
              submitted && !selectedGoal ? color.errortext || '#FF4D4F' : color.tabiconFocus,
            borderWidth: submitted && !selectedGoal ? 1 : 0,
            backgroundColor:
              selectedGoal === 'debt' ? color.bg : color.tabBackground,
            padding: widthPixel(10),
          }}
          onPress={() => setSelectedGoal('debt')}>
          <Image
            source={appImages.Debtimg}
            style={{
              height: widthPixel(32),
              width: widthPixel(32),
              resizeMode: 'contain',
            }}
          />
          <Text>Pay Off Debt</Text>
        </TouchableOpacity>
      </View>
      {submitted && !selectedGoal ? (
        <>
          <Spacer height={5} />
          <Text
            size={14}
            color={color.errortext || '#FF4D4F'}
            style={{marginHorizontal: widthPixel(13)}}>
            Primary goal is required
          </Text>
        </>
      ) : null}
      <Spacer height={10} />
      {selectedGoal === 'savings' ? (
        <TextInput
          title="Savings Goal"
          placeholder="Goal"
          placeholderTextColor={color.placeholdertext}
          keyboardType="numeric"
          useCurrencyIcon={true}
          value={savingsGoal}
          onChangeText={setSavingsGoal}
          error="Savings goal is required"
          touched={submitted && selectedGoal === 'savings' && !savingsGoal.trim()}
        />
      ) : null}
      <FullFlex />
      <Spacer height={20} />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          // alignItems: 'center',
          gap: widthPixel(5),
        }}>
        <Image
          source={appImages.Checkimg}
          style={{
            width: widthPixel(16),
            height: widthPixel(16),
            resizeMode: 'contain',
            marginTop: widthPixel(2),
          }}
        />
        <View style={{alignItems: 'center', gap: widthPixel(5)}}>
          <Text color={color.privacyPolicytext}>
            By continuing, you agree to
          </Text>
          <View
            style={{
              flexDirection: 'row',
              gap: widthPixel(5),
              justifyContent: 'center',
              alignItems: 'center',
              // marginLeft: widthPixel(10),
            }}>
            <Text color={color.primary} variant="medium">
              Terms of Use
            </Text>
            <Text color={color.privacyPolicytext}>&</Text>
            <Text color={color.primary} variant="medium">
              Privacy Policy.
            </Text>
          </View>
        </View>
      </View>
      <Spacer height={20} />
      <Button
        title="Get Started"
        onPress={handleGetStarted}
        isLoading={saving}
      />
    </Wrapper>
  );
};

export default CreateProfle;
