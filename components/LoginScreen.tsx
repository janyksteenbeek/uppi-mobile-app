import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/context/auth';

export const LoginScreen = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleCodeChange = (text: string) => {
    // Only allow numbers and limit to 6 digits
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 6) {
      setCode(numericText);
    }
  };

  const handleSubmit = async () => {
    if (code.length === 6) {
      setLoading(true);
      try {
        await signIn(code);
      } catch (error) {
        Alert.alert('Oops!', 'Invalid code. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('@/assets/images/logo-white.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={handleCodeChange}
        maxLength={6}
        placeholder="123456"
        placeholderTextColor="#ffffff80"
        secureTextEntry
        editable={!loading}
      />
      <TouchableOpacity 
        style={[styles.button, code.length === 6 ? styles.buttonActive : styles.buttonInactive]}
        onPress={handleSubmit}
        disabled={code.length !== 6 || loading}
      >
        {loading ? (
          <ActivityIndicator color="#DC2625" />
        ) : (
          <Text style={styles.buttonText}>Submit</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.footerText}>
        You'll find the code when registering a new device under 'Connections' in Uppi
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DC2625',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: '40%',
    height: 100,
    marginBottom: 40,
  },
  input: {
    width: '80%',
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 5,
  },
  button: {
    width: '80%',
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: '#ffffff',
  },
  buttonInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    color: '#DC2625',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 20,
    width: '80%',
    opacity: 0.8,
    textAlign: 'center',
  },
}); 
