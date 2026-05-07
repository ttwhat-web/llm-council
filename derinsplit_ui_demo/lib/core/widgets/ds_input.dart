import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/tokens.dart';

class DSInput extends StatelessWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final String? helper;
  final String? errorText;
  final IconData? prefixIcon;
  final Widget? suffix;
  final bool obscureText;
  final TextInputType? keyboardType;
  final int? maxLines;
  final int? maxLength;
  final bool enabled;
  final ValueChanged<String>? onChanged;
  final List<TextInputFormatter>? inputFormatters;
  final VoidCallback? onTap;
  final bool readOnly;

  const DSInput({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.helper,
    this.errorText,
    this.prefixIcon,
    this.suffix,
    this.obscureText = false,
    this.keyboardType,
    this.maxLines = 1,
    this.maxLength,
    this.enabled = true,
    this.onChanged,
    this.inputFormatters,
    this.onTap,
    this.readOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: const TextStyle(
              color: DSColors.textSecondary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.4,
            ),
          ),
          const SizedBox(height: 6),
        ],
        TextField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          maxLines: obscureText ? 1 : maxLines,
          maxLength: maxLength,
          enabled: enabled,
          onChanged: onChanged,
          onTap: onTap,
          readOnly: readOnly,
          inputFormatters: inputFormatters,
          style: const TextStyle(color: DSColors.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            errorText: errorText,
            helperText: helper,
            prefixIcon: prefixIcon == null
                ? null
                : Icon(prefixIcon, color: DSColors.textTertiary, size: 20),
            suffix: suffix,
            counterText: '',
          ),
        ),
      ],
    );
  }
}
