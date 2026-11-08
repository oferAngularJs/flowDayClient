import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { firebaseAuth } from '../firebase/firebase';

/**
 * Tags API requests with the client name and, when signed in, the user's Firebase ID token
 * so a backend (e.g. Cloud Functions) can verify who is calling.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const user = firebaseAuth.currentUser;
  const tokenPromise = user ? user.getIdToken() : Promise.resolve('');

  return from(tokenPromise).pipe(
    switchMap((token) =>
      next(
        req.clone({
          setHeaders: {
            'X-Client-App': 'Flowday-Angular-LTS',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        })
      )
    )
  );
};
