import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { NativeModules } from 'react-native';
import { ThemeContext } from './ThemeContext';

const LogScreen = () => {
  const [logs, setLogs] = useState('');
  const scrollViewRef = useRef();
  const { isDarkTheme } = useContext(ThemeContext);
  const backgroundColor = isDarkTheme ? '#282828' : 'white';
  const textColor = isDarkTheme ? 'white' : 'black';

  const fetchLogs = async () => {
    console.log('Fetching logs');
    try {
      const logContent = await NativeModules.LndLogModule.readLastLines();
      setLogs(logContent);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    const logUpdateTimer = setInterval(fetchLogs, 1000);
    return () => clearInterval(logUpdateTimer);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        backgroundColor: backgroundColor,
      }}
    >
      <ScrollView
        ref={scrollViewRef}
        onContentSizeChange={() =>
          scrollViewRef.current.scrollToEnd({ animated: true })
        }
        style={{ flex: 1, backgroundColor: 'transparent' }}
      >
        <Text style={{ color: textColor }}>{logs}</Text>
      </ScrollView>
    </View>
  );
};

export default LogScreen;
