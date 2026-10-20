import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';
import '../models/professional.dart';

class ApiService {
  // Override for local dev, e.g.
  //   flutter run --dart-define=API_HOST=http://10.0.2.2:3000   (Android emulator)
  //   flutter run --dart-define=API_HOST=http://localhost:3000  (iOS simulator)
  static const String socketUrl = String.fromEnvironment('API_HOST', defaultValue: 'https://api.arpitvarta.com');
  static const String baseUrl = '$socketUrl/api';
  static const _storage = FlutterSecureStorage();

  static Future<String?> getToken() => _storage.read(key: 'auth_token');
  static Future<void> saveToken(String t) => _storage.write(key: 'auth_token', value: t);
  static Future<void> clearToken() => _storage.delete(key: 'auth_token');

  static Future<Map<String, String>> _headers({bool auth = false}) async {
    final h = {'Content-Type': 'application/json'};
    if (auth) {
      final t = await getToken();
      if (t != null) h['Authorization'] = 'Bearer $t';
    }
    return h;
  }

  static Future<Map<String, dynamic>> _handle(http.Response r) async {
    // Guard against HTML error pages / empty responses (nginx 502, 503, etc.)
    final body = r.body.trim();
    if (body.isEmpty) {
      throw ApiException('Server returned empty response (${r.statusCode})', r.statusCode);
    }
    if (!body.startsWith('{') && !body.startsWith('[')) {
      // Server returned HTML — likely a 502 Bad Gateway or nginx error page
      throw ApiException('Server error (${r.statusCode}): API server may be down or misconfigured', r.statusCode);
    }
    Map<String, dynamic> data;
    try {
      data = jsonDecode(body) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException('Invalid response format (${r.statusCode})', r.statusCode);
    }
    if (r.statusCode >= 200 && r.statusCode < 300) return data;
    throw ApiException(data['message'] ?? 'Request failed', r.statusCode);
  }

