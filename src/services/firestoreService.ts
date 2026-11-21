import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Bill, BakeryProduct, ShopConfig, CustomerLoyalty } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
  // Silently ignore expected offline, permission, not-found notices when running with local storage fallback
  if (
    errMessage.includes('permission-denied') ||
    errMessage.includes('offline') ||
    errMessage.includes('unavailable') ||
    errMessage.includes('not-found') ||
    errMessage.includes('failed-precondition') ||
    errMessage.includes('grpc') ||
    errMessage.includes('listen') ||
    errMessage.includes('network')
  ) {
    return;
  }
}

const BILLS_COLLECTION = 'bills';
const PRODUCTS_COLLECTION = 'products';
const SETTINGS_COLLECTION = 'settings';
const CUSTOMERS_COLLECTION = 'customers';

export async function saveCustomerToFirestore(customer: CustomerLoyalty): Promise<void> {
  const cleanMobile = customer.customerMobile.replace(/\D/g, '');
  if (!cleanMobile) return;
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, cleanMobile);
    await setDoc(docRef, {
      ...customer,
      customerMobile: cleanMobile,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${CUSTOMERS_COLLECTION}/${cleanMobile}`);
  }
}

export async function fetchCustomersFromFirestore(): Promise<CustomerLoyalty[]> {
  try {
    const snapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    return snapshot.docs.map((d) => d.data() as CustomerLoyalty);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CUSTOMERS_COLLECTION);
    return [];
  }
}

export function subscribeToCustomers(onUpdate: (customers: CustomerLoyalty[]) => void) {
  try {
    return onSnapshot(
      collection(db, CUSTOMERS_COLLECTION),
      (snapshot) => {
        const customers = snapshot.docs.map((d) => d.data() as CustomerLoyalty);
        onUpdate(customers);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, CUSTOMERS_COLLECTION);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, CUSTOMERS_COLLECTION);
    return () => {};
  }
}

export async function deleteCustomerFromFirestore(mobile: string): Promise<void> {
  const cleanMobile = mobile.replace(/\D/g, '');
  if (!cleanMobile) return;
  try {
    await deleteDoc(doc(db, CUSTOMERS_COLLECTION, cleanMobile));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${CUSTOMERS_COLLECTION}/${cleanMobile}`);
  }
}


export async function saveBillToFirestore(bill: Bill): Promise<void> {
  try {
    const docRef = doc(db, BILLS_COLLECTION, bill.id);
    await setDoc(docRef, {
      ...bill,
      items: JSON.stringify(bill.items)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${BILLS_COLLECTION}/${bill.id}`);
  }
}

export async function fetchBillsFromFirestore(): Promise<Bill[]> {
  try {
    const q = query(collection(db, BILLS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items || []
      } as Bill;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, BILLS_COLLECTION);
    return [];
  }
}

export async function deleteBillFromFirestore(billId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, BILLS_COLLECTION, billId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${BILLS_COLLECTION}/${billId}`);
  }
}

export function subscribeToBills(onUpdate: (bills: Bill[]) => void) {
  try {
    const q = query(collection(db, BILLS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        const bills = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            ...data,
            items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items || []
          } as Bill;
        });
        onUpdate(bills);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, BILLS_COLLECTION);
      }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, BILLS_COLLECTION);
    return () => {};
  }
}

export async function saveProductsToFirestore(products: BakeryProduct[]): Promise<void> {
  try {
    for (const prod of products) {
      await setDoc(doc(db, PRODUCTS_COLLECTION, prod.id), prod);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, PRODUCTS_COLLECTION);
  }
}

export async function fetchProductsFromFirestore(): Promise<BakeryProduct[]> {
  try {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    return snapshot.docs.map((d) => d.data() as BakeryProduct);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, PRODUCTS_COLLECTION);
    return [];
  }
}

export async function saveShopConfigToFirestore(config: ShopConfig): Promise<void> {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, 'current'), config);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${SETTINGS_COLLECTION}/current`);
  }
}

export async function fetchShopConfigFromFirestore(): Promise<ShopConfig | null> {
  try {
    const snapshot = await getDocs(collection(db, SETTINGS_COLLECTION));
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as ShopConfig;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, SETTINGS_COLLECTION);
    return null;
  }
}
