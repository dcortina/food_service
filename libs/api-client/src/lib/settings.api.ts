import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BusinessSettings,
  PublicBranding,
  UpdateBusinessPayload,
} from './api.types';

@Injectable({ providedIn: 'root' })
export class SettingsApi {
  constructor(private readonly http: HttpClient) {}

  getBusiness(): Observable<BusinessSettings> {
    return this.http.get<BusinessSettings>('/api/v1/settings/business');
  }

  updateBusiness(
    payload: UpdateBusinessPayload,
  ): Observable<BusinessSettings> {
    return this.http.patch<BusinessSettings>(
      '/api/v1/settings/business',
      payload,
    );
  }

  getPublicBranding(): Observable<PublicBranding> {
    return this.http.get<PublicBranding>('/api/v1/public/branding');
  }
}
