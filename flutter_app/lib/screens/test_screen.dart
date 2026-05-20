import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../api/api_client.dart';
import '../models/test.dart';
import 'package:provider/provider.dart';
import '../models/auth_provider.dart';
import '../theme/app_theme.dart';

class TestScreen extends StatefulWidget {
  final String testId;
  const TestScreen({super.key, required this.testId});
  @override
  State<TestScreen> createState() => _TestScreenState();
}

class _TestScreenState extends State<TestScreen> {
  Test? _test;
  bool _loading = true;
  int _current = 0;
  Map<int, int> _answers = {};
  int? _attemptId;
  bool _started = false;
  int _timeLeft = 0;
  Timer? _timer;

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() { _timer?.cancel(); super.dispose(); }

  Future<void> _load() async {
    try {
      final data = await ApiClient.get('/tests/${widget.testId}', auth: false);
      setState(() { _test = Test.fromJson(data); _timeLeft = _test!.timerSeconds; _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _start() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isLoggedIn) {
      context.go('/login');
      return;
    }
    try {
      final data = await ApiClient.post('/attempts/start', {'test_id': _test!.id});
      setState(() { _attemptId = data['id']; _started = true; });
      _timer = Timer.periodic(const Duration(seconds: 1), (t) {
        if (_timeLeft <= 0) { t.cancel(); _finish(); }
        else setState(() => _timeLeft--);
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e')));
    }
  }

  Future<void> _finish() async {
    _timer?.cancel();
    if (_attemptId == null) return;
    final answers = _answers.entries.map((e) {
      final q = _test!.questions.firstWhere((q) => q.id == e.key);
      final opt = q.options.firstWhere((o) => o.id == e.value);
      return {'question_id': e.key, 'selected_option_id': e.value, 'is_correct': opt.isCorrect};
    }).toList();
    try {
      await ApiClient.post('/attempts/${_attemptId}/finish', {'answers': answers});
      if (mounted) context.go('/result/${_attemptId}');
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ошибка: $e')));
    }
  }

  String _formatTime(int s) => '${(s ~/ 60).toString().padLeft(2,'0')}:${(s % 60).toString().padLeft(2,'0')}';

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_test == null) return Scaffold(body: Center(child: Text('Тест не найден', style: GoogleFonts.dmSans())));

    if (!_started) return _buildStartScreen();
    return _buildTestScreen();
  }

  Widget _buildStartScreen() => Scaffold(
    body: Center(child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 500),
      child: Card(child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(_test!.title, style: GoogleFonts.playfairDisplay(fontSize: 24, fontWeight: FontWeight.w400), textAlign: TextAlign.center),
          const SizedBox(height: 16),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            _chip(_test!.category),
            const SizedBox(width: 8),
            _chip('${_test!.questions.length} вопросов'),
            const SizedBox(width: 8),
            _chip('${_test!.timerSeconds ~/ 60} мин'),
          ]),
          const SizedBox(height: 32),
          ElevatedButton(onPressed: _start, style: ElevatedButton.styleFrom(minimumSize: const Size(200, 48)), child: const Text('Начать тест')),
          const SizedBox(height: 12),
          TextButton(onPressed: () => context.go('/catalog'), child: Text('Назад', style: GoogleFonts.dmSans(color: AppTheme.ink600))),
        ]),
      )),
    )),
  );

  Widget _chip(String label) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
    decoration: BoxDecoration(color: AppTheme.paper200, borderRadius: BorderRadius.circular(20), border: Border.all(color: AppTheme.paper300)),
    child: Text(label, style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.ink600)),
  );

  Widget _buildTestScreen() {
    final q = _test!.questions[_current];
    final total = _test!.questions.length;
    final progress = (_current + 1) / total;
    final isLast = _current == total - 1;

    return Scaffold(
      appBar: AppBar(
        title: Text(_test!.title, style: GoogleFonts.playfairDisplay(fontSize: 18)),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: _timeLeft < 30 ? const Color(0xFFFEF2F2) : AppTheme.paper200,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _timeLeft < 30 ? AppTheme.red : AppTheme.paper300),
            ),
            child: Text(_formatTime(_timeLeft), style: GoogleFonts.dmSans(fontSize: 14, color: _timeLeft < 30 ? AppTheme.red : AppTheme.ink900, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Center(child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text('${_current + 1} / $total', style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.ink600)),
              const SizedBox(width: 12),
              Expanded(child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(value: progress, backgroundColor: AppTheme.paper300, color: AppTheme.accent, minHeight: 4),
              )),
            ]),
            const SizedBox(height: 32),
            Text(q.text, style: GoogleFonts.playfairDisplay(fontSize: 22, fontWeight: FontWeight.w400, height: 1.4)),
            const SizedBox(height: 24),
            ...q.options.map((opt) {
              final selected = _answers[q.id] == opt.id;
              return GestureDetector(
                onTap: () => setState(() => _answers[q.id] = opt.id),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: selected ? AppTheme.accent : Colors.white,
                    border: Border.all(color: selected ? AppTheme.accent : AppTheme.paper300, width: selected ? 2 : 1),
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: selected ? [BoxShadow(color: AppTheme.accent.withOpacity(0.15), blurRadius: 8, offset: const Offset(0,2))] : [],
                  ),
                  child: Row(children: [
                    Container(
                      width: 20, height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: selected ? Colors.white : AppTheme.ink400, width: 2),
                        color: selected ? Colors.white : Colors.transparent,
                      ),
                      child: selected ? const Icon(Icons.check, size: 12, color: AppTheme.accent) : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Text(opt.text, style: GoogleFonts.dmSans(fontSize: 15, color: selected ? Colors.white : AppTheme.ink900, fontWeight: FontWeight.w400))),
                  ]),
                ),
              );
            }),
            const Spacer(),
            Row(children: [
              if (_current > 0) OutlinedButton(
                onPressed: () => setState(() => _current--),
                child: const Text('Назад'),
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: _answers.containsKey(q.id) ? () {
                  if (isLast) _finish();
                  else setState(() => _current++);
                } : null,
                style: ElevatedButton.styleFrom(minimumSize: const Size(140, 44)),
                child: Text(isLast ? 'Завершить' : 'Далее'),
              ),
            ]),
          ]),
        )),
      ),
    );
  }
}
