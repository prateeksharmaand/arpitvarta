import 'package:equatable/equatable.dart';
import '../../models/professional.dart';

abstract class HomeState extends Equatable {
  const HomeState();
  @override
  List<Object?> get props => [];
}

class HomeInitial extends HomeState {
  const HomeInitial();
}

class HomeLoading extends HomeState {
  const HomeLoading();
}

class HomeError extends HomeState {
  const HomeError();
}

class HomeLoaded extends HomeState {
  final Map<String, dynamic>? dashboardData;
  final List<Category> categories;
  final List<Professional> topRated;
  final List<Professional> onlineProfessionals;
  final bool professionalsRefreshing;

  const HomeLoaded({
    this.dashboardData,
    this.categories = const [],
    this.topRated = const [],
    this.onlineProfessionals = const [],
    this.professionalsRefreshing = false,
  });

  double get walletBalance => double.tryParse('${dashboardData?['wallet_balance'] ?? 0}') ?? 0;
  List<dynamic> get liveSessions => (dashboardData?['live_sessions'] as List?) ?? const [];

  HomeLoaded copyWith({
    Map<String, dynamic>? dashboardData,
    List<Category>? categories,
    List<Professional>? topRated,
    List<Professional>? onlineProfessionals,
    bool? professionalsRefreshing,
  }) =>
      HomeLoaded(
        dashboardData: dashboardData ?? this.dashboardData,
        categories: categories ?? this.categories,
        topRated: topRated ?? this.topRated,
        onlineProfessionals: onlineProfessionals ?? this.onlineProfessionals,
        professionalsRefreshing: professionalsRefreshing ?? this.professionalsRefreshing,
      );

  @override
  List<Object?> get props => [dashboardData, categories, topRated, onlineProfessionals, professionalsRefreshing];
}
