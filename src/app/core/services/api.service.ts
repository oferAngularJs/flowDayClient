import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, delay, of, tap } from 'rxjs';

export interface ServerRequestLog {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  endpoint: string;
  status: number;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly baseUrl = '/api/v1';

  readonly requestLogs = signal<ServerRequestLog[]>([]);
  readonly isSyncing = signal<boolean>(false);

  private logRequest(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', endpoint: string, status = 200): void {
    const entry: ServerRequestLog = {
      id: Math.random().toString(36).substring(2, 9),
      method,
      endpoint: `${this.baseUrl}${endpoint}`,
      status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    this.requestLogs.update((logs) => [entry, ...logs.slice(0, 7)]);
  }

  get<T>(endpoint: string, fallback: T): Observable<T> {
    this.isSyncing.set(true);
    return this.http.get<T>(`${this.baseUrl}${endpoint}`).pipe(
      catchError(() => of(fallback).pipe(delay(220))),
      tap(() => {
        this.isSyncing.set(false);
        this.logRequest('GET', endpoint, 200);
      })
    );
  }

  post<T, B>(endpoint: string, body: B, fallback: T): Observable<T> {
    this.isSyncing.set(true);
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body).pipe(
      catchError(() => of(fallback).pipe(delay(280))),
      tap(() => {
        this.isSyncing.set(false);
        this.logRequest('POST', endpoint, 201);
      })
    );
  }

  patch<T, B>(endpoint: string, body: B, fallback: T): Observable<T> {
    this.isSyncing.set(true);
    return this.http.patch<T>(`${this.baseUrl}${endpoint}`, body).pipe(
      catchError(() => of(fallback).pipe(delay(200))),
      tap(() => {
        this.isSyncing.set(false);
        this.logRequest('PATCH', endpoint, 200);
      })
    );
  }
}