  // ── Auth ──────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> register({required String email, required String password, required String name, String? phone, String? city}) async {
    final r = await http.post(Uri.parse('$baseUrl/auth/register'), headers: await _headers(), body: jsonEncode({'email': email, 'password': password, 'name': name, 'phone': phone, 'city': city}));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final r = await http.post(Uri.parse('$baseUrl/auth/login'), headers: await _headers(), body: jsonEncode({'email': email, 'password': password, 'login_as': 'user'}));
    return _handle(r);
  }

  static Future<User> getProfile() async {
    final r = await http.get(Uri.parse('$baseUrl/auth/profile'), headers: await _headers(auth: true));
    return User.fromJson((await _handle(r))['data']);
  }

  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final r = await http.put(Uri.parse('$baseUrl/auth/profile'), headers: await _headers(auth: true), body: jsonEncode(data));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> uploadAvatar(File imageFile) async {
    final token = await getToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/auth/avatar'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('avatar', imageFile.path));
    final streamed = await request.send();
    final r = await http.Response.fromStream(streamed);
    return _handle(r);
  }

  static Future<String> uploadChatImage(File imageFile) async {
    final token = await getToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/consultations/upload-image'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));
    final streamed = await request.send();
    final r = await http.Response.fromStream(streamed);
    final data = await _handle(r);
    return (data['data']?['url'] ?? data['url']) as String;
  }

  // ── Dashboard ─────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getDashboard() async {
    final r = await http.get(Uri.parse('$baseUrl/dashboard'), headers: await _headers(auth: true));
    return _handle(r);
  }

  // ── Categories & AI assistant ────────────────────────────────
  static Future<List<Category>> getCategories() async {
    final r = await http.get(Uri.parse('$baseUrl/categories'), headers: await _headers());
    return ((await _handle(r))['data'] as List).map((e) => Category.fromJson(e)).toList();
  }

  static Future<AiAssistResult> aiAssist(String query) async {
    final r = await http.post(Uri.parse('$baseUrl/ai/assist'), headers: await _headers(auth: true), body: jsonEncode({'query': query}));
    return AiAssistResult.fromJson((await _handle(r))['data']);
  }

  // ── Professionals ───────────────────────────────────────────────
  static Future<List<Professional>> getProfessionals({String? category, String? query, String? specialization, String? sort, bool? onlineOnly, int page = 1, int limit = 20}) async {
    final params = <String, String>{'page': '$page', 'limit': '$limit'};
    if (category != null && category.isNotEmpty) params['category'] = category;
    if (query != null && query.trim().isNotEmpty) params['q'] = query.trim();
    if (specialization != null) params['specialization'] = specialization;
    if (sort != null) params['sort'] = sort;
    if (onlineOnly == true) params['online_only'] = 'true';
    final uri = Uri.parse('$baseUrl/professionals').replace(queryParameters: params);
    final r = await http.get(uri, headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => Professional.fromJson(e)).toList();
  }

  static Future<Professional> getProfessional(String id) async {
    final r = await http.get(Uri.parse('$baseUrl/professionals/$id'), headers: await _headers(auth: true));
    return Professional.fromJson((await _handle(r))['data']);
  }

  static Future<List<Review>> getProfessionalReviews(String id) async {
    final r = await http.get(Uri.parse('$baseUrl/professionals/$id/reviews'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => Review.fromJson(e)).toList();
  }

  static Future<void> submitReview(String professionalId, int rating, String text, String consultationId) async {
    final r = await http.post(Uri.parse('$baseUrl/professionals/$professionalId/reviews'), headers: await _headers(auth: true), body: jsonEncode({'rating': rating, 'review_text': text, 'consultation_id': consultationId}));
    await _handle(r);
  }

  static Future<void> endConsultation(String consultationId) async {
    final r = await http.patch(Uri.parse('$baseUrl/consultations/$consultationId/end'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<List<Consultation>> getConsultationHistory() async {
    final r = await http.get(Uri.parse('$baseUrl/professionals/consultations/history'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => Consultation.fromJson(e)).toList();
  }

  // ── Wallet ────────────────────────────────────────────────────
  static Future<WalletData> getWallet() async {
    final r = await http.get(Uri.parse('$baseUrl/wallet'), headers: await _headers(auth: true));
    return WalletData.fromJson((await _handle(r))['data']);
  }

  static Future<Map<String, dynamic>> getWalletStats() async {
    final r = await http.get(Uri.parse('$baseUrl/wallet/stats'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<List<WalletTransaction>> getTransactions() async {
    final r = await http.get(Uri.parse('$baseUrl/wallet/transactions'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => WalletTransaction.fromJson(e)).toList();
  }

  static Future<List<RechargeOffer>> getRechargeOffers() async {
    final r = await http.get(Uri.parse('$baseUrl/wallet/recharge-offers'), headers: await _headers());
    return ((await _handle(r))['data'] as List).map((e) => RechargeOffer.fromJson(e)).toList();
  }

  static Future<Map<String, dynamic>> createAddMoneyOrder(double amount) async {
    final r = await http.post(Uri.parse('$baseUrl/wallet/add-money/order'), headers: await _headers(auth: true), body: jsonEncode({'amount': amount}));
    return _handle(r);
  }

  static Future<WalletData> verifyAndCredit(Map<String, dynamic> payload) async {
    final r = await http.post(Uri.parse('$baseUrl/wallet/add-money/verify'), headers: await _headers(auth: true), body: jsonEncode(payload));
    return WalletData.fromJson((await _handle(r))['data']);
  }

  static Future<List<SubscriptionPlan>> getSubscriptionPlans() async {
    final r = await http.get(Uri.parse('$baseUrl/wallet/plans'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => SubscriptionPlan.fromJson(e)).toList();
  }

  static Future<void> purchaseSubscription(String planId) async {
    final r = await http.post(Uri.parse('$baseUrl/wallet/subscribe'), headers: await _headers(auth: true), body: jsonEncode({'plan_id': planId}));
    await _handle(r);
  }

  // ── Agora ─────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getAgoraToken(String channel, {int uid = 0}) async {
    final r = await http.get(Uri.parse('$baseUrl/agora/token?channel=$channel&uid=$uid'), headers: await _headers(auth: true));
    return await _handle(r);
  }

  // ── Live & Community ──────────────────────────────────────────
  static Future<List<LiveSession>> getLiveSessions() async {
    final r = await http.get(Uri.parse('$baseUrl/live/sessions'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => LiveSession.fromJson(e)).toList();
  }

  static Future<List<CommunityPost>> getCommunityPosts({String? category}) async {
    final r = await http.get(Uri.parse('$baseUrl/live/community${category != null ? "?category=$category" : ""}'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => CommunityPost.fromJson(e)).toList();
  }

  static Future<void> toggleLike(String postId) async {
    final r = await http.post(Uri.parse('$baseUrl/live/community/$postId/like'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<void> createPost(String content, {String? category}) async {
    final r = await http.post(Uri.parse('$baseUrl/live/community'), headers: await _headers(auth: true), body: jsonEncode({'content': content, 'category': category}));
    await _handle(r);
  }

  // ── Notifications ─────────────────────────────────────────────
  static Future<List<dynamic>> getNotifications() async {
    final r = await http.get(Uri.parse('$baseUrl/live/notifications'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  static Future<void> markAllNotificationsRead() async {
    final r = await http.patch(Uri.parse('$baseUrl/live/notifications/read-all'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<void> registerPushToken(String token, String platform) async {
    final r = await http.post(Uri.parse('$baseUrl/live/push-token'), headers: await _headers(auth: true), body: jsonEncode({'token': token, 'platform': platform, 'app_type': 'user_app'}));
    await _handle(r);
  }

  // ── Professional Self (dashboard, register, availability) ──────
  static Future<Map<String, dynamic>> getProfessionalDashboard() async {
    final r = await http.get(Uri.parse('$baseUrl/professionals/me/dashboard'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> registerAsProfessional(Map<String, dynamic> data) async {
    final r = await http.post(Uri.parse('$baseUrl/professionals/register'), headers: await _headers(auth: true), body: jsonEncode(data));
    return _handle(r);
  }

  static Future<void> updateAvailability(bool isAvailable) async {
    final r = await http.patch(Uri.parse('$baseUrl/professionals/availability'), headers: await _headers(auth: true), body: jsonEncode({'is_available': isAvailable}));
    await _handle(r);
  }

  static Future<List<dynamic>> getProfessionalTransactions() async {
    final r = await http.get(Uri.parse('$baseUrl/professionals/me/transactions'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  static Future<Map<String, dynamic>> getProfessionalWallet() async {
    final r = await http.get(Uri.parse('$baseUrl/professionals/me/wallet'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> requestWithdrawal(double amount, Map<String, dynamic> bankDetails) async {
    final r = await http.post(Uri.parse('$baseUrl/withdrawal'), headers: await _headers(auth: true), body: jsonEncode({'amount': amount, ...bankDetails}));
    return _handle(r);
  }

  static Future<List<dynamic>> getWithdrawals() async {
    final r = await http.get(Uri.parse('$baseUrl/withdrawal'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  static Future<Map<String, dynamic>> createLiveSession(Map<String, dynamic> data) async {
    final r = await http.post(Uri.parse('$baseUrl/live/sessions'), headers: await _headers(auth: true), body: jsonEncode(data));
    return _handle(r);
  }

  static Future<void> startLiveSession(String id) async {
    final r = await http.patch(Uri.parse('$baseUrl/live/sessions/$id/start'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<void> endLiveSession(String id) async {
    final r = await http.patch(Uri.parse('$baseUrl/live/sessions/$id/end'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<void> deletePost(String postId) async {
    final r = await http.delete(Uri.parse('$baseUrl/live/community/$postId'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<List<dynamic>> getPostComments(String postId) async {
    final r = await http.get(Uri.parse('$baseUrl/live/community/$postId/comments'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  static Future<void> addComment(String postId, String content) async {
    final r = await http.post(Uri.parse('$baseUrl/live/community/$postId/comments'), headers: await _headers(auth: true), body: jsonEncode({'content': content}));
    await _handle(r);
  }

  static Future<List<dynamic>> getProfessionalConsultations({String? status, int page = 1}) async {
    final r = await http.get(Uri.parse('$baseUrl/professionals/consultations/history'), headers: await _headers(auth: true));
    final data = (await _handle(r))['data'] as List;
    if (status == null) return data;
    return data.where((c) => c['status'] == status).toList();
  }

  static Future<List<dynamic>> getProfessionalConsultationMessages(String consultationId) async {
    final r = await http.get(Uri.parse('$baseUrl/professionals/consultations/$consultationId/messages'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  // ── Chat Threads (professional-wise history) ──────────────────────
  static Future<List<dynamic>> getChatThreads() async {
    final r = await http.get(Uri.parse('$baseUrl/threads'), headers: await _headers(auth: true));
    final data = await _handle(r);
    // Accept both 'threads' and 'data' keys from the backend
    final list = data['threads'] ?? data['data'] ?? data['thread_list'] ?? [];
    return List<dynamic>.from(list);
  }

  static Future<Map<String, dynamic>> getThreadMessages(String professionalId, {String? before, int limit = 50}) async {
    var url = '$baseUrl/threads/$professionalId/messages?limit=$limit';
    if (before != null) url += '&before=${Uri.encodeComponent(before)}';
    final r = await http.get(Uri.parse(url), headers: await _headers(auth: true));
    return await _handle(r);
  }

  // ── Professional Chat Threads (user-wise history) ─────────────────
  static Future<List<dynamic>> getProfessionalChatThreads() async {
    final r = await http.get(Uri.parse('$baseUrl/professionals/threads'), headers: await _headers(auth: true));
    final data = await _handle(r);
    final list = data['threads'] ?? data['data'] ?? [];
    return List<dynamic>.from(list);
  }

  static Future<Map<String, dynamic>> getProfessionalUserMessages(String userId, {String? before, int limit = 50}) async {
    var url = '$baseUrl/professionals/threads/$userId/messages?limit=$limit';
    if (before != null) url += '&before=${Uri.encodeComponent(before)}';
    final r = await http.get(Uri.parse(url), headers: await _headers(auth: true));
    return await _handle(r);
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);
  @override
  String toString() => message;
}
