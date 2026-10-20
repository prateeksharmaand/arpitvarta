import 'dart:io';
import 'package:flutter/material.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../models/user.dart';
import '../models/professional.dart';
import '../services/api_service.dart';

class ProfessionalProfile {
  final String id;
  final String userId;
  final String displayName;
  final String? bio;
  final String? avatarUrl;
  final int experienceYears;
  final List<String> languages;
  final List<String> specializations;
  final List<String> expertiseAreas;
  final double perMinuteRateChat;
  final double perMinuteRateCall;
  final double perMinuteRateVideo;
  final double rating;
  final int reviewCount;
  final int totalConsultations;
  final bool isOnline;
  final bool isAvailable;
  final String approvalStatus; // pending, approved, rejected
  final String? rejectionReason;
  final String? professionTitle;
  final int? categoryId;
  final String? categoryName;
  final String? categoryIcon;
  final List<String> qualifications;
  final String? licenseNumber;
  final String? organization;
  final String? city;
  final List<String> documents;
  final bool isVerified;

  ProfessionalProfile({
    required this.id,
    required this.userId,
    required this.displayName,
    this.bio,
    this.avatarUrl,
    this.experienceYears = 0,
    this.languages = const [],
    this.specializations = const [],
    this.expertiseAreas = const [],
    this.perMinuteRateChat = 10,
    this.perMinuteRateCall = 15,
    this.perMinuteRateVideo = 20,
    this.rating = 0,
    this.reviewCount = 0,
    this.totalConsultations = 0,
    this.isOnline = false,
    this.isAvailable = true,
    this.approvalStatus = 'pending',
    this.rejectionReason,
    this.professionTitle,
    this.categoryId,
    this.categoryName,
    this.categoryIcon,
    this.qualifications = const [],
    this.licenseNumber,
    this.organization,
    this.city,
    this.documents = const [],
    this.isVerified = false,
  });

  factory ProfessionalProfile.fromJson(Map<String, dynamic> json) {
    List<String> parseList(dynamic v) {
      if (v == null) return [];
      if (v is List) return v.map((e) => e.toString()).toList();
      return [];
    }

    return ProfessionalProfile(
      id: json['id'] ?? '',
      userId: json['user_id'] ?? '',
      displayName: json['display_name'] ?? json['name'] ?? '',
      bio: json['bio'],
      avatarUrl: json['avatar_url'],
      experienceYears: json['experience_years'] ?? 0,
      languages: parseList(json['languages']),
      specializations: parseList(json['specializations']),
      expertiseAreas: parseList(json['expertise_areas']),
      perMinuteRateChat: double.tryParse(json['per_minute_rate_chat']?.toString() ?? '10') ?? 10,
      perMinuteRateCall: double.tryParse(json['per_minute_rate_call']?.toString() ?? '15') ?? 15,
      perMinuteRateVideo: double.tryParse(json['per_minute_rate_video']?.toString() ?? '20') ?? 20,
      rating: double.tryParse(json['rating']?.toString() ?? '0') ?? 0,
      reviewCount: json['review_count'] ?? 0,
      totalConsultations: json['total_consultations'] ?? 0,
      isOnline: json['is_online'] ?? false,
      isAvailable: json['is_available'] ?? true,
      approvalStatus: json['approval_status'] ?? json['status'] ?? 'pending',
      rejectionReason: json['rejection_reason'],
      professionTitle: json['profession_title'],
      categoryId: json['category_id'] is int ? json['category_id'] : int.tryParse('${json['category_id'] ?? ''}'),
      categoryName: json['category_name'],
      categoryIcon: json['category_icon'],
      qualifications: parseList(json['qualifications']),
      licenseNumber: json['license_number'],
      organization: json['organization'],
      city: json['city'],
      documents: parseList(json['documents']),
      isVerified: json['is_verified'] == true,
    );
  }

