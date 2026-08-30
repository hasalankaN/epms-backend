import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const serviceAccount = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
    
    if (!serviceAccount) {
      console.warn('[FirebaseService] FIREBASE_SERVICE_ACCOUNT not configured');
      return;
    }

    try {
      const serviceAccountJson = JSON.parse(serviceAccount);

      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountJson),
      });

      console.log('[FirebaseService] Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('[FirebaseService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      return await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      throw new Error(`Failed to verify Firebase token: ${error.message}`);
    }
  }

  /**
   * Get user by Firebase UID
   */
  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().getUser(uid);
    } catch (error) {
      throw new Error(`Failed to get Firebase user: ${error.message}`);
    }
  }

  /**
   * Update Firebase user (e.g., change password)
   */
  async updateUser(
    uid: string,
    properties: admin.auth.UpdateRequest,
  ): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().updateUser(uid, properties);
    } catch (error) {
      throw new Error(`Failed to update Firebase user: ${error.message}`);
    }
  }

  /**
   * Create Firebase user
   */
  async createUser(
    userProperties: admin.auth.CreateRequest,
  ): Promise<admin.auth.UserRecord> {
    try {
      return await admin.auth().createUser(userProperties);
    } catch (error) {
      throw new Error(`Failed to create Firebase user: ${error.message}`);
    }
  }

  /**
   * Delete Firebase user
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      throw new Error(`Failed to delete Firebase user: ${error.message}`);
    }
  }
}
