import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiService {
  // Local dev: flutter run --dart-define=API_HOST=http://10.0.2.2:3000
  static const String _host = String.fromEnvironment('API_HOST', defaultValue: 'https://api.arpitvarta.com');
  static const String _base = '$_host/api';

  /// Profession categories (id, slug, name, icon, sub_specialities).
  static Future<List<Map<String, dynamic>>> getCategories() async {
    final r = await http.get(Uri.parse('$_base/categories'));
    final body = jsonDecode(r.body);
    if (r.statusCode != 200) throw body['message'] ?? 'Failed to load categories';
    return (body['data'] as List).cast<Map<String, dynamic>>();
  }

  static Future<String> uploadPhoto(File file) async {
    try {
      final req = http.MultipartRequest('POST', Uri.parse('$_base/hirings/upload-photo'));
      req.files.add(await http.MultipartFile.fromPath('photo', file.path));
      final res = await req.send().timeout(const Duration(seconds: 30));
      final bodyStr = await res.stream.bytesToString();
      final body = jsonDecode(bodyStr);
      if (res.statusCode != 200) throw body['message'] ?? 'Upload failed';
      return body['data']['url'] as String;
    } on Exception catch (e) {
      final msg = e.toString();
      if (msg.contains('SocketException') || msg.contains('Connection') || msg.contains('host lookup')) {
        throw 'No internet connection. Please check your network and try again.';
      }
      if (msg.contains('TimeoutException')) {
        throw 'Upload timed out. Please try again on a faster connection.';
      }
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> submitApplication(Map<String, dynamic> data) async {
    final r = await http.post(
      Uri.parse('$_base/hirings/apply'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(data),
    );
    final body = jsonDecode(r.body);
    if (r.statusCode != 201) throw body['message'] ?? 'Submission failed';
    return body['data'] as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>?> getApplicationStatus(String phone) async {
    try {
      final r = await http.get(Uri.parse('$_base/hirings/status?phone=${Uri.encodeComponent(phone)}'));
      final body = jsonDecode(r.body);
      if (r.statusCode == 404) return null; // Application not submitted yet
      if (r.statusCode != 200) throw body['message'] ?? 'Failed to load status';
      return body['data'] as Map<String, dynamic>;
    } on Exception {
      throw 'Unable to connect. Please check your internet connection.';
    }
  }
}
