import 'dart:convert';
import 'package:flutter/material.dart';
import '../api/api_client.dart';

class AuthProvider extends ChangeNotifier {
  String? _token;
  Map<String, dynamic>? _payload;

  String? get token => _token;
  bool get isLoggedIn => _token != null;
  String get role => _payload?['role'] ?? 'guest';
  bool get isAdmin => role == 'admin';
  bool get isTeacher => role == 'teacher' || isAdmin;
  int? get userId => _payload != null ? int.tryParse(_payload!['sub'].toString()) : null;

  Future<void> init() async {
    _token = await ApiClient.getToken();
    if (_token != null) _parseToken(_token!);
    notifyListeners();
  }

  void _parseToken(String token) {
    try {
      final parts = token.split('.');
      final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
      _payload = jsonDecode(payload);
    } catch (_) {}
  }

  Future<void> login(String email, String password) async {
    final data = await ApiClient.post('/auth/login', {'email': email, 'password': password}, auth: false);
    _token = data['access_token'];
    await ApiClient.setToken(_token!);
    _parseToken(_token!);
    notifyListeners();
  }

  Future<void> register(String email, String password, String name) async {
    final data = await ApiClient.post('/auth/register', {'email': email, 'password': password, 'name': name}, auth: false);
    _token = data['access_token'];
    await ApiClient.setToken(_token!);
    _parseToken(_token!);
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _payload = null;
    await ApiClient.removeToken();
    notifyListeners();
  }
}
