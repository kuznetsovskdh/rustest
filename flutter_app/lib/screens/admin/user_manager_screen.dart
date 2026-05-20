import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../api/api_client.dart';
import '../../models/user.dart';
import '../../theme/app_theme.dart';

class UserManagerScreen extends StatefulWidget {
  const UserManagerScreen({super.key});
  @override
  State<UserManagerScreen> createState() => _UserManagerScreenState();
}

class _UserManagerScreenState extends State<UserManagerScreen> {
  List<User> _users = [];
  List<User> _filtered = [];
  bool _loading = true;
  String _search = '';
  String? _message;
  bool _isError = false;

  final _roles = ['guest', 'user', 'teacher', 'admin'];
  final _roleColors = {
    'admin': AppTheme.red,
    'teacher': AppTheme.blue,
    'user': AppTheme.green,
    'guest': AppTheme.ink400,
  };

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final data = await ApiClient.get('/auth/users');
      setState(() {
        _users = (data as List).map((e) => User.fromJson(e)).toList();
        _filter();
        _loading = false;
      });
    } catch (_) { setState(() => _loading = false); }
  }

  void _filter() {
    _filtered = _users.where((u) =>
      u.name.toLowerCase().contains(_search.toLowerCase()) ||
      u.email.toLowerCase().contains(_search.toLowerCase())
    ).toList();
  }

  void _showMsg(String msg, {bool error = false}) {
    setState(() { _message = msg; _isError = error; });
    Future.delayed(const Duration(seconds: 2), () { if (mounted) setState(() => _message = null); });
  }

  Future<void> _setRole(User user, String role) async {
    try {
      await ApiClient.patch('/auth/users/${user.id}/role?role=$role');
      _showMsg('Роль обновлена');
      await _load();
    } catch (e) { _showMsg('Ошибка: $e', error: true); }
  }

  Future<void> _toggleFreeze(User user) async {
    try {
      final action = user.isFrozen ? 'unfreeze' : 'freeze';
      await ApiClient.patch('/auth/users/${user.id}/$action');
      _showMsg(user.isFrozen ? 'Пользователь разморожен' : 'Пользователь заморожен');
      await _load();
    } catch (e) { _showMsg('Ошибка: $e', error: true); }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          IconButton(icon: const Icon(Icons.arrow_back, size: 18), onPressed: () => context.go('/admin'), padding: EdgeInsets.zero),
          const SizedBox(width: 8),
          Text('Пользователи', style: GoogleFonts.playfairDisplay(fontSize: 28, fontWeight: FontWeight.w400)),
          const SizedBox(width: 12),
          if (!_loading) Text('(${_users.length})', style: GoogleFonts.dmSans(fontSize: 16, color: AppTheme.ink400)),
        ]),
        const SizedBox(height: 16),
        if (_message != null)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: _isError ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
              border: Border.all(color: _isError ? const Color(0xFFFECACA) : const Color(0xFFBBF7D0)),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(_message!, style: TextStyle(color: _isError ? AppTheme.red : AppTheme.green, fontSize: 13)),
          ),
        TextField(
          decoration: const InputDecoration(
            hintText: 'Поиск по имени или email...',
            prefixIcon: Icon(Icons.search, size: 18, color: AppTheme.ink400),
          ),
          onChanged: (v) => setState(() { _search = v; _filter(); }),
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Expanded(child: Center(child: CircularProgressIndicator()))
        else
          Expanded(child: Card(
            clipBehavior: Clip.hardEdge,
            child: Column(children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: AppTheme.paper200,
                child: Row(children: [
                  _hdr('Пользователь', flex: 2),
                  _hdr('Email', flex: 2),
                  _hdr('Роль', flex: 1),
                  _hdr('Статус', flex: 1),
                  _hdr('Сменить роль', flex: 2),
                  _hdr('Действие', flex: 1),
                ]),
              ),
              const Divider(height: 1),
              Expanded(child: ListView.separated(
                itemCount: _filtered.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (ctx, i) {
                  final u = _filtered[i];
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    color: u.isFrozen ? const Color(0xFFFFF7F7) : Colors.transparent,
                    child: Row(children: [
                      Expanded(flex: 2, child: Text(
                        u.name.isEmpty ? '—' : u.name,
                        style: GoogleFonts.dmSans(fontSize: 13, fontWeight: FontWeight.w400),
                        overflow: TextOverflow.ellipsis,
                      )),
                      Expanded(flex: 2, child: Text(
                        u.email,
                        style: GoogleFonts.dmSans(fontSize: 13, color: AppTheme.ink600),
                        overflow: TextOverflow.ellipsis,
                      )),
                      Expanded(flex: 1, child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: (_roleColors[u.role] ?? AppTheme.ink400).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(u.role,
                          style: GoogleFonts.dmSans(fontSize: 11, color: _roleColors[u.role] ?? AppTheme.ink400),
                          overflow: TextOverflow.ellipsis,
                        ),
                      )),
                      Expanded(flex: 1, child: Text(
                        u.isFrozen ? 'Заморожен' : 'Активен',
                        style: GoogleFonts.dmSans(fontSize: 12, color: u.isFrozen ? AppTheme.red : AppTheme.green),
                      )),
                      Expanded(flex: 2, child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _roles.contains(u.role) ? u.role : 'user',
                          isDense: true,
                          style: GoogleFonts.dmSans(fontSize: 12, color: AppTheme.ink900),
                          items: _roles.map((r) => DropdownMenuItem(
                            value: r,
                            child: Text(r, style: GoogleFonts.dmSans(fontSize: 12)),
                          )).toList(),
                          onChanged: (r) { if (r != null && r != u.role) _setRole(u, r); },
                        ),
                      )),
                      Expanded(flex: 1, child: OutlinedButton(
                        onPressed: () => _toggleFreeze(u),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: u.isFrozen ? AppTheme.green : AppTheme.red,
                          side: BorderSide(color: u.isFrozen ? AppTheme.green : AppTheme.red),
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Text(
                          u.isFrozen ? 'Разморозить' : 'Заморозить',
                          style: GoogleFonts.dmSans(fontSize: 11),
                        ),
                      )),
                    ]),
                  );
                },
              )),
            ]),
          )),
      ]),
    );
  }

  Widget _hdr(String label, {int flex = 1}) => Expanded(
    flex: flex,
    child: Text(label, style: GoogleFonts.dmSans(fontSize: 12, fontWeight: FontWeight.w500, color: AppTheme.ink600)),
  );
}
