import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/auth_provider.dart';
import '../theme/app_theme.dart';
import 'package:google_fonts/google_fonts.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameCtrl = TextEditingController();
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
                Text('Создать аккаунт', style: GoogleFonts.playfairDisplay(fontSize: 28, fontWeight: FontWeight.w400), textAlign: TextAlign.center),
                const SizedBox(height: 8),
                Text('Начните учиться прямо сейчас', style: GoogleFonts.dmSans(color: AppTheme.ink600, fontSize: 14), textAlign: TextAlign.center),
                const SizedBox(height: 32),
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFFFECACA))),
                    child: Text(_error!, style: const TextStyle(color: AppTheme.red, fontSize: 13)),
                  ),
                  const SizedBox(height: 16),
                ],
                TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Имя')),
                const SizedBox(height: 12),
                TextField(controller: _emailCtrl, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
                const SizedBox(height: 12),
                TextField(controller: _passCtrl, decoration: const InputDecoration(labelText: 'Пароль (мин. 6 символов)'), obscureText: true),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _loading ? null : _register,
                  child: _loading ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Зарегистрироваться'),
                ),
                const SizedBox(height: 16),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text('Уже есть аккаунт? ', style: GoogleFonts.dmSans(color: AppTheme.ink600, fontSize: 13)),
                  GestureDetector(
                    onTap: () => context.go('/login'),
                    child: Text('Войти', style: GoogleFonts.dmSans(fontSize: 13, decoration: TextDecoration.underline)),
                  ),
                ]),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _register() async {
    if (_passCtrl.text.length < 6) { setState(() => _error = 'Пароль минимум 6 символов'); return; }
    setState(() { _loading = true; _error = null; });
    try {
      await context.read<AuthProvider>().register(_emailCtrl.text.trim(), _passCtrl.text, _nameCtrl.text.trim());
      if (mounted) context.go('/catalog');
    } catch (_) {
      setState(() { _error = 'Ошибка регистрации. Возможно email уже занят.'; });
    }
    setState(() { _loading = false; });
  }
}
