import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../models/professional.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import 'professional_main_screen.dart';

const _languages = ['Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi', 'Urdu', 'Odia'];

/// Creates the professional profile on first run, and edits it afterwards
/// (when [AuthProvider.professionalProfile] already exists).
class ProfessionalSetupProfileScreen extends StatefulWidget {
  const ProfessionalSetupProfileScreen({super.key});

  @override
  State<ProfessionalSetupProfileScreen> createState() => _ProfessionalSetupProfileScreenState();
}

class _ProfessionalSetupProfileScreenState extends State<ProfessionalSetupProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _titleCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  final _expCtrl = TextEditingController();
  final _licenseCtrl = TextEditingController();
  final _orgCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _qualCtrl = TextEditingController();
  final _expertiseCtrl = TextEditingController();

  List<Category> _categories = [];
  int? _categoryId;
  final List<String> _selectedSpecializations = [];
  final List<String> _selectedLanguages = [];
  final List<String> _qualifications = [];
  final List<String> _expertiseAreas = [];
  List<String> _documents = [];
  double _chatRate = 10;
  double _callRate = 15;
  double _videoRate = 20;
  bool _loading = false;
  bool _aiLoading = false;
  bool _uploading = false;

  bool get _isEdit => context.read<AuthProvider>().professionalProfile != null;

  @override
  void initState() {
    super.initState();
    final p = context.read<AuthProvider>().professionalProfile;
    if (p != null) {
      _nameCtrl.text = p.displayName;
      _titleCtrl.text = p.professionTitle ?? '';
      _bioCtrl.text = p.bio ?? '';
      _expCtrl.text = '${p.experienceYears}';
      _licenseCtrl.text = p.licenseNumber ?? '';
      _orgCtrl.text = p.organization ?? '';
      _cityCtrl.text = p.city ?? '';
      _categoryId = p.categoryId;
      _selectedSpecializations.addAll(p.specializations);
      _selectedLanguages.addAll(p.languages);
      _qualifications.addAll(p.qualifications);
      _expertiseAreas.addAll(p.expertiseAreas);
      _documents = List.of(p.documents);
      _chatRate = p.perMinuteRateChat.clamp(1, 500).toDouble();
      _callRate = p.perMinuteRateCall.clamp(1, 500).toDouble();
      _videoRate = p.perMinuteRateVideo.clamp(1, 500).toDouble();
    } else {
      _nameCtrl.text = context.read<AuthProvider>().user?.name ?? '';
    }
    ApiService.getCategories().then((c) {
      if (mounted) setState(() => _categories = c);
    }).catchError((_) {});
  }

  @override
  void dispose() {
    for (final c in [_nameCtrl, _titleCtrl, _bioCtrl, _expCtrl, _licenseCtrl, _orgCtrl, _cityCtrl, _qualCtrl, _expertiseCtrl]) {
      c.dispose();
    }
    super.dispose();
  }

  Category? get _category {
    for (final c in _categories) {
      if (c.id == _categoryId) return c;
    }
    return null;
  }

  void _snack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: error ? context.clr.error : context.clr.success));
  }

  void _addTag(TextEditingController ctrl, List<String> list) {
    final text = ctrl.text.trim();
    if (text.isEmpty || list.contains(text)) return;
    setState(() { list.add(text); ctrl.clear(); });
  }

  Future<void> _writeBioWithAi() async {
    if (_titleCtrl.text.trim().isEmpty) return _snack('Add your profession title first', error: true);
    setState(() => _aiLoading = true);
    try {
      final out = await ApiService.generateBio({
        'display_name': _nameCtrl.text.trim(),
        'profession_title': _titleCtrl.text.trim(),
        'experience_years': int.tryParse(_expCtrl.text) ?? 0,
        'qualifications': _qualifications,
        'specializations': _selectedSpecializations,
        'organization': _orgCtrl.text.trim(),
        'notes': _bioCtrl.text.trim(),
      });
      setState(() {
        _bioCtrl.text = (out['bio'] ?? '').toString();
        final tags = (out['suggested_specializations'] as List? ?? []).map((e) => e.toString());
        if (_expertiseAreas.isEmpty) _expertiseAreas.addAll(tags);
      });
      _snack('Bio drafted — review and edit before saving');
    } catch (e) {
      _snack(e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> _uploadDocuments() async {
    final picked = await ImagePicker().pickMultiImage(imageQuality: 85);
    if (picked.isEmpty) return;
    setState(() => _uploading = true);
    try {
      final urls = await ApiService.uploadDocuments(picked.take(5).map((x) => File(x.path)).toList());
      setState(() => _documents.addAll(urls));
      _snack('Documents uploaded');
    } catch (e) {
      _snack(e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_categoryId == null) return _snack('Please choose your profession category', error: true);
    if (_selectedLanguages.isEmpty) return _snack('Please select at least one language', error: true);

    setState(() => _loading = true);
    final body = {
      'display_name': _nameCtrl.text.trim(),
      'profession_title': _titleCtrl.text.trim(),
      'category_id': _categoryId,
      'bio': _bioCtrl.text.trim(),
      'experience_years': int.tryParse(_expCtrl.text) ?? 0,
      'qualifications': _qualifications,
      'license_number': _licenseCtrl.text.trim(),
      'organization': _orgCtrl.text.trim(),
      'city': _cityCtrl.text.trim(),
      'specializations': _selectedSpecializations,
      'languages': _selectedLanguages,
      'expertise_areas': _expertiseAreas,
      'per_minute_rate_chat': _chatRate.round(),
      'per_minute_rate_call': _callRate.round(),
      'per_minute_rate_video': _videoRate.round(),
    };
    try {
      final wasEdit = _isEdit;
      if (wasEdit) {
        await ApiService.updateMyProfessionalProfile(body);
      } else {
        await ApiService.registerAsProfessional(body);
      }
      if (!mounted) return;
      await context.read<AuthProvider>().refreshProfessionalProfile();
      if (!mounted) return;
      _snack(wasEdit ? 'Profile updated' : 'Profile submitted! Our team will verify your credentials.');
      if (wasEdit) {
        Navigator.pop(context);
      } else {
        Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const ProfessionalMainScreen()), (_) => false);
      }
    } catch (e) {
      if (mounted) _snack(e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cat = _category;
    return Scaffold(
      appBar: AppBar(
        backgroundColor: context.clr.surface,
        title: Text(_isEdit ? 'Edit Profile' : 'Setup Professional Profile', style: TextStyle(color: context.clr.txtPrimary)),
        iconTheme: IconThemeData(color: context.clr.txtPrimary),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _section('Your Profession', [
                DropdownButtonFormField<int>(
                  value: _categoryId,
                  isExpanded: true,
                  dropdownColor: context.clr.card,
                  decoration: _inputDecoration('Category *', 'Select your field'),
                  style: TextStyle(color: context.clr.txtPrimary),
                  items: _categories.map((c) => DropdownMenuItem(value: c.id, child: Text('${c.icon}  ${c.name}'))).toList(),
                  onChanged: (v) => setState(() { _categoryId = v; _selectedSpecializations.clear(); }),
                ),
                const SizedBox(height: 12),
                _field(_titleCtrl, 'Profession Title *', 'e.g. Cardiologist, Tax Consultant', required: true),
                const SizedBox(height: 12),
                _field(_expCtrl, 'Years of Experience *', 'e.g. 5', keyboardType: TextInputType.number, required: true),
                const SizedBox(height: 12),
                _field(_licenseCtrl, 'License / Registration No.', 'Medical council, Bar council, ICAI…'),
                const SizedBox(height: 12),
                _field(_orgCtrl, 'Organisation', 'Hospital, firm or institute'),
                const SizedBox(height: 12),
                _tagInput(_qualCtrl, _qualifications, 'Qualifications', 'e.g. MBBS, LLB, CA'),
              ]),
              const SizedBox(height: 16),
              _section('Public Profile', [
                _field(_nameCtrl, 'Display Name *', 'Name shown to clients', required: true),
                const SizedBox(height: 12),
                _field(_cityCtrl, 'City', 'e.g. Pune'),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(child: Text('Bio *', style: TextStyle(color: context.clr.txtSecondary, fontSize: 13))),
                  TextButton.icon(
                    onPressed: _aiLoading ? null : _writeBioWithAi,
                    icon: _aiLoading
                        ? SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: context.clr.accent))
                        : Icon(Icons.auto_awesome, size: 16, color: context.clr.accent),
                    label: Text('Write with AI', style: TextStyle(color: context.clr.accent, fontSize: 13)),
                  ),
                ]),
                TextFormField(
                  controller: _bioCtrl,
                  maxLines: 5,
                  style: TextStyle(color: context.clr.txtPrimary),
                  decoration: _inputDecoration('', 'Tell clients how you help. Jot a few notes and tap “Write with AI”.'),
                  validator: (v) => v!.trim().isEmpty ? 'Bio is required' : null,
                ),
              ]),
              const SizedBox(height: 16),
              _section('Specialisations', [
                if (cat == null || cat.subSpecialities.isEmpty)
                  Text('Choose a category to see its specialisations.', style: TextStyle(color: context.clr.txtMuted, fontSize: 13))
                else
                  Wrap(spacing: 8, runSpacing: 8, children: cat.subSpecialities.map((s) => _chip(s, _selectedSpecializations)).toList()),
                const SizedBox(height: 12),
                _tagInput(_expertiseCtrl, _expertiseAreas, 'Other areas you help with', 'e.g. Second opinions'),
              ]),
              const SizedBox(height: 16),
              _section('Languages', [
                Wrap(spacing: 8, runSpacing: 8, children: _languages.map((l) => _chip(l, _selectedLanguages)).toList()),
              ]),
              const SizedBox(height: 16),
              _section('Verification Documents', [
                Text('Upload photos of your degree, license or registration certificate. Only our verification team can see them.',
                    style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
                const SizedBox(height: 10),
                OutlinedButton.icon(
                  onPressed: (!_isEdit || _uploading) ? null : _uploadDocuments,
                  icon: _uploading ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.upload_file),
                  label: Text(_isEdit ? 'Upload documents' : 'Available after you submit your profile'),
                ),
                if (_documents.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text('${_documents.length} document(s) on file', style: TextStyle(color: context.clr.success, fontSize: 12)),
                ],
              ]),
              const SizedBox(height: 16),
              _section('Per Minute Rates (₹)', [
                _rateSlider('Chat', _chatRate, (v) => setState(() => _chatRate = v)),
                _rateSlider('Voice Call', _callRate, (v) => setState(() => _callRate = v)),
                _rateSlider('Video Call', _videoRate, (v) => setState(() => _videoRate = v)),
                Text('You keep 80% of every consultation minute.', style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
              ]),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(_isEdit ? 'Save Changes' : 'Submit for Verification'),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _section(String title, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.clr.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.clr.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.bold, fontSize: 15)),
        const SizedBox(height: 12),
        ...children,
      ]),
    );
  }

  Widget _field(TextEditingController ctrl, String label, String hint, {TextInputType? keyboardType, bool required = false}) {
    return TextFormField(
      controller: ctrl,
      keyboardType: keyboardType,
      style: TextStyle(color: context.clr.txtPrimary),
      decoration: _inputDecoration(label, hint),
      validator: required ? (v) => v!.trim().isEmpty ? '${label.replaceAll(' *', '')} is required' : null : null,
    );
  }

  Widget _tagInput(TextEditingController ctrl, List<String> list, String label, String hint) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Expanded(
          child: TextField(
            controller: ctrl,
            style: TextStyle(color: context.clr.txtPrimary),
            decoration: _inputDecoration(label, hint),
            onSubmitted: (_) => _addTag(ctrl, list),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: () => _addTag(ctrl, list),
          child: Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: context.clr.accent, borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.add, color: Colors.white),
          ),
        ),
      ]),
      if (list.isNotEmpty) ...[
        const SizedBox(height: 8),
        Wrap(
          spacing: 8, runSpacing: 8,
          children: list.map((a) => Chip(
            label: Text(a, style: const TextStyle(color: Colors.white, fontSize: 12)),
            backgroundColor: context.clr.accent.withValues(alpha: 0.7),
            deleteIconColor: Colors.white70,
            onDeleted: () => setState(() => list.remove(a)),
          )).toList(),
        ),
      ],
    ]);
  }

  InputDecoration _inputDecoration(String label, String hint) => InputDecoration(
    labelText: label.isEmpty ? null : label,
    hintText: hint,
    hintStyle: TextStyle(color: context.clr.txtMuted),
    labelStyle: TextStyle(color: context.clr.txtSecondary),
    filled: true,
    fillColor: context.clr.surface,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: context.clr.border)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: context.clr.border)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: context.clr.accent)),
  );

  Widget _chip(String label, List<String> selected) {
    final isSelected = selected.contains(label);
    return GestureDetector(
      onTap: () => setState(() => isSelected ? selected.remove(label) : selected.add(label)),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? context.clr.accent : context.clr.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? context.clr.accent : context.clr.border),
        ),
        child: Text(label, style: TextStyle(color: isSelected ? Colors.white : context.clr.txtSecondary, fontSize: 13)),
      ),
    );
  }

  Widget _rateSlider(String label, double value, ValueChanged<double> onChanged) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: TextStyle(color: context.clr.txtSecondary, fontSize: 13)),
        Text('₹${value.toStringAsFixed(0)}/min', style: TextStyle(color: context.clr.accent, fontWeight: FontWeight.bold)),
      ]),
      SliderTheme(
        data: SliderTheme.of(context).copyWith(
          activeTrackColor: context.clr.accent,
          thumbColor: context.clr.accent,
          inactiveTrackColor: context.clr.border,
          overlayColor: context.clr.accent.withValues(alpha: 0.2),
        ),
        child: Slider(value: value, min: 1, max: 500, divisions: 499, onChanged: onChanged),
      ),
    ]);
  }
}
