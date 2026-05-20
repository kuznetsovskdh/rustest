import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/app_theme.dart';

class AdminPanelScreen extends StatelessWidget {
  const AdminPanelScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cards = [
      {'title': 'Управление пользователями', 'desc': 'Просматривать пользователей, назначать роли, замораживать', 'path': '/admin/users'},
      {'title': 'Справочник РЯ', 'desc': 'Добавлять и редактировать правила русского языка', 'path': '/reference'},
    ];
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Админ-панель', style: GoogleFonts.playfairDisplay(fontSize: 28, fontWeight: FontWeight.w400)),
        const SizedBox(height: 24),
        ...cards.map((c) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _AdminCard(title: c['title']!, desc: c['desc']!, onTap: () => context.go(c['path']!)),
        )),
      ]),
    );
  }
}

class _AdminCard extends StatefulWidget {
  final String title, desc;
  final VoidCallback onTap;
  const _AdminCard({required this.title, required this.desc, required this.onTap});
  @override
  State<_AdminCard> createState() => _AdminCardState();
}

class _AdminCardState extends State<_AdminCard> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.all(20),
          constraints: const BoxConstraints(maxWidth: 400),
          decoration: BoxDecoration(
            color: _hovered ? AppTheme.paper200 : Colors.white,
            border: Border.all(color: _hovered ? AppTheme.ink200 : AppTheme.paper300),
            borderRadius: BorderRadius.circular(14),
            boxShadow: _hovered ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 12, offset: const Offset(0,4))] : [],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.title, style: GoogleFonts.playfairDisplay(fontSize: 18, fontWeight: FontWeight.w400)),
            const SizedBox(height: 6),
            Text(widget.desc, style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.ink600, fontWeight: FontWeight.w300)),
          ]),
        ),
      ),
    );
  }
}
