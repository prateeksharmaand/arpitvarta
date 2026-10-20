import 'package:flutter_bloc/flutter_bloc.dart';
import '../../models/professional.dart';
import '../../services/api_service.dart';
import 'marketplace_state.dart';

class MarketplaceCubit extends Cubit<MarketplaceState> {
  MarketplaceCubit() : super(const MarketplaceInitial());

  List<Category> _categories = [];

  Future<void> load({String? category}) async {
    final current = state;
    final String sortBy = current is MarketplaceLoaded ? current.sortBy : 'rating';
    final bool onlineOnly = current is MarketplaceLoaded ? current.onlineOnly : false;
    final String? cat = category ?? (current is MarketplaceLoaded ? current.selectedCategory : null);
    final String q = current is MarketplaceLoaded ? current.searchQuery : '';

    emit(const MarketplaceLoading());
    try {
      if (_categories.isEmpty) {
        _categories = await ApiService.getCategories().catchError((_) => <Category>[]);
      }
      final data = await ApiService.getProfessionals(category: cat, query: q, sort: sortBy, onlineOnly: onlineOnly, limit: 50);
      emit(MarketplaceLoaded(
        professionals: data,
        categories: _categories,
        sortBy: sortBy,
        onlineOnly: onlineOnly,
        selectedCategory: cat,
        searchQuery: q,
      ));
    } catch (_) {
      emit(const MarketplaceError());
    }
  }

  /// Local filter for instant feedback; [submitSearch] queries the server.
  Future<void> search(String q) async {
    final current = state;
    if (current is MarketplaceLoaded) emit(current.copyWith(searchQuery: q));
  }

  Future<void> submitSearch(String q) async {
    final current = state;
    if (current is MarketplaceLoaded) {
      emit(current.copyWith(searchQuery: q));
      await _reloadFromCurrent();
    }
  }

  Future<void> selectCategory(String? slug) async {
    final current = state;
    if (current is MarketplaceLoaded) {
      emit(current.copyWith(selectedCategory: slug));
      await _reloadFromCurrent();
    } else {
      await load(category: slug);
    }
  }

  Future<void> toggleOnline() async {
    final current = state;
    if (current is MarketplaceLoaded) {
      emit(current.copyWith(onlineOnly: !current.onlineOnly));
      await _reloadFromCurrent();
    }
  }

  Future<void> changeSortBy(String sort) async {
    final current = state;
    if (current is MarketplaceLoaded) {
      emit(current.copyWith(sortBy: sort));
      await _reloadFromCurrent();
    }
  }

  Future<void> _reloadFromCurrent() async {
    final current = state;
    if (current is! MarketplaceLoaded) return;
    // Keep the current loaded state visible while fetching; replace list when done
    try {
      final data = await ApiService.getProfessionals(
        category: current.selectedCategory,
        query: current.searchQuery,
        sort: current.sortBy,
        onlineOnly: current.onlineOnly,
        limit: 50,
      );
      if (state is MarketplaceLoaded) {
        emit((state as MarketplaceLoaded).copyWith(professionals: data));
      }
    } catch (_) {
      // silently keep old list on error
    }
  }
}
