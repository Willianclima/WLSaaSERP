/**
 * ============================================================================
 * ⚠️ AURA SAAS PLATFORM - FIREBASE ADAPTER NOTICE
 * ============================================================================
 * O banco de dados transacional, relacional e oficial da plataforma Aura ERP é
 * o PostgreSQL (Cloud SQL) com políticas de RLS e migrações rastreadas.
 * O Firebase provê serviços complementares e de autenticação legada secundária.
 * ============================================================================
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase app singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firestore using dedicated firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Firebase Auth client
export const auth = getAuth(app);

export default app;
