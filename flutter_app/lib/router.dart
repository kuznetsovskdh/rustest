import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'models/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/catalog_screen.dart';
import 'screens/reference_screen.dart';
import 'screens/test_screen.dart';
import 'screens/result_screen.dart';
import 'screens/admin/admin_panel_screen.dart';
import 'screens/admin/user_manager_screen.dart';
import 'widgets/main_scaffold.dart';

GoRouter createRouter(AuthProvider auth) => GoRouter(
  initialLocation: '/catalog',
  redirect: (context, state) {
    final isAuth = auth.isLoggedIn;
    final loc = state.matchedLocation;
    final isLoginPage = loc == '/login' || loc == '/register';
    if (!isAuth && !isLoginPage && loc.startsWith('/admin')) return '/login';
    return null;
  },
  routes: [
    ShellRoute(
      builder: (context, state, child) => MainScaffold(child: child),
      routes: [
        GoRoute(path: '/catalog', builder: (c, s) => const CatalogScreen()),
        GoRoute(path: '/reference', builder: (c, s) => const ReferenceScreen()),
        GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
        GoRoute(path: '/register', builder: (c, s) => const RegisterScreen()),
        GoRoute(path: '/test/:id', builder: (c, s) => TestScreen(testId: s.pathParameters['id']!)),
        GoRoute(path: '/result/:id', builder: (c, s) => ResultScreen(attemptId: s.pathParameters['id']!)),
        GoRoute(path: '/admin', builder: (c, s) => const AdminPanelScreen()),
        GoRoute(path: '/admin/users', builder: (c, s) => const UserManagerScreen()),
      ],
    ),
  ],
);
