import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppError implements Exception {
  final String code;
  final String message;
  const AppError(this.code, this.message);
  @override
  String toString() => '[$code] $message';
}

class AuthInterceptor extends Interceptor {
  final String Function() tokenProvider;
  AuthInterceptor(this.tokenProvider);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = tokenProvider();
    if (token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    super.onRequest(options, handler);
  }
}

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final code = err.response?.statusCode?.toString() ?? 'NETWORK';
    final msg = err.message ?? 'İstek başarısız';
    handler.reject(
      DioException(
        requestOptions: err.requestOptions,
        error: AppError(code, msg),
        response: err.response,
      ),
    );
  }
}

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: 'https://api.derinsplit.example.com/api/v1',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Accept': 'application/json'},
    ),
  );
  dio.interceptors.addAll([
    AuthInterceptor(() => ''),
    ErrorInterceptor(),
  ]);
  return dio;
});
