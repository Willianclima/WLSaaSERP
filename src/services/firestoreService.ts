/**
 * ============================================================================
 * ⚠️ AURA SAAS ARCHITECTURE: DEPRECATION NOTICE - FIRESTORE DATA SERVICE
 * ============================================================================
 * Conforme estabelecido na consolidação da arquitetura Sprint 1.2.1:
 * - O PostgreSQL (Cloud SQL) é a ÚNICA fonte oficial da verdade (Single Source of Truth)
 *   para todas as entidades essenciais de ERP: organizações, produtos, pedidos,
 *   inventário/ledger e clientes, operando com Row Level Security (RLS) estrito.
 * - Este serviço de Firestore permanece APENAS como adaptador legados ou para
 *   replicação opcional, NÃO devendo concorrer com as rotas PostgreSQL da plataforma.
 * ============================================================================
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
  getDocFromServer,
} from "firebase/firestore";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { db, auth } from "../firebase";
import { ProductItem, Customer, UnifiedOrder, Reseller } from "../types";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Testa a conectividade com o Firestore usando getDocFromServer conforme o skill.
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.warn("[Firestore] Cliente offline ou configuração pendente.");
      return false;
    }
    // Pode retornar not found se o doc não existe, mas conectou
    return true;
  }
}

/**
 * Serviços de Autenticação Firebase (Google Popup)
 */
export const firebaseAuthService = {
  getCurrentUser: (): FirebaseUser | null => auth.currentUser,

  onAuthChange: (callback: (user: FirebaseUser | null) => void): Unsubscribe => {
    return onAuthStateChanged(auth, callback);
  },

  signInWithGoogle: async (): Promise<FirebaseUser> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    return result.user;
  },

  signOut: async (): Promise<void> => {
    await firebaseSignOut(auth);
  },
};

/**
 * Serviços de Firestore em tempo real por Tenant
 */
export const firestoreDataService = {
  // PRODUCTS
  subscribeProducts: (
    tenantId: string,
    onData: (products: ProductItem[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe => {
    const colPath = `tenants/${tenantId}/products`;
    return onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as ProductItem[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, colPath);
        if (onError) onError(error);
      }
    );
  },

  saveProduct: async (tenantId: string, product: ProductItem): Promise<void> => {
    const colPath = `tenants/${tenantId}/products`;
    const docRef = doc(db, colPath, product.id);
    try {
      await setDoc(docRef, { ...product, tenantId, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${colPath}/${product.id}`);
    }
  },

  deleteProduct: async (tenantId: string, productId: string): Promise<void> => {
    const colPath = `tenants/${tenantId}/products`;
    const docRef = doc(db, colPath, productId);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${colPath}/${productId}`);
    }
  },

  // CUSTOMERS
  subscribeCustomers: (
    tenantId: string,
    onData: (customers: Customer[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe => {
    const colPath = `tenants/${tenantId}/customers`;
    return onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Customer[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, colPath);
        if (onError) onError(error);
      }
    );
  },

  saveCustomer: async (tenantId: string, customer: Customer): Promise<void> => {
    const colPath = `tenants/${tenantId}/customers`;
    const docRef = doc(db, colPath, customer.id);
    try {
      await setDoc(docRef, { ...customer, tenantId }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${colPath}/${customer.id}`);
    }
  },

  // ORDERS
  subscribeOrders: (
    tenantId: string,
    onData: (orders: UnifiedOrder[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe => {
    const colPath = `tenants/${tenantId}/orders`;
    return onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as UnifiedOrder[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, colPath);
        if (onError) onError(error);
      }
    );
  },

  saveOrder: async (tenantId: string, order: UnifiedOrder): Promise<void> => {
    const colPath = `tenants/${tenantId}/orders`;
    const docRef = doc(db, colPath, order.id);
    try {
      await setDoc(docRef, { ...order, tenantId }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${colPath}/${order.id}`);
    }
  },

  // RESELLERS
  subscribeResellers: (
    tenantId: string,
    onData: (resellers: Reseller[]) => void,
    onError?: (err: any) => void
  ): Unsubscribe => {
    const colPath = `tenants/${tenantId}/resellers`;
    return onSnapshot(
      collection(db, colPath),
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          ...d.data(),
          id: d.id,
        })) as Reseller[];
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, colPath);
        if (onError) onError(error);
      }
    );
  },

  saveReseller: async (tenantId: string, reseller: Reseller): Promise<void> => {
    const colPath = `tenants/${tenantId}/resellers`;
    const docRef = doc(db, colPath, reseller.id);
    try {
      await setDoc(docRef, { ...reseller, tenantId }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${colPath}/${reseller.id}`);
    }
  },

  /**
   * Seed inicial seguro: Se a coleção do tenant estiver vazia, popula com os dados base
   * para permitir a transição sem perda de experiência visual.
   */
  seedInitialDataIfEmpty: async (
    tenantId: string,
    initialProducts: ProductItem[],
    initialCustomers: Customer[],
    initialOrders: UnifiedOrder[],
    initialResellers: Reseller[]
  ) => {
    try {
      const prodCol = collection(db, `tenants/${tenantId}/products`);
      const prodSnap = await getDocs(prodCol);
      if (prodSnap.empty && initialProducts.length > 0) {
        for (const p of initialProducts) {
          await setDoc(doc(db, `tenants/${tenantId}/products`, p.id), { ...p, tenantId });
        }
      }

      const custCol = collection(db, `tenants/${tenantId}/customers`);
      const custSnap = await getDocs(custCol);
      if (custSnap.empty && initialCustomers.length > 0) {
        for (const c of initialCustomers) {
          await setDoc(doc(db, `tenants/${tenantId}/customers`, c.id), { ...c, tenantId });
        }
      }

      const ordCol = collection(db, `tenants/${tenantId}/orders`);
      const ordSnap = await getDocs(ordCol);
      if (ordSnap.empty && initialOrders.length > 0) {
        for (const o of initialOrders) {
          await setDoc(doc(db, `tenants/${tenantId}/orders`, o.id), { ...o, tenantId });
        }
      }

      const resCol = collection(db, `tenants/${tenantId}/resellers`);
      const resSnap = await getDocs(resCol);
      if (resSnap.empty && initialResellers.length > 0) {
        for (const r of initialResellers) {
          await setDoc(doc(db, `tenants/${tenantId}/resellers`, r.id), { ...r, tenantId });
        }
      }
    } catch (e) {
      console.warn("[Firestore] Nota sobre seed inicial:", e);
    }
  },
};
