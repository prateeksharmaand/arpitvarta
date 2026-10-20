import 'package:flutter_test/flutter_test.dart';
import 'package:arpitvarta/models/professional.dart';

void main() {
  test('Professional.fromJson parses profession fields', () {
    final p = Professional.fromJson({
      'id': 'p1',
      'user_id': 'u1',
      'display_name': 'adv. vikram singh',
      'profession_title': 'Property Lawyer',
      'category_slug': 'legal',
      'category_name': 'Lawyers',
      'qualifications': ['LLB', 'LLM'],
      'per_minute_rate_chat': '25.00',
      'rating': '4.80',
    });
    expect(p.displayName, 'Adv. Vikram Singh');
    expect(p.titleText, 'Property Lawyer');
    expect(p.qualificationsText, 'LLB, LLM');
    expect(p.perMinuteRateChat, 25);
  });

  test('AiAssistResult parses categories and professionals', () {
    final r = AiAssistResult.fromJson({
      'summary': 'Deposit dispute',
      'urgency': 'emergency',
      'categories': [{'id': 2, 'slug': 'legal', 'name': 'Lawyers'}],
      'professionals': [{'id': 'p1', 'display_name': 'A'}],
      'general_guidance': ['Keep receipts'],
    });
    expect(r.isEmergency, isTrue);
    expect(r.categories.single.slug, 'legal');
    expect(r.professionals, hasLength(1));
    expect(r.guidance.single, 'Keep receipts');
  });
}
