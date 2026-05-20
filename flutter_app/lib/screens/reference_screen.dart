import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../api/api_client.dart';
import '../models/auth_provider.dart';
import '../models/rule.dart';
import '../theme/app_theme.dart';

class ReferenceScreen extends StatefulWidget {
  const ReferenceScreen({super.key});
  @override
  State<ReferenceScreen> createState() => _ReferenceScreenState();
}

class _ReferenceScreenState extends State<ReferenceScreen> {
  List<Rule> _rules = [];
  List<String> _topics = [];
  String _topic = 'Все';
  String _search = '';
  bool _loading = true;
  Rule? _selected;
  bool _editMode = false;
  bool _createMode = false;
  String? _message;

  // Form controllers
  final _topicCtrl = TextEditingController();
  final _subtopicCtrl = TextEditingController();
  final _titleCtrl = TextEditingController();
  final _explanationCtrl = TextEditingController();
  List<Map<String, TextEditingController>> _exampleCtrls = [];

  @override
  void initState() { super.initState(); _load(); }

  @override
  void dispose() {
    _topicCtrl.dispose(); _subtopicCtrl.dispose();
    _titleCtrl.dispose(); _explanationCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await ApiClient.get('/rules', auth: false);
      final topicsData = await ApiClient.get('/rules/topics', auth: false);
      setState(() {
        _rules = (data as List).map((e) => Rule.fromJson(e)).toList();
        _topics = (topicsData as List).map((e) => e.toString()).toList();
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  Future<void> _selectRule(int id) async {
    final data = await ApiClient.get('/rules/$id', auth: false);
    setState(() {
      _selected = Rule.fromJson(data);
      _editMode = false;
      _createMode = false;
    });
  }

  void _startEdit() {
    if (_selected == null) return;
    _topicCtrl.text = _selected!.topic;
    _subtopicCtrl.text = _selected!.subtopic ?? '';
    _titleCtrl.text = _selected!.title;
    _explanationCtrl.text = _selected!.explanation;
    _exampleCtrls = _selected!.examples.map((e) => {
      'correct': TextEditingController(text: e.correct),
      'incorrect': TextEditingController(text: e.incorrect ?? ''),
      'comment': TextEditingController(text: e.comment ?? ''),
    }).toList();
    setState(() { _editMode = true; _createMode = false; });
  }

  void _startCreate() {
    _topicCtrl.clear(); _subtopicCtrl.clear();
    _titleCtrl.clear(); _explanationCtrl.clear();
    _exampleCtrls = [];
    setState(() { _createMode = true; _editMode = false; _selected = null; });
  }

  void _addExample() {
    setState(() => _exampleCtrls.add({
      'correct': TextEditingController(),
      'incorrect': TextEditingController(),
      'comment': TextEditingController(),
    }));
  }

  Future<void> _save() async {
    final body = {
      'topic': _topicCtrl.text,
      'subtopic': _subtopicCtrl.text.isEmpty ? null : _subtopicCtrl.text,
      'title': _titleCtrl.text,
      'explanation': _explanationCtrl.text,
      'examples': _exampleCtrls.map((e) => {
        'correct': e['correct']!.text,
        'incorrect': e['incorrect']!.text.isEmpty ? null : e['incorrect']!.text,
        'comment': e['comment']!.text.isEmpty ? null : e['comment']!.text,
      }).toList(),
    };
    try {
      if (_createMode) {
        await ApiClient.post('/rules', body);
        _showMsg('Правило создано');
      } else if (_editMode && _selected != null) {
        await ApiClient.put('/rules/${_selected!.id}', body);
        _showMsg('Правило обновлено');
      }
      await _load();
      setState(() { _editMode = false; _createMode = false; });
    } catch (e) { _showMsg('Ошибка: $e', error: true); }
  }

  Future<void> _delete(int id) async {
    try {
      await ApiClient.delete('/rules/$id');
      _showMsg('Правило удалено');
      setState(() { _selected = null; });
      await _load();
    } catch (e) { _showMsg('Ошибка: $e', error: true); }
  }

  void _showMsg(String msg, {bool error = false}) {
    setState(() => _message = msg);
    Future.delayed(const Duration(seconds: 2), () { if (mounted) setState(() => _message = null); });
  }

  @override
  Widget build(BuildContext context) {
    final isAdmin = context.watch<AuthProvider>().isAdmin;
    final filtered = _rules.where((r) =>
      (_topic == 'Все' || r.topic == _topic) &&
      r.title.toLowerCase().contains(_search.toLowerCase())
    ).toList();

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('Справочник русского языка', style: GoogleFonts.playfairDisplay(fontSize: 28, fontWeight: FontWeight.w400)),
          if (isAdmin) ElevatedButton(onPressed: _startCreate, child: const Text('+ Добавить правило')),
        ]),
        const SizedBox(height: 12),
        if (_message != null)
          Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(color: const Color(0xFFF0FDF4), border: Border.all(color: const Color(0xFFBBF7D0)), borderRadius: BorderRadius.circular(6)),
            child: Text(_message!, style: const TextStyle(color: AppTheme.green, fontSize: 13)),
          ),
        TextField(
          decoration: const InputDecoration(hintText: 'Поиск по названию правила...', prefixIcon: Icon(Icons.search, size: 18, color: AppTheme.ink400)),
          onChanged: (v) => setState(() => _search = v),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(children: ['Все', ..._topics].map((t) => Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(t),
              selected: _topic == t,
              onSelected: (_) => setState(() => _topic = t),
              selectedColor: AppTheme.accent,
              labelStyle: GoogleFonts.dmSans(fontSize: 12, color: _topic == t ? AppTheme.paper100 : AppTheme.ink600),
            ),
          )).toList()),
        ),
        const SizedBox(height: 16),
        Expanded(child: _loading
          ? const Center(child: CircularProgressIndicator())
          : Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // List
              SizedBox(width: 260, child: Card(
                clipBehavior: Clip.hardEdge,
                child: ListView.separated(
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (ctx, i) {
                    final r = filtered[i];
                    final isSelected = _selected?.id == r.id;
                    return InkWell(
                      onTap: () => _selectRule(r.id),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        color: isSelected ? AppTheme.paper200 : Colors.transparent,
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(r.title, style: GoogleFonts.dmSans(fontWeight: FontWeight.w400, fontSize: 14, color: isSelected ? AppTheme.accent : AppTheme.ink900)),
                          const SizedBox(height: 2),
                          Text('${r.topic}${r.subtopic != null ? " → ${r.subtopic}" : ""}',
                            style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.ink400)),
                        ]),
                      ),
                    );
                  },
                ),
              )),
              const SizedBox(width: 16),
              // Detail / Edit / Create
              Expanded(child: (_editMode || _createMode)
                ? _buildForm(isAdmin)
                : _selected != null
                  ? _buildDetail(isAdmin)
                  : Center(child: Text('Выберите правило', style: GoogleFonts.dmSans(color: AppTheme.ink400)))
              ),
            ]),
        ),
      ]),
    );
  }

  Widget _buildDetail(bool isAdmin) => Card(
    clipBehavior: Clip.hardEdge,
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${_selected!.topic}${_selected!.subtopic != null ? " → ${_selected!.subtopic}" : ""}',
              style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.ink400)),
            const SizedBox(height: 4),
            Text(_selected!.title, style: GoogleFonts.playfairDisplay(fontSize: 22, fontWeight: FontWeight.w400)),
          ])),
          if (isAdmin) Row(children: [
            OutlinedButton(onPressed: _startEdit, child: Text('Изменить', style: GoogleFonts.dmSans(fontSize: 13))),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: () => _delete(_selected!.id),
              style: OutlinedButton.styleFrom(foregroundColor: AppTheme.red, side: const BorderSide(color: AppTheme.red)),
              child: Text('Удалить', style: GoogleFonts.dmSans(fontSize: 13)),
            ),
          ]),
        ]),
        const SizedBox(height: 16),
        Text(_selected!.explanation, style: GoogleFonts.dmSans(fontSize: 14, height: 1.7, fontWeight: FontWeight.w300)),
        if (_selected!.examples.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text('Примеры', style: GoogleFonts.playfairDisplay(fontSize: 16, fontWeight: FontWeight.w400)),
          const SizedBox(height: 8),
          ..._selected!.examples.map((ex) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppTheme.paper200, borderRadius: BorderRadius.circular(8)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Правильно: ${ex.correct}', style: GoogleFonts.dmSans(color: AppTheme.green, fontSize: 13)),
              if (ex.incorrect != null && ex.incorrect!.isNotEmpty)
                Text('Неправильно: ${ex.incorrect}', style: GoogleFonts.dmSans(color: AppTheme.red, fontSize: 13)),
              if (ex.comment != null && ex.comment!.isNotEmpty)
                Text(ex.comment!, style: GoogleFonts.dmSans(color: AppTheme.ink600, fontSize: 12)),
            ]),
          )),
        ],
      ]),
    ),
  );

  Widget _buildForm(bool isAdmin) => Card(
    clipBehavior: Clip.hardEdge,
    child: SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(_createMode ? 'Новое правило' : 'Редактировать правило',
          style: GoogleFonts.playfairDisplay(fontSize: 20, fontWeight: FontWeight.w400)),
        const SizedBox(height: 20),
        Row(children: [
          Expanded(child: TextField(controller: _topicCtrl, decoration: const InputDecoration(labelText: 'Тема *'))),
          const SizedBox(width: 12),
          Expanded(child: TextField(controller: _subtopicCtrl, decoration: const InputDecoration(labelText: 'Подтема'))),
        ]),
        const SizedBox(height: 12),
        TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Название правила *')),
        const SizedBox(height: 12),
        TextField(controller: _explanationCtrl, decoration: const InputDecoration(labelText: 'Объяснение *'), maxLines: 4),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('Примеры', style: GoogleFonts.dmSans(fontSize: 14, fontWeight: FontWeight.w500)),
          TextButton(onPressed: _addExample, child: const Text('+ Добавить пример')),
        ]),
        ..._exampleCtrls.asMap().entries.map((entry) {
          final i = entry.key;
          final e = entry.value;
          return Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: AppTheme.paper200, borderRadius: BorderRadius.circular(8)),
            child: Column(children: [
              TextField(controller: e['correct'], decoration: const InputDecoration(labelText: 'Правильно *')),
              const SizedBox(height: 8),
              TextField(controller: e['incorrect'], decoration: const InputDecoration(labelText: 'Неправильно')),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: TextField(controller: e['comment'], decoration: const InputDecoration(labelText: 'Комментарий'))),
                IconButton(icon: const Icon(Icons.delete_outline, color: AppTheme.red, size: 18),
                  onPressed: () => setState(() => _exampleCtrls.removeAt(i))),
              ]),
            ]),
          );
        }),
        const SizedBox(height: 20),
        Row(children: [
          ElevatedButton(onPressed: _save, child: Text(_createMode ? 'Создать' : 'Сохранить')),
          const SizedBox(width: 12),
          OutlinedButton(
            onPressed: () => setState(() { _editMode = false; _createMode = false; }),
            child: const Text('Отмена'),
          ),
        ]),
      ]),
    ),
  );
}
