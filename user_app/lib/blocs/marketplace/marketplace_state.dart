import 'package:equatable/equatable.dart';
import '../../models/professional.dart';

abstract class MarketplaceState extends Equatable {
  const MarketplaceState();
  @override
  List<Object?> get props => [];
}

class MarketplaceInitial extends MarketplaceState {
  const MarketplaceInitial();
}

class MarketplaceLoading extends MarketplaceState {
  const MarketplaceLoading();
}

class MarketplaceError extends MarketplaceState {
  const MarketplaceError();
}

class MarketplaceLoaded extends MarketplaceState {
  final List<Professional> professionals;
  final List<Category> categories;
  final String searchQuery;
  /// Category slug, e.g. 'legal'. Null = all fields.
  final String? selectedCategory;
  final bool onlineOnly;
  final String sortBy;

  const MarketplaceLoaded({
    this.professionals = const [],
    this.categories = const [],
    this.searchQuery = '',
    this.selectedCategory,
    this.onlineOnly = false,
    this.sortBy = 'rating',
  });

  MarketplaceLoaded copyWith({
    List<Professional>? professionals,
    List<Category>? categories,
    String? searchQuery,
    Object? selectedCategory = _sentinel,
    bool? onlineOnly,
    String? sortBy,
  }) =>
      MarketplaceLoaded(
        professionals: professionals ?? this.professionals,
        categories: categories ?? this.categories,
        searchQuery: searchQuery ?? this.searchQuery,
        selectedCategory: selectedCategory == _sentinel ? this.selectedCategory : selectedCategory as String?,
        onlineOnly: onlineOnly ?? this.onlineOnly,
        sortBy: sortBy ?? this.sortBy,
      );

  @override
  List<Object?> get props => [professionals, categories, searchQuery, selectedCategory, onlineOnly, sortBy];
}

// Sentinel to distinguish "not passed" from explicit null
const Object _sentinel = Object();
