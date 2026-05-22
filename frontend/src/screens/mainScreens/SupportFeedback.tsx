import React, {useState} from 'react';
import {Alert, Keyboard, StyleSheet, View} from 'react-native';
import {Header, Spacer, Text, TextInput, Button, Wrapper} from '@/components';
import {useThemeColor} from '@/hooks/useThemeColor';
import {supportApi} from '@/network/api';
import {fontPixel, heightPixel, widthPixel} from '@/services/responsive';

const SupportFeedback = () => {
  const color = useThemeColor();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const sendFeedback = async () => {
    setAttemptedSubmit(true);
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 3) {
      return;
    }

    setSaving(true);
    try {
      const response = await supportApi.create({message: trimmedMessage});
      if (!response.success) {
        Alert.alert('Unable to send', response.message || 'Please try again.');
        return;
      }

      setMessage('');
      setAttemptedSubmit(false);
      Keyboard.dismiss();
      Alert.alert('Thanks', 'Thanks, your message was sent.');
    } catch (error: any) {
      Alert.alert(
        'Unable to send',
        error?.message || 'Unable to send right now. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Wrapper>
      <Header
        title="Support & Feedback"
        titleStyle={{
          color: color.black,
          fontSize: fontPixel(22),
          fontFamily: 'medium',
          fontWeight: '500',
        }}
        canGoBack
      />
      <Spacer height={heightPixel(24)} />
      <Text size={15} color={color.tabicon} style={styles.introText}>
        Tell us what happened, what feels off, or what you’d like to see next.
      </Text>
      <Spacer height={heightPixel(18)} />
      <TextInput
        title="Message"
        placeholder="Type your bug, issue, or suggestion..."
        value={message}
        onChangeText={setMessage}
        multiline
        textAlignVertical="top"
        error="Please enter a message."
        touched={attemptedSubmit && message.trim().length < 3}
        inputContainerStyle={{
          backgroundColor: color.inputField,
          minHeight: heightPixel(190),
          borderRadius: heightPixel(18),
          paddingTop: heightPixel(12),
          alignItems: 'flex-start',
        }}
        inputStyle={{
          minHeight: heightPixel(160),
          textAlignVertical: 'top',
          paddingTop: 0,
        }}
      />
      <Spacer height={heightPixel(24)} />
      <Button
        title={saving ? 'Sending...' : 'Send'}
        onPress={sendFeedback}
        disabled={saving}
      />
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  introText: {
    lineHeight: heightPixel(22),
    marginHorizontal: widthPixel(8),
  },
});

export default SupportFeedback;
