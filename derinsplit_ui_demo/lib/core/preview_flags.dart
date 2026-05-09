/// Compile-time flags for the public web preview.
///
/// `kPreviewMode` skips the splash → onboarding → login → mode-select chain
/// and lands the visitor directly on the cinematic home with a pre-populated
/// demo identity. The auth + mode-select screens still exist and the
/// underlying Riverpod state is the same — flipping this to `false` (or
/// adding `--dart-define=DERINSPLIT_PREVIEW=false`) restores the production
/// flow.
const bool kPreviewMode = bool.fromEnvironment(
  'DERINSPLIT_PREVIEW',
  defaultValue: true,
);

/// Visible build label shown in the Home footer + an `assets/version.txt`
/// asset. Bump this when shipping a new public preview so stakeholders can
/// see at a glance which build they are looking at.
const String kPreviewVersion = 'DerinSplit Preview v2';
