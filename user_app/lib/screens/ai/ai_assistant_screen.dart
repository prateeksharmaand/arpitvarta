import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../l10n/app_strings.dart';
import '../../models/professional.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../marketplace/professional_profile_screen.dart';

/// Describe a problem in plain words; the backend AI suggests the right kind
/// of professional, safe first steps and matching experts.
class AiAssistantScreen extends StatefulWidget {
  const AiAssistantScreen({super.key});

  @override
  State<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _AiAssistantScreenState extends State<AiAssistantScreen> {
  final _ctrl = TextEditingController();
  AiAssistResult? _result;
  String? _error;
  bool _loading = false;

  static const _examples = [
    'My landlord won’t return my security deposit',
    'Fever and sore throat for 3 days',
    'Help me file ITR for freelance income',
    'I feel anxious before every meeting',
    'My dog has stopped eating',
  ];

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _ask([String? text]) async {
    final q = (text ?? _ctrl.text).trim();
    if (q.length < 5) return;
    if (text != null) _ctrl.text = text;
    FocusScope.of(context).unfocus();
    setState(() { _loading = true; _error = null; });
    try {
      final r = await ApiService.aiAssist(q);
      if (mounted) setState(() => _result = r);
    } on ApiException catch (e) {
      if (mounted) setState(() { _result = null; _error = e.statusCode == 429 ? e.message : 'The assistant is unavailable right now. You can still browse professionals.'; });
    } catch (_) {
      if (mounted) setState(() { _result = null; _error = 'The assistant is unavailable right now. You can still browse professionals.'; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _urgencyColor(String u) {
    switch (u) {
      case 'low': return context.clr.success;
      case 'high': return context.clr.accent;
      case 'emergency': return context.clr.error;
      default: return context.clr.accentAlt;
    }
  }

  String _urgencyLabel(String u) => const {
        'low': 'Not urgent',
        'medium': 'Consult soon',
        'high': 'Consult today',
        'emergency': 'Emergency',
      }[u] ?? 'Consult soon';

  @override
  Widget build(BuildContext context) {
    final s = context.s;
    return Scaffold(
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 56, 20, 120),
        children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: context.clr.accent.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
              child: Icon(Icons.auto_awesome, color: context.clr.accent),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(s.askAiTitle, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: context.clr.txtPrimary))),
          ]),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
            padding: const EdgeInsets.all(12),
            child: Column(children: [
              TextField(
                controller: _ctrl,
                minLines: 3,
                maxLines: 6,
                maxLength: 2000,
                style: TextStyle(color: context.clr.txtPrimary),
                decoration: InputDecoration(
                  hintText: s.describeProblem,
                  hintStyle: TextStyle(color: context.clr.txtMuted),
                  border: InputBorder.none,
                  counterText: '',
                ),
              ),
              Row(children: [
                Expanded(child: Text('Don’t share passwords, OTPs or bank details.', style: TextStyle(color: context.clr.txtMuted, fontSize: 11))),
                ElevatedButton.icon(
                  onPressed: _loading ? null : () => _ask(),
                  icon: _loading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.auto_awesome, size: 16),
                  label: Text(s.findMyExpert),
                  style: ElevatedButton.styleFrom(backgroundColor: context.clr.accent, foregroundColor: Colors.white),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 12),
          if (_result == null && !_loading)
            Wrap(spacing: 8, runSpacing: 8, children: _examples.map((e) => ActionChip(
              label: Text(e, style: TextStyle(fontSize: 12, color: context.clr.txtSecondary)),
              backgroundColor: context.clr.surfaceLight,
              side: BorderSide(color: context.clr.border),
              onPressed: () => _ask(e),
            )).toList()),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: context.clr.error.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(14)),
              child: Text(_error!, style: TextStyle(color: context.clr.error, fontSize: 13)),
            ),
          ],
          if (_result != null) ..._buildResult(_result!, s),
        ],
      ),
    );
  }

  List<Widget> _buildResult(AiAssistResult r, AppStrings s) {
    final uc = _urgencyColor(r.urgency);
    return [
      const SizedBox(height: 16),
      if (r.isEmergency)
        GestureDetector(
          onTap: () => launchUrl(Uri.parse('tel:112')),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: context.clr.error.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14), border: Border.all(color: context.clr.error)),
            child: Row(children: [
              Icon(Icons.warning_amber_rounded, color: context.clr.error),
              const SizedBox(width: 10),
              Expanded(child: Text(s.emergencyWarning, style: TextStyle(color: context.clr.error, fontWeight: FontWeight.w600))),
              Icon(Icons.call, color: context.clr.error),
            ]),
          ),
        ),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Wrap(spacing: 6, runSpacing: 6, children: [
            ...r.categories.map((c) => _pill(c.name, context.clr.accent)),
            _pill(_urgencyLabel(r.urgency), uc),
            if (r.consultationType != null) _pill('Suggested: ${r.consultationType}', context.clr.txtSecondary),
          ]),
          const SizedBox(height: 10),
          Text(r.summary, style: TextStyle(color: context.clr.txtPrimary, fontSize: 14, height: 1.4)),
          if (r.guidance.isNotEmpty) ...[
            const SizedBox(height: 14),
            _sectionTitle(Icons.check_circle_outline, s.whatToDoNow, context.clr.success),
            ...r.guidance.map(_bullet),
          ],
          if (r.questionsToAsk.isNotEmpty) ...[
            const SizedBox(height: 14),
            _sectionTitle(Icons.help_outline, s.questionsToAsk, context.clr.accent),
            ...r.questionsToAsk.map(_bullet),
          ],
          const SizedBox(height: 12),
          Text(r.disclaimer, style: TextStyle(color: context.clr.txtMuted, fontSize: 11)),
        ]),
      ),
      const SizedBox(height: 20),
      Text(s.recommendedExperts, style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: context.clr.txtPrimary)),
      const SizedBox(height: 10),
      if (r.professionals.isEmpty)
        Text(s.noProfessionalsFound, style: TextStyle(color: context.clr.txtMuted))
      else
        ...r.professionals.map(_proTile),
    ];
  }

  Widget _pill(String text, Color c) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: c.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
        child: Text(text, style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.w600)),
      );

  Widget _sectionTitle(IconData icon, String text, Color c) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(children: [
          Icon(icon, size: 16, color: c),
          const SizedBox(width: 6),
          Text(text, style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
        ]),
      );

  Widget _bullet(String t) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Text('• $t', style: TextStyle(color: context.clr.txtSecondary, fontSize: 13, height: 1.35)),
      );

  Widget _proTile(Professional p) => GestureDetector(
        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProfessionalProfileScreen(professional: p))),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
          child: Row(children: [
            Stack(children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: context.clr.accent.withValues(alpha: 0.15),
                backgroundImage: p.avatarUrl != null ? NetworkImage(p.avatarUrl!) : null,
                child: p.avatarUrl == null ? Text(p.displayName.isNotEmpty ? p.displayName[0] : '?', style: TextStyle(color: context.clr.accent, fontWeight: FontWeight.bold)) : null,
              ),
              if (p.isOnline)
                Positioned(bottom: 0, right: 0, child: Container(width: 11, height: 11, decoration: BoxDecoration(color: context.clr.success, shape: BoxShape.circle, border: Border.all(color: context.clr.card, width: 2)))),
            ]),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(p.displayName, style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w600)),
              Text('${p.titleText} · ${p.experienceText}', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: context.clr.txtSecondary, fontSize: 12)),
            ])),
            Text('₹${p.perMinuteRateChat.toInt()}/min', style: TextStyle(color: context.clr.accent, fontWeight: FontWeight.w700, fontSize: 12)),
          ]),
        ),
      );
}
