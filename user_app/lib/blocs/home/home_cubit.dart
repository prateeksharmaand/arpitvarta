import 'package:flutter_bloc/flutter_bloc.dart';
import '../../models/professional.dart';
import '../../services/api_service.dart';
import 'home_state.dart';

class HomeCubit extends Cubit<HomeState> {
  HomeCubit() : super(const HomeInitial());

  // GET /dashboard returns categories, top-rated and online professionals
  // and live sessions in one round trip.
  Future<void> load() async {
    emit(const HomeLoading());
    try {
      final res = await ApiService.getDashboard();
      final data = (res['data'] as Map<String, dynamic>?) ?? {};
      List<Professional> pros(String key) =>
          ((data[key] as List?) ?? []).map((e) => Professional.fromJson(e)).toList();
      emit(HomeLoaded(
        dashboardData: data,
        categories: ((data['categories'] as List?) ?? []).map((e) => Category.fromJson(e)).toList(),
        topRated: pros('top_rated'),
        onlineProfessionals: pros('online_now'),
      ));
    } catch (_) {
      emit(const HomeError());
    }
  }

  Future<void> refreshProfessionals() async {
    final current = state;
    if (current is HomeLoaded) {
      emit(current.copyWith(professionalsRefreshing: true));
      try {
        final data = await ApiService.getProfessionals(onlineOnly: true);
        emit(current.copyWith(
          onlineProfessionals: data.take(10).toList(),
          professionalsRefreshing: false,
        ));
      } catch (_) {
        emit(current.copyWith(professionalsRefreshing: false));
      }
    }
  }

  Future<void> refresh() => load();
}
