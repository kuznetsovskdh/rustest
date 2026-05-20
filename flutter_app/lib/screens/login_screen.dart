import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/auth_provider.dart';
import '../theme/app_theme.dart';
import 'package:google_fonts/google_fonts.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Text('Добро пожаловать', style: GoogleFonts.playfairDisplay(fontSize: 28, fontWeight: FontWeight.w400), textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text('Войдите в свой аккаунт', style: GoogleFonts.dmSans(color: AppTheme.ink600, fontSize: 14), textAlign: TextAlign.center),
                const SizedBox(height: 32),
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFFFECACA))),
                    child: Text(_error!, style: const TextStyle(color: AppTheme.red, fontSize: 13)),
                  ),
                  const SizedBox(height: 16),
                ],
                TextField(controller: _emailCtrl, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
                const SizedBox(height: 12),
                TextField(controller: _passCtrl, decoration: const InputDecoration(labelText: 'Пароль'), obscureText: true),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _loading ? null : _login,
                  child: _loading ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Войти'),
                ),
                const SizedBox(height: 16),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text('Нет аккаунта? ', style: GoogleFonts.dmSans(color: AppTheme.ink600, fontSize: 13)),
                  GestureDetector(
                    onTap: () => context.go('/register'),
                    child: Text('Зарегистрироваться', style: GoogleFonts.dmSans(fontSize: 13, decoration: TextDecoration.underline)),
                  ),
                ]),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _login() async {
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthProvider>().login(_emailCtrl.text.trim(), _passCtrl.text);
      if (mounted) context.go('/catalog');
    } catch (_) {
      setState(() { _error = 'Неверный email или пароль'; });
    }
    setState(() { _loading = false; });
  }
}
