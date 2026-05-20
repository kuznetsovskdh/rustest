import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../api/api_client.dart';
import '../theme/app_theme.dart';

class CatalogScreen extends StatefulWidget {
  const CatalogScreen({super.key});
  @override
  State<CatalogScreen> createState() => _CatalogScreenState();
}

class _CatalogScreenState extends State<CatalogScreen> {
  List<dynamic> _tests = [];
  String _category = 'Все';
  String _search = '';
  bool _loading = true;

  static const _diffLabel = {'easy': 'Лёгкий', 'medium': 'Средний', 'hard': 'Сложный'};
  static const _diffColor = {'easy': AppTheme.green, 'medium': AppTheme.amber, 'hard': AppTheme.red};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiClient.get('/tests', auth: false);
      setState(() { _tests = data; _loading = false; });
    } catch (_) {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = ['Все', ...{for (var t in _tests) t['category'] as String}];
    final filtered = _tests.where((t) =>
      (_category == 'Все' || t['category'] == _category) &&
      (t['title'] as String).toLowerCase().contains(_search.toLowerCase())
    ).toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Каталог тестов', style: GoogleFonts.playfairDisplay(fontSize: 32, fontWeight: FontWeight.w400)),
        const SizedBox(height: 8),
        Text('Проверьте знания русского языка', style: GoogleFonts.dmSans(color: AppTheme.ink600, fontSize: 15, fontWeight: FontWeight.w300)),
        const SizedBox(height: 24),
        TextField(
          decoration: const InputDecoration(hintText: 'Поиск по названию...', prefixIcon: Icon(Icons.search, size: 18, color: AppTheme.ink400)),
          onChanged: (v) => setState(() => _search = v),
        ),
        const SizedBox(height: 16),
        Wrap(spacing: 8, children: categories.map((c) => ChoiceChip(
          label: Text(c),
          selected: _category == c,
          onSelected: (_) => setState(() => _category = c),
          selectedColor: AppTheme.accent,
          labelStyle: GoogleFonts.dmSans(fontSize: 13, color: _category == c ? AppTheme.paper100 : AppTheme.ink600),
        )).toList()),
        const SizedBox(height: 24),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          LayoutBuilder(builder: (ctx, constraints) {
            final cols = constraints.maxWidth > 700 ? 3 : constraints.maxWidth > 450 ? 2 : 1;
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: cols, crossAxisSpacing: 16, mainAxisSpacing: 16, childAspectRatio: 1.4),
              itemCount: filtered.length,
              itemBuilder: (ctx, i) {
                final t = filtered[i];
                return _TestCard(test: t, diffLabel: _diffLabel, diffColor: _diffColor);
              },
            );
          }),
      ]),
    );
  }
}

class _TestCard extends StatefulWidget {
  final Map t;
  final Map diffLabel, diffColor;
  const _TestCard({required Map test, required this.diffLabel, required this.diffColor}) : t = test;
  @override
  State<_TestCard> createState() => _TestCardState();
}

class _TestCardState extends State<_TestCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final t = widget.t;
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        transform: Matrix4.translationValues(0, _hovered ? -3 : 0, 0),
        child: Card(
          elevation: _hovered ? 4 : 0,
          shadowColor: Colors.black12,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text(t['category'] ?? '', style: GoogleFonts.dmSans(fontSize: 11, color: AppTheme.ink600, letterSpacing: 0.06)),
                Text(widget.diffLabel[t['difficulty']] ?? '', style: GoogleFonts.dmSans(fontSize: 11, color: widget.diffColor[t['difficulty']] ?? AppTheme.ink600)),
              ]),
              const SizedBox(height: 8),
              Expanded(child: Text(t['title'] ?? '', style: GoogleFonts.playfairDisplay(fontSize: 15, fontWeight: FontWeight.w400, height: 1.3))),
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('${t['timer_seconds']} сек', style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.ink400)),
                ElevatedButton(onPressed: () => context.go('/test/${t["id"]}'), style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8), minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap), child: Text('Начать', style: GoogleFonts.dmSans(fontSize: 12))),
              ]),
            ]),
          ),
        ),
      ),
    );
  }
}
