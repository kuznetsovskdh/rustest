import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'models/auth_provider.dart';
import 'router.dart';
import 'theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = AuthProvider();
  await auth.init();
  runApp(
    ChangeNotifierProvider.value(
      value: auth,
      child: const RustestApp(),
    ),
  );
}

class RustestApp extends StatelessWidget {
  const RustestApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final router = createRouter(auth);
    return MaterialApp.router(
      title: 'Рустест',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
