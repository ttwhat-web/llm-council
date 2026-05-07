import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

CustomTransitionPage<T> fadeSlidePage<T>({
  required Widget child,
  Object? arguments,
  String? name,
  Duration duration = const Duration(milliseconds: 320),
  Offset begin = const Offset(0, 0.04),
}) {
  return CustomTransitionPage<T>(
    child: child,
    name: name,
    arguments: arguments,
    transitionDuration: duration,
    reverseTransitionDuration: const Duration(milliseconds: 220),
    transitionsBuilder: (context, animation, secondary, c) {
      final curved = CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.easeInCubic,
      );
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(begin: begin, end: Offset.zero)
              .animate(curved),
          child: c,
        ),
      );
    },
  );
}
