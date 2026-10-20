import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shimmer/shimmer.dart';
import '../../blocs/home/home_cubit.dart';
import '../../blocs/home/home_state.dart';
import '../../blocs/marketplace/marketplace_cubit.dart';
import '../../l10n/app_strings.dart';
import '../../models/professional.dart';
import '../../models/user.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import 'main_screen.dart';
import '../marketplace/professional_profile_screen.dart';
import '../notifications/notifications_screen.dart';
import '../wallet/wallet_screen.dart';
import '../profile/profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    context.read<HomeCubit>().load();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final s = context.s;

    return Scaffold(
      body: BlocBuilder<HomeCubit, HomeState>(
        builder: (context, state) {
          return RefreshIndicator(
            onRefresh: () => context.read<HomeCubit>().refresh(),
            color: context.clr.accent,
            backgroundColor: context.clr.card,
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _buildHeader(user, s)),
                if (state is HomeLoading)
                  SliverToBoxAdapter(child: _buildShimmer())
                else if (state is HomeError)
                  SliverToBoxAdapter(child: _buildError(s))
                else if (state is HomeLoaded) ...[
                  SliverToBoxAdapter(child: _buildAiCard(s)),
                  SliverToBoxAdapter(child: _buildCategories(state, s)),
                  SliverToBoxAdapter(child: _buildOnlineProfessionals(state, s)),
                  SliverToBoxAdapter(child: _buildTopRated(state, s)),
                  const SliverToBoxAdapter(child: SizedBox(height: 100)),
                ] else ...[
                  // HomeInitial — show nothing yet
                  SliverToBoxAdapter(child: _buildShimmer()),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildError(AppStrings s) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 40),
      child: Column(
        children: [
          Icon(Icons.error_outline, color: context.clr.error, size: 48),
          const SizedBox(height: 12),
          Text('Could not load data', style: TextStyle(color: context.clr.txtPrimary, fontSize: 16)),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () => context.read<HomeCubit>().refresh(),
            style: ElevatedButton.styleFrom(backgroundColor: context.clr.accent),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildShimmer() {
    return Shimmer.fromColors(
      baseColor: context.clr.surface,
      highlightColor: context.clr.surfaceLight,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // AI card
            Container(height: 130, decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(20))),
            const SizedBox(height: 24),
            // Section title
            Container(height: 16, width: 160, decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(6))),
            const SizedBox(height: 14),
            // Professional avatars row
            SizedBox(
              height: 100,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: 5,
                itemBuilder: (_, __) => Padding(
                  padding: const EdgeInsets.only(right: 16),
                  child: Column(children: [
                    Container(width: 60, height: 60, decoration: BoxDecoration(color: context.clr.card, shape: BoxShape.circle)),
                    const SizedBox(height: 6),
                    Container(height: 10, width: 48, decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(4))),
                    const SizedBox(height: 4),
                    Container(height: 9, width: 36, decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(4))),
                  ]),
                ),
              ),
            ),
            const SizedBox(height: 20),
            // Score circles row
            Row(children: List.generate(3, (i) => Expanded(
              child: Container(
                margin: EdgeInsets.only(right: i < 2 ? 12 : 0),
                height: 110,
                decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16)),
              ),
            ))),
            const SizedBox(height: 20),
            // CTA button
            Container(height: 52, decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16))),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(User? user, AppStrings s) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 56, 20, 0),
      child: Row(children: [
        GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen())),
          child: CircleAvatar(
            radius: 20,
            backgroundImage: user?.avatarUrl != null ? NetworkImage(user!.avatarUrl!) : null,
            backgroundColor: context.clr.accent.withValues(alpha: 0.2),
            child: user?.avatarUrl == null
                ? Text(user?.name.isNotEmpty == true ? user!.name[0].toUpperCase() : 'U',
                    style: TextStyle(color: context.clr.accent, fontWeight: FontWeight.bold))
                : null,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Text('${user?.greeting ?? 'Hi'}, ${user?.name ?? ''}',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.clr.txtPrimary))),
        GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletScreen())),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: context.clr.border)),
            child: Row(children: [
              Icon(Icons.account_balance_wallet_outlined, color: context.clr.accentAlt, size: 14),
              const SizedBox(width: 4),
              Text(s.wallet, style: TextStyle(color: context.clr.accentAlt, fontSize: 12, fontWeight: FontWeight.w600)),
            ]),
          ),
        ),
        const SizedBox(width: 8),
        GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
          child: Stack(children: [
            Container(padding: const EdgeInsets.all(8), child: Icon(Icons.notifications_outlined, color: context.clr.txtPrimary)),
            Positioned(top: 6, right: 6, child: Container(width: 8, height: 8, decoration: BoxDecoration(color: context.clr.error, shape: BoxShape.circle))),
          ]),
        ),
      ]),
    );
  }

  Widget _buildOnlineProfessionals(HomeLoaded state, AppStrings s) {
    final professionals = state.onlineProfessionals;
    final isRefreshing = state.professionalsRefreshing;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(s.onlineProfessionals, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: context.clr.txtPrimary)),
          Row(children: [
            GestureDetector(
              onTap: () => context.read<HomeCubit>().refreshProfessionals(),
              child: Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(8), border: Border.all(color: context.clr.border)),
                child: isRefreshing
                    ? SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: context.clr.accent))
                    : Icon(Icons.refresh, color: context.clr.accent, size: 16),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => mainTabNotifier.value = 1,
              child: Text(s.seeAll, style: TextStyle(color: context.clr.accent, fontSize: 14)),
            ),
          ]),
        ]),
      ),
      if (professionals.isEmpty && !isRefreshing)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
            child: Row(children: [
              Icon(Icons.people_outline, color: context.clr.txtMuted, size: 32),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(s.noProfessionalsOnline, style: TextStyle(color: context.clr.txtPrimary, fontSize: 14, fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text('Browse all professionals or ask our AI assistant', style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
              ])),
              GestureDetector(
                onTap: () => mainTabNotifier.value = 1,
                child: Text('Browse', style: TextStyle(color: context.clr.accent, fontSize: 13, fontWeight: FontWeight.w600)),
              ),
            ]),
          ),
        )
      else
        SizedBox(
          height: 150,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: professionals.length,
            itemBuilder: (_, i) => _buildProfessionalMini(professionals[i]),
          ),
        ),
    ]);
  }

  // "Dr. Ananya Mehta" -> "Dr. Ananya"; "Rahul Verma" -> "Rahul"
  String _shortName(String name) {
    final parts = name.split(' ');
    if (parts.length > 1 && (parts.first.endsWith('.') || parts.first == 'CA')) return '${parts[0]} ${parts[1]}';
    return parts.first;
  }

  Widget _buildProfessionalMini(Professional professional) {
    final initials = professional.displayName.isNotEmpty ? professional.displayName[0] : '?';
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProfessionalProfileScreen(professional: professional))),
      child: Container(
        width: 90,
        margin: const EdgeInsets.only(right: 12),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.center, children: [
          Stack(children: [
            CircleAvatar(
              radius: 30,
              backgroundImage: professional.avatarUrl != null ? NetworkImage(professional.avatarUrl!) : null,
              backgroundColor: context.clr.accent.withValues(alpha: 0.2),
              child: professional.avatarUrl == null
                  ? Text(initials, style: TextStyle(color: context.clr.accent, fontSize: 20, fontWeight: FontWeight.bold))
                  : null,
            ),
            if (professional.isOnline)
              Positioned(bottom: 2, right: 2, child: Container(
                width: 12, height: 12,
                decoration: BoxDecoration(color: context.clr.success, shape: BoxShape.circle, border: Border.all(color: context.clr.bg, width: 2)),
              )),
          ]),
          const SizedBox(height: 6),
          Text(_shortName(professional.displayName), textAlign: TextAlign.center, style: TextStyle(color: context.clr.txtPrimary, fontSize: 12, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis, maxLines: 1),
          Text(professional.titleText, textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: context.clr.txtMuted, fontSize: 10)),
          Text('₹${professional.perMinuteRateChat.toInt()}/min', textAlign: TextAlign.center, style: TextStyle(color: context.clr.accent, fontSize: 11, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }

  // ── AI assistant prompt ─────────────────────────────────────
  Widget _buildAiCard(AppStrings s) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: GestureDetector(
        onTap: () => mainTabNotifier.value = 2,
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight,
                colors: [context.clr.accent, context.clr.secondary]),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Expanded(child: Text(s.todaysHoroscope, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold))),
            ]),
            const SizedBox(height: 6),
            Text(s.todaysOutlook, style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13)),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                Icon(Icons.search, color: context.clr.accent, size: 18),
                const SizedBox(width: 8),
                Expanded(child: Text(s.describeProblem, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 13))),
                Text(s.askAi, style: TextStyle(color: context.clr.accent, fontWeight: FontWeight.w700, fontSize: 13)),
              ]),
            ),
          ]),
        ),
      ),
    );
  }

  // ── Profession categories grid ──────────────────────────────
  Widget _buildCategories(HomeLoaded state, AppStrings s) {
    if (state.categories.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(s.browseByProfession, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: context.clr.txtPrimary)),
          GestureDetector(
            onTap: () => _openCategory(null),
            child: Text(s.seeAll, style: TextStyle(color: context.clr.accent, fontSize: 14)),
          ),
        ]),
      ),
      GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 20),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 4, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 0.82),
        itemCount: state.categories.length > 12 ? 12 : state.categories.length,
        itemBuilder: (_, i) {
          final c = state.categories[i];
          return GestureDetector(
            onTap: () => _openCategory(c.slug),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 10),
              decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text(c.icon, style: const TextStyle(fontSize: 24)),
                const SizedBox(height: 6),
                Text(c.name, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: context.clr.txtPrimary, fontSize: 10.5, fontWeight: FontWeight.w600, height: 1.2)),
                const SizedBox(height: 2),
                Text('${c.professionalCount} ${s.experts}', style: TextStyle(color: context.clr.txtMuted, fontSize: 9)),
              ]),
            ),
          );
        },
      ),
    ]);
  }

  void _openCategory(String? slug) {
    context.read<MarketplaceCubit>().selectCategory(slug);
    mainTabNotifier.value = 1;
  }

  // ── Top rated list ──────────────────────────────────────────
  Widget _buildTopRated(HomeLoaded state, AppStrings s) {
    if (state.topRated.isEmpty) return const SizedBox.shrink();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
        child: Text(s.topRated, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: context.clr.txtPrimary)),
      ),
      ...state.topRated.take(5).map((p) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
        child: GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProfessionalProfileScreen(professional: p))),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
            child: Row(children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: context.clr.accent.withValues(alpha: 0.15),
                backgroundImage: p.avatarUrl != null ? NetworkImage(p.avatarUrl!) : null,
                child: p.avatarUrl == null ? Text(p.displayName.isNotEmpty ? p.displayName[0] : '?', style: TextStyle(color: context.clr.accent, fontWeight: FontWeight.bold)) : null,
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Flexible(child: Text(p.displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w600))),
                  if (p.isVerified) ...[const SizedBox(width: 4), Icon(Icons.verified, size: 14, color: context.clr.accent)],
                ]),
                const SizedBox(height: 2),
                Text('${p.categoryIcon ?? ''} ${p.titleText} · ${p.experienceText}'.trim(), maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: context.clr.txtSecondary, fontSize: 12)),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Row(children: [Icon(Icons.star_rounded, size: 14, color: context.clr.accentAlt), Text(' ${p.ratingFormatted}', style: TextStyle(color: context.clr.txtPrimary, fontSize: 12, fontWeight: FontWeight.w600))]),
                const SizedBox(height: 2),
                Text('₹${p.perMinuteRateChat.toInt()}/min', style: TextStyle(color: context.clr.accent, fontSize: 12, fontWeight: FontWeight.w700)),
              ]),
            ]),
          ),
        ),
      )),
    ]);
  }
}