  ProfessionalProfile copyWith({bool? isAvailable, bool? isOnline}) => ProfessionalProfile(
    id: id,
    userId: userId,
    displayName: displayName,
    bio: bio,
    avatarUrl: avatarUrl,
    experienceYears: experienceYears,
    languages: languages,
    specializations: specializations,
    expertiseAreas: expertiseAreas,
    perMinuteRateChat: perMinuteRateChat,
    perMinuteRateCall: perMinuteRateCall,
    perMinuteRateVideo: perMinuteRateVideo,
    rating: rating,
    reviewCount: reviewCount,
    totalConsultations: totalConsultations,
    isOnline: isOnline ?? this.isOnline,
    isAvailable: isAvailable ?? this.isAvailable,
    approvalStatus: approvalStatus,
    rejectionReason: rejectionReason,
    professionTitle: professionTitle,
    categoryId: categoryId,
    categoryName: categoryName,
    categoryIcon: categoryIcon,
    qualifications: qualifications,
    licenseNumber: licenseNumber,
    organization: organization,
    city: city,
    documents: documents,
    isVerified: isVerified,
  );

  String get titleText => professionTitle ?? categoryName ?? 'Professional';

  bool get isApproved => approvalStatus == 'approved';
  bool get isPending => approvalStatus == 'pending';
}

class AuthProvider extends ChangeNotifier {
  User? _user;
  ProfessionalProfile? _professionalProfile;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  ProfessionalProfile? get professionalProfile => _professionalProfile;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;
  bool get isProfessional => _professionalProfile != null;

  void setProfessionalProfile(ProfessionalProfile? profile) {
    _professionalProfile = profile;
    notifyListeners();
  }

  Future<bool> tryAutoLogin() async {
    try {
      final token = await ApiService.getToken();
      if (token == null) return false;
      _user = await ApiService.getProfile();
      notifyListeners();
      _registerFcmToken();
      await _fetchProfessionalProfile();
      return true;
    } catch (_) {
      await ApiService.clearToken();
      return false;
    }
  }

  Future<bool> login(String email, String password, {String loginAs = 'user'}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await ApiService.login(email, password, loginAs: loginAs);
      await ApiService.saveToken(data['data']['token']);
      _user = User.fromJson(data['data']['user']);
      _isLoading = false;
      notifyListeners();
      _registerFcmToken();
      await _fetchProfessionalProfile();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String name,
    String? phone,
    String? city,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await ApiService.register(
        email: email, password: password, name: name,
        phone: phone, city: city,
      );
      await ApiService.saveToken(data['data']['token']);
      _user = User.fromJson(data['data']['user']);
      _isLoading = false;
      notifyListeners();
      _registerFcmToken();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await ApiService.clearToken();
    _user = null;
    _professionalProfile = null;
    notifyListeners();
  }

  Future<void> refreshUser() async {
    try {
      _user = await ApiService.getProfile();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> refreshProfessionalProfile() async {
    await _fetchProfessionalProfile();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<void> _fetchProfessionalProfile() async {
    try {
      // GET /professionals/me returns the profile joined with its category.
      final professionalJson = await ApiService.getMyProfessionalProfile();
      if (professionalJson.containsKey('id')) {
        _professionalProfile = ProfessionalProfile.fromJson(professionalJson);
        notifyListeners();
      }
    } catch (_) {
      // Not registered as professional yet — fine
    }
  }

  Future<void> _registerFcmToken() async {
    try {
      // Firebase may not be initialized (e.g. missing google-services.json in dev)
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(alert: true, badge: true, sound: true)
          .timeout(const Duration(seconds: 5));
      if (settings.authorizationStatus == AuthorizationStatus.denied) return;
      final token = await messaging.getToken().timeout(const Duration(seconds: 5));
      if (token == null) return;
      final platform = Platform.isIOS ? 'ios' : 'android';
      await ApiService.registerPushToken(token, platform);
      messaging.onTokenRefresh.listen((newToken) async {
        await ApiService.registerPushToken(newToken, platform);
      });
    } catch (e) {
      debugPrint('FCM token registration failed (non-fatal): $e');
    }
  }
}