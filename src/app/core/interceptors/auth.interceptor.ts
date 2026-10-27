import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token = '';
  try {
    token = localStorage.getItem('flowday_google_token') ?? '';
  } catch {
    token = '';
  }

  const clonedRequest = req.clone({
    setHeaders: {
      'X-Client-App': 'Flowday-Angular-LTS',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  return next(clonedRequest);
};
