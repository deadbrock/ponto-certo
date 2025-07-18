/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';
import {it, describe, expect, jest} from '@jest/globals';
import renderer from 'react-test-renderer';

// Mocks básicos necessários
jest.mock('react-native-device-info', () => ({
  getUniqueId: () => Promise.resolve('TEST_DEVICE_ID'),
  getDeviceName: () => Promise.resolve('Test Device'),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
}));

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }: any) => children,
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

describe('App Component', () => {
  it('renders correctly', () => {
    const tree = renderer.create(<App />);
    expect(tree).toBeDefined();
  });

  it('creates component without crashing', () => {
    expect(() => {
      renderer.create(<App />);
    }).not.toThrow();
  });
});
