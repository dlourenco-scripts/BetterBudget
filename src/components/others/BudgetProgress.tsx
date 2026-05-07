import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

export default function BudgetProgress() {
  const progress = 0.4; // 40% (4000%)

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.leftValueWrapper}>
          <Text style={styles.leftValue}>0%</Text>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.filledBar, {flex: progress}]}>
            <Text style={styles.filledText}>4000%</Text>
          </View>

          {/* Empty area */}
          <View style={{flex: 1 - progress}} />
        </View>
      </View>

      {/* Right side label */}
      <Text style={styles.amount}>$10,000</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F4A623',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 40,
  },

  progressWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 30,
  },

  leftValueWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 10,
  },

  leftValue: {
    color: '#3C2A1E',
    fontSize: 14,
  },

  progressBar: {
    flex: 1,
    height: 30,
    backgroundColor: '#FFF9EF',
    borderRadius: 20,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  filledBar: {
    backgroundColor: '#F4A62320',
    justifyContent: 'center',
    alignItems: 'center',
  },

  filledText: {
    color: '#3C2A1E',
    fontWeight: '600',
  },

  amount: {
    marginLeft: 15,
    color: '#3C2A1E',
    fontSize: 16,
    fontWeight: '600',
  },
});
