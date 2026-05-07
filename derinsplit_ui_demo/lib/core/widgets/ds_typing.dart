import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class DSTypingIndicator extends StatefulWidget {
  final String? name;
  const DSTypingIndicator({super.key, this.name});

  @override
  State<DSTypingIndicator> createState() => _DSTypingIndicatorState();
}

class _DSTypingIndicatorState extends State<DSTypingIndicator>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1100),
  )..repeat();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: DSColors.bgSecondary,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(14),
                topRight: Radius.circular(14),
                bottomLeft: Radius.circular(4),
                bottomRight: Radius.circular(14),
              ),
              border: Border.all(color: DSColors.glassBorder),
            ),
            child: AnimatedBuilder(
              animation: _ctrl,
              builder: (context, _) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: List.generate(3, (i) {
                    final phase = (_ctrl.value * 3 - i).clamp(0.0, 1.0);
                    final t = (phase < 0.5
                            ? phase * 2
                            : (1 - phase) * 2)
                        .clamp(0.0, 1.0);
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2.5),
                      child: Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color.lerp(
                            DSColors.textTertiary,
                            DSColors.accentGold,
                            t,
                          ),
                        ),
                      ),
                    );
                  }),
                );
              },
            ),
          ),
          if (widget.name != null) ...[
            const SizedBox(width: 8),
            Text(
              '${widget.name} yazıyor...',
              style: const TextStyle(
                color: DSColors.textTertiary,
                fontSize: 11,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
