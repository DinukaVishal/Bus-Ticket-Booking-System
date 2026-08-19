import 'package:flutter/material.dart';
import '../services/supabase_service.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _emailFormKey = GlobalKey<FormState>();
  final _otpFormKey = GlobalKey<FormState>();
  final _passwordFormKey = GlobalKey<FormState>();

  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _isLoading = false;
  int _currentStep = 0; // 0 = email, 1 = OTP, 2 = new password

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _sendResetEmail() async {
    if (!(_emailFormKey.currentState?.validate() ?? false)) return;

    setState(() => _isLoading = true);
    try {
      await SupabaseService.resetPassword(
        email: _emailController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _currentStep = 1;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Reset code sent! Check your email.')),
      );
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  Future<void> _verifyOtp() async {
    if (!(_otpFormKey.currentState?.validate() ?? false)) return;

    setState(() => _isLoading = true);
    try {
      await SupabaseService.verifyOtp(
        email: _emailController.text.trim(),
        token: _otpController.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _currentStep = 2;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Code verified! Set your new password.')),
      );
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  Future<void> _updatePassword() async {
    if (!(_passwordFormKey.currentState?.validate() ?? false)) return;

    setState(() => _isLoading = true);
    try {
      await SupabaseService.updatePassword(
        newPassword: _newPasswordController.text,
      );
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password updated successfully!')),
      );
      // Sign out so they can log in fresh with the new password
      await SupabaseService.signOut();
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/login');
    } catch (e) {
      setState(() => _isLoading = false);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final gradientColors = isDark
        ? [colorScheme.primary.withAlpha(20), colorScheme.surface]
        : const [Color(0xFFEDE7FF), Color(0xFFF7F4FF)];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Reset Password'),
      ),
      body: Stack(
        children: [
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: gradientColors,
              ),
            ),
          ),
          Positioned(
            top: -120,
            left: -80,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.deepPurple.withAlpha(36),
              ),
            ),
          ),
          Positioned(
            right: -80,
            top: 120,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.deepPurple.withAlpha(20),
              ),
            ),
          ),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 16),
                  Text(
                    _currentStep == 0
                        ? 'Forgot your password?'
                        : _currentStep == 1
                            ? 'Enter the code'
                            : 'Set new password',
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _currentStep == 0
                        ? 'Enter your email and we\'ll send you a code to reset your password.'
                        : _currentStep == 1
                            ? 'We\'ve sent a 6-digit code to ${_emailController.text.trim()}. Enter it below.'
                            : 'Choose a strong new password for your account.',
                    style: TextStyle(
                      fontSize: 15,
                      color: colorScheme.onSurface.withValues(alpha: 184),
                    ),
                  ),
                  const SizedBox(height: 12),
                  // Step indicator
                  Row(
                    children: List.generate(3, (index) {
                      final isActive = index <= _currentStep;
                      return Expanded(
                        child: Container(
                          margin: EdgeInsets.only(right: index < 2 ? 8 : 0),
                          height: 4,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(2),
                            color: isActive
                                ? colorScheme.primary
                                : colorScheme.primary.withAlpha(40),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 28),
                  Container(
                    decoration: BoxDecoration(
                      color: theme.cardColor,
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: [
                        BoxShadow(
                          color: colorScheme.primary.withAlpha(20),
                          blurRadius: 30,
                          offset: const Offset(0, 15),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(24),
                    child: _buildCurrentStep(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_currentStep) {
      case 0:
        return _buildEmailStep();
      case 1:
        return _buildOtpStep();
      case 2:
        return _buildPasswordStep();
      default:
        return _buildEmailStep();
    }
  }

  Widget _buildEmailStep() {
    return Form(
      key: _emailFormKey,
      child: Column(
        children: [
          TextFormField(
            controller: _emailController,
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.email_outlined),
            ),
            keyboardType: TextInputType.emailAddress,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Enter your email';
              }
              if (!value.contains('@')) {
                return 'Enter a valid email';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _sendResetEmail,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14.0),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Send Reset Code'),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Back to Login'),
          ),
        ],
      ),
    );
  }

  Widget _buildOtpStep() {
    return Form(
      key: _otpFormKey,
      child: Column(
        children: [
          TextFormField(
            controller: _otpController,
            decoration: const InputDecoration(
              labelText: 'Verification Code',
              prefixIcon: Icon(Icons.pin_outlined),
              hintText: 'Enter 6-digit code',
            ),
            keyboardType: TextInputType.number,
            maxLength: 6,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Enter the verification code';
              }
              if (value.length < 6) {
                return 'Code must be 6 digits';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _verifyOtp,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14.0),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Verify Code'),
              ),
            ),
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: _isLoading
                ? null
                : () async {
                    setState(() => _isLoading = true);
                    try {
                      await SupabaseService.resetPassword(
                        email: _emailController.text.trim(),
                      );
                      if (!mounted) return;
                      setState(() => _isLoading = false);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('New code sent!')),
                      );
                    } catch (e) {
                      setState(() => _isLoading = false);
                      if (!mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(e.toString())),
                      );
                    }
                  },
            child: const Text('Resend Code'),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordStep() {
    return Form(
      key: _passwordFormKey,
      child: Column(
        children: [
          TextFormField(
            controller: _newPasswordController,
            decoration: const InputDecoration(
              labelText: 'New Password',
              prefixIcon: Icon(Icons.lock_outline),
            ),
            obscureText: true,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Enter a new password';
              }
              if (value.length < 6) {
                return 'Password must be at least 6 characters';
              }
              return null;
            },
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _confirmPasswordController,
            decoration: const InputDecoration(
              labelText: 'Confirm Password',
              prefixIcon: Icon(Icons.lock_outline),
            ),
            obscureText: true,
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Confirm your password';
              }
              if (value != _newPasswordController.text) {
                return 'Passwords do not match';
              }
              return null;
            },
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _updatePassword,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 14.0),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Update Password'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
