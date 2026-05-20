class User {
  final int id;
  final String email;
  final String name;
  final String role;
  final bool isFrozen;

  User({required this.id, required this.email, required this.name, required this.role, required this.isFrozen});

  factory User.fromJson(Map<String, dynamic> j) => User(
    id: j['id'],
    email: j['email'],
    name: j['name'] ?? '',
    role: j['role'] ?? 'user',
    isFrozen: j['is_frozen'] ?? false,
  );
}
