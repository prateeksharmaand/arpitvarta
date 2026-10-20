class User {
  final String id;
  final String email;
  final String name;
  final String? avatarUrl;
  final String? phone;
  final String? gender;
  final String? dateOfBirth;
  final String? city;
  final String role;
  final String subscriptionPlan;
  final String? createdAt;
  final bool mustChangePassword;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.avatarUrl,
    this.phone,
    this.gender,
    this.dateOfBirth,
    this.city,
    this.role = 'user',
    this.subscriptionPlan = 'free',
    this.createdAt,
    this.mustChangePassword = false,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'] ?? '',
      name: json['name'] ?? '',
      avatarUrl: json['avatar_url'],
      phone: json['phone'],
      gender: json['gender'],
      dateOfBirth: json['date_of_birth'],
      city: json['city'],
      role: json['role'] ?? 'user',
      subscriptionPlan: json['subscription_plan'] ?? 'free',
      createdAt: json['created_at'],
      mustChangePassword: json['must_change_password'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id, 'email': email, 'name': name, 'avatar_url': avatarUrl,
    'phone': phone, 'gender': gender, 'date_of_birth': dateOfBirth,
    'city': city, 'role': role, 'subscription_plan': subscriptionPlan,
  };

  bool get isPremium => subscriptionPlan != 'free';

  String get greeting {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }
}
