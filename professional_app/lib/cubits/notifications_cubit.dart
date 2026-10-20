import 'package:flutter_bloc/flutter_bloc.dart';
import '../services/api_service.dart';

// --------------- State ---------------

class NotificationsState {
  final bool loading;
  final List<dynamic> notifications;

  const NotificationsState({
    this.loading = true,
    this.notifications = const [],
  });

  NotificationsState copyWith({
    bool? loading,
    List<dynamic>? notifications,
  }) =>
      NotificationsState(
        loading: loading ?? this.loading,
        notifications: notifications ?? this.notifications,
      );

  int get unreadCount => notifications.where((n) => n['is_read'] == false).length;
}

// --------------- Cubit ---------------

class NotificationsCubit extends Cubit<NotificationsState> {
  NotificationsCubit() : super(const NotificationsState());

  Future<void> load() async {
    try {
      final data = await ApiService.getNotifications();
      emit(state.copyWith(loading: false, notifications: data));
    } catch (_) {
      emit(state.copyWith(loading: false, notifications: _demoNotifications()));
    }
  }

  Future<void> markAllRead() async {
    await ApiService.markAllNotificationsRead();
    final updated = state.notifications.map((n) => {...n, 'is_read': true}).toList();
    emit(state.copyWith(notifications: updated));
  }

  List<Map<String, dynamic>> _demoNotifications() => [
    {'id': '1', 'title': '📥 New consultation request', 'body': 'A client is waiting to chat with you.', 'type': 'consultation_request', 'is_read': false, 'created_at': DateTime.now().subtract(const Duration(hours: 1)).toIso8601String()},
    {'id': '2', 'title': '✅ Profile verified', 'body': 'Your license has been verified — you can now go online', 'type': 'live_started', 'is_read': false, 'created_at': DateTime.now().subtract(const Duration(hours: 2)).toIso8601String()},
    {'id': '3', 'title': '✅ Consultation completed', 'body': '12-minute session completed — ₹144 earned', 'type': 'consultation_ended', 'is_read': true, 'created_at': DateTime.now().subtract(const Duration(days: 1)).toIso8601String()},
    {'id': '4', 'title': '💰 Wallet credited', 'body': '₹500 added to your wallet successfully', 'type': 'wallet_credit', 'is_read': true, 'created_at': DateTime.now().subtract(const Duration(days: 2)).toIso8601String()},
    {'id': '5', 'title': '🏦 Withdrawal processed', 'body': '₹2,000 has been sent to your bank account', 'type': 'withdrawal', 'is_read': true, 'created_at': DateTime.now().subtract(const Duration(days: 3)).toIso8601String()},
    {'id': '6', 'title': '⭐ New review received', 'body': 'Rahul M. left you a 5-star review', 'type': 'review', 'is_read': true, 'created_at': DateTime.now().subtract(const Duration(days: 4)).toIso8601String()},
  ];
}
