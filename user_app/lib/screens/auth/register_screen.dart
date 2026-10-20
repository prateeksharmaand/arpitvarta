import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../l10n/app_strings.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../home/main_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  int _currentStep = 0;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    _phoneCtrl.dispose();
    _cityCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    final success = await context.read<AuthProvider>().register(
      email: _emailCtrl.text.trim(),
      password: _passCtrl.text,
      name: _nameCtrl.text.trim(),
      phone: _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
      city: _cityCtrl.text.trim().isEmpty ? null : _cityCtrl.text.trim(),
    );
    if (!success || !mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const MainScreen()),
      (_) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.5,
            colors: [context.clr.surface, context.clr.bg],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildAppBar(s),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: _formKey,
                    child: _currentStep == 0 ? _buildStep1(s) : _buildStep2(s),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAppBar(AppStrings s) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          IconButton(
            icon: Icon(Icons.arrow_back_ios, color: context.clr.txtPrimary),
            onPressed: _currentStep == 0 ? () => Navigator.pop(context) : () => setState(() => _currentStep = 0),
          ),
          Expanded(
            child: Column(
              children: [
                Text(
                  _currentStep == 0 ? s.createAccount : s.birthDetails,
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: context.clr.txtPrimary),
                ),
                const SizedBox(height: 6),
                LinearProgressIndicator(
                  value: _currentStep == 0 ? 0.5 : 1.0,
                  backgroundColor: context.clr.border,
                  color: context.clr.accent,
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildStep1(AppStrings s) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(s.joinCosmos, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: context.clr.txtPrimary)),
        const SizedBox(height: 8),
        Text(s.createCosmicProfile, style: TextStyle(color: context.clr.txtSecondary)),
        const SizedBox(height: 32),
        TextFormField(
          controller: _nameCtrl,
          style: TextStyle(color: context.clr.txtPrimary),
          decoration: InputDecoration(labelText: s.fullName, prefixIcon: Icon(Icons.person_outline, color: context.clr.txtMuted)),
          validator: (v) => v!.length >= 2 ? null : s.name,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          style: TextStyle(color: context.clr.txtPrimary),
          decoration: InputDecoration(labelText: s.emailAddress, prefixIcon: Icon(Icons.email_outlined, color: context.clr.txtMuted)),
          validator: (v) => v!.contains('@') ? null : s.email,
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
          validator: (v) => v!.length >= 6 ? null : s.password,
        ),
        const SizedBox(height: 32),
        ElevatedButton(
          onPressed: () {
            if (!_formKey.currentState!.validate()) return;
            setState(() => _currentStep = 1);
          },
          child: Text(s.continueText),
        ),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          Text(s.alreadyHaveAccount, style: TextStyle(color: context.clr.txtSecondary)),
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Text(s.signIn, style: TextStyle(color: context.clr.accent, fontWeight: FontWeight.w600)),
          ),
        ]),
      ],
    );
  }

  Widget _buildStep2(AppStrings s) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(s.cosmicBlueprint, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: context.clr.txtPrimary)),
          const SizedBox(height: 8),
          Text(s.birthHelpChart, style: TextStyle(color: context.clr.txtSecondary)),
          const SizedBox(height: 32),
          TextFormField(
            controller: _phoneCtrl,
            keyboardType: TextInputType.phone,
            style: TextStyle(color: context.clr.txtPrimary),
            decoration: InputDecoration(labelText: s.birthPlace, prefixIcon: Icon(Icons.phone_outlined, color: context.clr.txtMuted)),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _cityCtrl,
            style: TextStyle(color: context.clr.txtPrimary),
            decoration: InputDecoration(labelText: s.timeOfBirth, prefixIcon: Icon(Icons.location_on_outlined, color: context.clr.txtMuted)),
          ),
          if (auth.error != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: context.clr.error.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
              child: Text(auth.error!, style: TextStyle(color: context.clr.error)),
            ),
          ],
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: auth.isLoading ? null : _register,
            child: auth.isLoading
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(s.beginJourney),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: auth.isLoading ? null : _register,
            child: Text(s.skipForNow, style: TextStyle(color: context.clr.txtSecondary)),
          ),
        ],
      ),
    );
  }
}
