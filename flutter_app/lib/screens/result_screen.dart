import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../api/api_client.dart';
import '../theme/app_theme.dart';

class ResultScreen extends StatefulWidget {
  final String attemptId;
  const ResultScreen({super.key, required this.attemptId});
  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  Map<String, dynamic>? _attempt;
  Map<String, dynamic>? _test;
  bool _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final attempt = await ApiClient.get('/attempts/${widget.attemptId}');
      final test = await ApiClient.get('/tests/${attempt['test_id']}', auth: false);
      setState(() { _attempt = attempt; _test = test; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_attempt == null) return Scaffold(body: Center(child: Text('Результат не найден', style: GoogleFonts.dmSans())));

    final score = _attempt!['score'] ?? 0;
    final total = _attempt!['total'] ?? 1;
    final pct = total > 0 ? (score / total * 100).round() : 0;
    final passed = pct >= 70;

    return Scaffold(
      body: Center(child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500),
        child: Card(child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(_test?['title'] ?? 'Результат', style: GoogleFonts.playfairDisplay(fontSize: 22, fontWeight: FontWeight.w400), textAlign: TextAlign.center),
            const SizedBox(height: 32),
            Container(
              width: 120, height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: passed ? AppTheme.green : AppTheme.red, width: 3),
                color: (passed ? AppTheme.green : AppTheme.red).withOpacity(0.08),
              ),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('$pct%', style: GoogleFonts.playfairDisplay(fontSize: 36, fontWeight: FontWeight.w400, color: passed ? AppTheme.green : AppTheme.red)),
              ]),
            ),
            const SizedBox(height: 20),
            Text('$score из $total правильных', style: GoogleFonts.dmSans(fontSize: 16, color: AppTheme.ink600)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: (passed ? AppTheme.green : AppTheme.red).withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(passed ? 'Тест пройден' : 'Тест не пройден',
                style: GoogleFonts.dmSans(fontSize: 14, color: passed ? AppTheme.green : AppTheme.red, fontWeight: FontWeight.w500)),
            ),
            const SizedBox(height: 32),
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => context.go('/catalog'), child: const Text('В каталог'))),
              const SizedBox(width: 12),
              Expanded(child: ElevatedButton(onPressed: () => context.go('/test/${_attempt!['test_id']}'), child: const Text('Повторить'))),
            ]),
          ]),
        )),
      )),
    );
  }
}
