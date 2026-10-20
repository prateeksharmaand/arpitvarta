import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../l10n/app_strings.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../professional/professional_main_screen.dart';
import '../professional/professional_setup_profile_screen.dart';
import 'change_password_screen.dart';

class LoginScreen extends StatefulWidget {
  final bool isProfessionalMode;
  const LoginScreen({super.key, this.isProfessionalMode = true});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final success = await auth.login(_emailCtrl.text.trim(), _passCtrl.text,
        loginAs: widget.isProfessionalMode ? 'professional' : 'user');
    if (!success || !mounted) return;

    if (widget.isProfessionalMode) {
      // Force password change on first login
      if (auth.user?.mustChangePassword == true) {
        Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const ChangePasswordScreen()), (_) => false);
        return;
      }
      if (auth.isProfessional) {
        Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const ProfessionalMainScreen()), (_) => false);
      } else {
        Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const ProfessionalSetupProfileScreen()), (_) => false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    final isPro = widget.isProfessionalMode;
    const proBlue = Color(0xFF7C3AED);
    final accentColor = isPro ? proBlue : context.clr.accent;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: isPro
                ? isDark
                    ? [const Color(0xFF0D1A3A), const Color(0xFF0D0D0D)]
                    : [const Color(0xFFE6F0FF), const Color(0xFFFFFFFF)]
                : [context.clr.surface, context.clr.bg],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.manual,
            padding: EdgeInsets.only(
              left: 24, right: 24, top: 24,
              bottom: MediaQuery.of(context).viewInsets.bottom + 24,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (Navigator.canPop(context))
                  IconButton(
                    icon: Icon(Icons.arrow_back_ios, color: context.clr.txtPrimary),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                  ),
                const SizedBox(height: 24),
                _buildHeader(s, isPro, accentColor),
                const SizedBox(height: 40),
                _buildForm(s),
                const SizedBox(height: 24),
                _buildLoginButton(s, accentColor),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: Text(
                    'Your account is created by ArpitVarta admin.\nContact support@arpitvarta.com for help.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: context.clr.txtMuted, fontSize: 12, height: 1.5),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(AppStrings s, bool isPro, Color accentColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 56, height: 56,
          decoration: BoxDecoration(
            color: accentColor.withOpacity(0.15),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: accentColor.withOpacity(0.3)),
          ),
          child: Icon(isPro ? Icons.star_rounded : Icons.auto_awesome, color: accentColor, size: 28),
        ),
        const SizedBox(height: 24),
        Text(
          isPro ? 'Professional Sign In' : s.welcomeBack,
          style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: context.clr.txtPrimary),
        ),
        const SizedBox(height: 8),
        Text(
          isPro ? 'Sign in to your professional account' : s.starsWaiting,
          style: TextStyle(fontSize: 15, color: context.clr.txtSecondary),
        ),
      ],
    );
  }

  Widget _buildForm(AppStrings s) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) => Form(
        key: _formKey,
        child: Column(
          children: [
            if (auth.error != null)
              Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: context.clr.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: context.clr.error.withValues(alpha: 0.3)),
                ),
                child: Row(children: [
                  Icon(Icons.error_outline, color: context.clr.error, size: 16),
                  const SizedBox(width: 8),
                  Expanded(child: Text(auth.error!, style: TextStyle(color: context.clr.error, fontSize: 13))),
                ]),
              ),
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              style: TextStyle(color: context.clr.txtPrimary),
              decoration: InputDecoration(labelText: s.email, prefixIcon: Icon(Icons.email_outlined, color: context.clr.txtMuted)),
              validator: (v) => v!.contains('@') ? null : 'Enter a valid email',
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _passCtrl,
              obscureText: _obscurePassword,
              style: TextStyle(color: context.clr.txtPrimary),
              decoration: InputDecoration(
                labelText: s.password,
                prefixIcon: Icon(Icons.lock_outline, color: context.clr.txtMuted),
                suffixIcon: IconButton(
                  icon: Icon(_obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined, color: context.clr.txtMuted),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              validator: (v) => v!.length >= 6 ? null : 'Password must be at least 6 characters',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoginButton(AppStrings s, Color accentColor) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) => SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: auth.isLoading ? null : _login,
          style: ElevatedButton.styleFrom(backgroundColor: accentColor, foregroundColor: Colors.white),
          child: auth.isLoading
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : Text(s.signIn),
        ),
      ),
    );
  }

}
