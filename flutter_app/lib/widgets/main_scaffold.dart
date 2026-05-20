import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/auth_provider.dart';
import '../theme/app_theme.dart';
import 'package:google_fonts/google_fonts.dart';

class MainScaffold extends StatelessWidget {
  final Widget child;
  const MainScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final location = GoRouterState.of(context).matchedLocation;

    return Scaffold(
      appBar: AppBar(
        title: GestureDetector(
          onTap: () => context.go('/catalog'),
          child: Text('Рустест', style: GoogleFonts.playfairDisplay(fontSize: 20, fontWeight: FontWeight.w400)),
        ),
        actions: [
          _NavItem(label: 'Каталог', path: '/catalog', current: location),
          _NavItem(label: 'Справочник', path: '/reference', current: location),
          if (auth.isLoggedIn) ...[
            if (auth.isAdmin) _NavItem(label: 'Админ', path: '/admin', current: location),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: () async { await auth.logout(); context.go('/login'); },
              child: const Text('Выйти'),
            ),
          ] else ...[
            OutlinedButton(onPressed: () => context.go('/login'), child: const Text('Войти')),
          ],
          const SizedBox(width: 16),
        ],
      ),
      body: child,
    );
  }
}

class _NavItem extends StatelessWidget {
  final String label, path, current;
  const _NavItem({required this.label, required this.path, required this.current});

  @override
  Widget build(BuildContext context) {
    final isActive = current == path || current.startsWith('$path/');
    return TextButton(
      onPressed: () => context.go(path),
      style: TextButton.styleFrom(
        foregroundColor: isActive ? AppTheme.ink900 : AppTheme.ink600,
        backgroundColor: isActive ? AppTheme.paper200 : Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      child: Text(label, style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w400)),
    );
  }
}
