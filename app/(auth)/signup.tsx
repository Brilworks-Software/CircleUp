import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { User, Lock, Eye, EyeOff, Mail, Phone } from 'lucide-react-native';
import { useAuth } from '../../firebase/hooks/useAuth';

export default function SignupScreen() {
  const { signUp, isSigningUp, signUpError } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '' as 'male' | 'female' | 'other' | '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validation helper functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) return true; // Phone is now optional
    // More comprehensive phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{7,14}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    return phoneRegex.test(cleanPhone);
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    } else if (cleaned.length <= 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else {
      // For international numbers, just add + prefix
      return `+${cleaned}`;
    }
  };

  const validatePassword = (password: string): boolean => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validateAge = (age: string): boolean => {
    if (!age.trim()) return true; // Age is now optional
    const ageNum = parseInt(age.trim());
    return !isNaN(ageNum) && ageNum >= 13 && ageNum <= 120 && Number.isInteger(ageNum);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate full name
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters long';
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.fullName.trim())) {
      errors.fullName = 'Full name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Validate email
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Validate phone (optional)
    if (formData.phone.trim() && !validatePhone(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Validate age (optional)
    if (formData.age.trim() && !validateAge(formData.age)) {
      errors.age = 'Please enter a valid age (13-120)';
    }

    // Validate password
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!validatePassword(formData.password)) {
      errors.password = 'Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, and 1 number';
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;
    
    // Format phone number as user types
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    clearFieldError(field);
  };

  const handleInputBlur = (field: string) => {
    // Real-time validation on blur
    const errors: Record<string, string> = { ...validationErrors };
    
    switch (field) {
      case 'fullName':
        if (!formData.fullName.trim()) {
          errors.fullName = 'Full name is required';
        } else if (formData.fullName.trim().length < 2) {
          errors.fullName = 'Full name must be at least 2 characters long';
        } else if (!/^[a-zA-Z\s'-]+$/.test(formData.fullName.trim())) {
          errors.fullName = 'Full name can only contain letters, spaces, hyphens, and apostrophes';
        } else {
          delete errors.fullName;
        }
        break;
        
      case 'email':
        if (!formData.email.trim()) {
          errors.email = 'Email is required';
        } else if (!validateEmail(formData.email.trim())) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
        
      case 'phone':
        if (formData.phone.trim() && !validatePhone(formData.phone)) {
          errors.phone = 'Please enter a valid phone number';
        } else {
          delete errors.phone;
        }
        break;
        
      case 'age':
        if (formData.age.trim() && !validateAge(formData.age)) {
          errors.age = 'Please enter a valid age (13-120)';
        } else {
          delete errors.age;
        }
        break;
        
      case 'password':
        if (!formData.password) {
          errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          errors.password = 'Password must be at least 8 characters long';
        } else if (!validatePassword(formData.password)) {
          errors.password = 'Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, and 1 number';
        } else {
          delete errors.password;
        }
        break;
        
      case 'confirmPassword':
        if (!formData.confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
        } else {
          delete errors.confirmPassword;
        }
        break;
    }
    
    setValidationErrors(errors);
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.fullName,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender || undefined,
        phone: formData.phone,
      });
      
      // Success - user will be automatically redirected by auth state change
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Signup Failed', signUpError?.message || 'An error occurred during signup');
    }
  };

  const goToLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <User size={32} color="#ffffff" />
              </View>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, validationErrors.fullName && styles.inputError]}
                  value={formData.fullName}
                  onChangeText={(value) => handleInputChange('fullName', value)}
                  onBlur={() => handleInputBlur('fullName')}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>
              {validationErrors.fullName && (
                <Text style={styles.errorText}>{validationErrors.fullName}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email *</Text>
              <View style={styles.inputWrapper}>
                <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, validationErrors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  onBlur={() => handleInputBlur('email')}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              {validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrapper}>
                <Phone size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, validationErrors.phone && styles.inputError]}
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  onBlur={() => handleInputBlur('phone')}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
              {validationErrors.phone && (
                <Text style={styles.errorText}>{validationErrors.phone}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Age</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, validationErrors.age && styles.inputError]}
                  value={formData.age}
                  onChangeText={(value) => handleInputChange('age', value)}
                  onBlur={() => handleInputBlur('age')}
                  placeholder="Enter your age"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
              {validationErrors.age && (
                <Text style={styles.errorText}>{validationErrors.age}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderContainer}>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === 'male' && styles.genderButtonSelected
                    ]}
                    onPress={() => handleInputChange('gender', 'male')}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      formData.gender === 'male' && styles.genderButtonTextSelected
                    ]}>
                      Male
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === 'female' && styles.genderButtonSelected
                    ]}
                    onPress={() => handleInputChange('gender', 'female')}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      formData.gender === 'female' && styles.genderButtonTextSelected
                    ]}>
                      Female
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.genderRow}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === 'other' && styles.genderButtonSelected
                    ]}
                    onPress={() => handleInputChange('gender', 'other')}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      formData.gender === 'other' && styles.genderButtonTextSelected
                    ]}>
                      Other
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === '' && styles.genderButtonSelected
                    ]}
                    onPress={() => handleInputChange('gender', '')}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      formData.gender === '' && styles.genderButtonTextSelected
                    ]}>
                      Prefer not to say
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, validationErrors.password && styles.inputError]}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  onBlur={() => handleInputBlur('password')}
                  placeholder="Create a password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
              {validationErrors.password && (
                <Text style={styles.errorText}>{validationErrors.password}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.inputWrapper}>
                <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, validationErrors.confirmPassword && styles.inputError]}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  onBlur={() => handleInputBlur('confirmPassword')}
                  placeholder="Confirm your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
              {validationErrors.confirmPassword && (
                <Text style={styles.errorText}>{validationErrors.confirmPassword}</Text>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.signupButton, isSigningUp && styles.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={isSigningUp}
            >
              <Text style={styles.signupButtonText}>
                {isSigningUp ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={goToLogin}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  eyeIcon: {
    padding: 4,
  },
  signupButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  socialButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
  genderContainer: {
    gap: 12,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  genderButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  genderButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  genderButtonTextSelected: {
    color: '#3B82F6',
  },
});