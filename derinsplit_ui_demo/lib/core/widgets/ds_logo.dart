import 'package:flutter/material.dart';

import '../theme/tokens.dart';

class DSWordmark extends StatelessWidget {
  final double fontSize;
  final Color color;
  const DSWordmark({super.key, this.fontSize = 22, this.color = DSColors.textPrimary});

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (b) => DSColors.goldGradient.createShader(b),
      child: Text(
        'DERİN  SPLIT',
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w700,
          letterSpacing: 3,
          color: color,
          fontFamily: 'Georgia',
        ),
      ),
    );
  }
}

class DSEmblem extends StatelessWidget {
  final double size;
  const DSEmblem({super.key, this.size = 96});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const RadialGradient(
          colors: [Color(0xFF1A1A1A), Color(0xFF000000)],
          radius: 0.9,
        ),
        border: Border.all(color: DSColors.accentGold, width: 1.6),
        boxShadow: [
          BoxShadow(
            color: DSColors.accentGold.withOpacity(0.18),
            blurRadius: 32,
            spreadRadius: 4,
          ),
        ],
      ),
      child: Center(
        child: ShaderMask(
          shaderCallback: (b) => DSColors.goldGradient.createShader(b),
          child: Icon(Icons.water_drop_outlined,
              size: size * 0.55, color: DSColors.accentGold),
        ),
      ),
    );
  }
}
