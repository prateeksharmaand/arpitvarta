import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'providers/auth_provider.dart';
import 'providers/locale_provider.dart';
import 'providers/theme_provider.dart';
import 'theme/app_theme.dart';
import 'screens/splash_screen.dart';

final FlutterLocalNotificationsPlugin localNotifs = FlutterLocalNotificationsPlugin();

// Global navigator key so we can show dialogs from notification callbacks
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

const AndroidNotificationChannel _channel = AndroidNotificationChannel(
  'arpitvarta_pro_high_importance',
  'ArpitVarta Pro Notifications',
  importance: Importance.high,
  playSound: true,
);

@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Data-only messages: FCM won't auto-show a notification, so we do it manually.
  if (message.notification == null && message.data.isNotEmpty) {
    final plugin = FlutterLocalNotificationsPlugin();
    await plugin.initialize(const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    ));
    await plugin.show(
      message.hashCode,
      message.data['title'] ?? 'ArpitVarta Pro',
      message.data['body'] ?? '',
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id, _channel.name,
          importance: Importance.high, priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
    );
  }
}

Future<void> _initLocalNotifications() async {
  await localNotifs.initialize(
    const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    ),
  );
  await localNotifs
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(_channel);
}

void _handleProfessionalStatusNotification(String type, String? reason, BuildContext? context) {
  final ctx = context ?? navigatorKey.currentContext;
  if (ctx == null) return;

  final isApproved = type == 'professional_approved';

  // Refresh the auth provider so the pending screen disappears
  ctx.read<AuthProvider>().refreshProfessionalProfile();

  // Show dialog
  showDialog(
    context: ctx,
    barrierDismissible: false,
    builder: (_) => AlertDialog(
      backgroundColor: AppColors.card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Row(children: [
        Icon(
          isApproved ? Icons.check_circle : Icons.cancel,
          color: isApproved ? AppColors.success : AppColors.error,
          size: 28,
        ),
        const SizedBox(width: 10),
        Text(
          isApproved ? 'Profile Approved!' : 'Profile Not Approved',
          style: const TextStyle(color: AppColors.textPrimary, fontSize: 18),
        ),
      ]),
      content: Text(
        isApproved
            ? 'Congratulations! Your professional profile has been approved. You can now go online and start accepting consultations.'
            : (reason != null && reason.isNotEmpty
                ? 'Your profile was not approved.\n\nReason: $reason'
                : 'Your professional profile was not approved. Please contact support for more information.'),
        style: const TextStyle(color: AppColors.textSecondary, height: 1.5),
      ),
      actions: [
        ElevatedButton(
          onPressed: () => Navigator.pop(_),
          style: ElevatedButton.styleFrom(
            backgroundColor: isApproved ? AppColors.success : AppColors.brand,
          ),
          child: Text(isApproved ? 'Go to Dashboard' : 'OK'),
        ),
      ],
    ),
  );
}

void _listenForegroundMessages(BuildContext context) {
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    final notification = message.notification;
    final type = message.data['type'] as String?;

    // Handle professional approval/rejection silently (show dialog instead of banner)
    if (type == 'professional_approved' || type == 'professional_rejected') {
      _handleProfessionalStatusNotification(type!, message.data['reason'], context);
      return;
    }

    // Show notification for both notification-messages and data-only messages
    final title = notification?.title ?? message.data['title'];
    final body = notification?.body ?? message.data['body'];
    if (title == null && body == null) return;
    localNotifs.show(
      message.hashCode,
      title,
      body,
      NotificationDetails(
        android: AndroidNotificationDetails(
          _channel.id,
          _channel.name,
          importance: Importance.high,
          priority: Priority.high,
          icon: '@mipmap/ic_launcher',
        ),
      ),
    );
  });

  // App opened from a tapped notification (background → foreground)
  FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
    final type = message.data['type'] as String?;
    if (type == 'professional_approved' || type == 'professional_rejected') {
      _handleProfessionalStatusNotification(type!, message.data['reason'], null);
    }
  });
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Firebase init is crash-guarded — app works without it (push notifications just won't fire)
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);
    await _initLocalNotifications();

    // Request notification permission (Android 13+)
    await FirebaseMessaging.instance.requestPermission(
      alert: true, badge: true, sound: true, provisional: false,
    );

    // Ensure FCM auto-init is enabled so token is refreshed after re-install
    await FirebaseMessaging.instance.setAutoInitEnabled(true);

    // Handle notification tap when app was fully terminated
    final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
    if (initialMessage != null) {
      final type = initialMessage.data['type'] as String?;
      if (type == 'professional_approved' || type == 'professional_rejected') {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _handleProfessionalStatusNotification(type!, initialMessage.data['reason'], null);
        });
      }
    }
  } catch (e) {
    debugPrint('Firebase init failed (non-fatal): $e');
  }

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: AppColors.background,
  ));
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);

  runApp(const ArpitVartaApp());
}

class ArpitVartaApp extends StatefulWidget {
  const ArpitVartaApp({super.key});

  @override
  State<ArpitVartaApp> createState() => _ArpitVartaAppState();
}

class _ArpitVartaAppState extends State<ArpitVartaApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        _listenForegroundMessages(context);
      } catch (_) {}
    });
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: Consumer2<LocaleProvider, ThemeProvider>(
        builder: (_, localeProvider, themeProvider, __) => MaterialApp(
          title: 'ArpitVarta Pro',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.darkTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: ThemeMode.dark,
          navigatorKey: navigatorKey,
          locale: localeProvider.locale,
          supportedLocales: const [
            Locale('en'), Locale('hi'), Locale('ta'),
            Locale('kn'), Locale('ml'), Locale('gu'),
            Locale('mr'), Locale('bn'), Locale('te'),
          ],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: const SplashScreen(),
        ),
      ),
    );
  }
}