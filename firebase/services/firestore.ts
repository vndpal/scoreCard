import db from "../index";
import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

export const firestoreService = {
  create: async <T extends FirebaseFirestoreTypes.DocumentData>(
    collectionName: string,
    id: string,
    data: T
  ): Promise<void> => {
    try {
      await db.collection(collectionName).doc(id).set(data);
    } catch (error) {
      console.error("Error creating document:", error);
      throw error;
    }
  },

  createWithAutoId: async <T extends FirebaseFirestoreTypes.DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> => {
    // const docRef = doc(collection(db, collectionName));
    // await setDoc(docRef, data);
    // return docRef.id;
    return "";
  },

  get: async <T>(collectionName: string, id: string): Promise<T | null> => {
    // const docSnap = await getDoc(doc(db, collectionName, id));
    // return docSnap.exists() ? (docSnap.data() as T) : null;
    return null;
  },

  getAll: async <T>(collectionName: string): Promise<T[]> => {
    // const querySnapshot = await getDocs(collection(db, collectionName));
    // return querySnapshot.docs.map(
    //   (doc) => ({ id: doc.id, ...doc.data() } as T)
    // );
    return [];
  },

  getAllOrderby: async <T>(
    collectionName: string,
    orderByField: string,
    direction: "asc" | "desc"
  ): Promise<T[]> => {
    try {
      // const q = query(
      //   collection(db, collectionName),
      //   orderBy(orderByField, direction)
      // );

      // const querySnapshot = await getDocs(q);

      // return querySnapshot.docs.map(
      //   (doc) => ({ id: doc.id, ...doc.data() } as T)
      // );
      return [];
    } catch (error: any) {
      throw error;
    }
  },

  update: async (
    collectionName: string,
    id: string,
    updates: Record<string, any>
  ): Promise<void> => {
    // const docRef = doc(db, collectionName, id);
    // await updateDoc(docRef, updates);
  },

  upsert: async (
    collectionName: string,
    id: string,
    updates: Record<string, any>
  ): Promise<void> => {
    // const docRef = doc(db, collectionName, id);
    // await setDoc(docRef, updates);
  },

  delete: async (collectionName: string, id: string): Promise<void> => {
    // await deleteDoc(doc(db, collectionName, id));
  },

  query: async <T>(
    collectionName: string,
    filters: {
      field: string;
      operator: FirebaseFirestoreTypes.WhereFilterOp;
      value: any;
    }[]
  ): Promise<T[]> => {
    // let q: Query<DocumentData> = collection(db, collectionName);
    // filters.forEach(({ field, operator, value }) => {
    //   q = query(q, where(field, operator, value));
    // });
    // const querySnapshot = await getDocs(q);
    // return querySnapshot.docs.map(
    //   (doc) => ({ id: doc.id, ...doc.data() } as T)
    // );
    return [];
  },

  getLatest: async <T>(
    collectionName: string,
    orderByField: string,
    direction: "asc" | "desc"
  ): Promise<T | null> => {
    // const q = query(
    //   collection(db, collectionName),
    //   orderBy(orderByField, direction),
    //   limit(1)
    // );
    // const querySnapshot = await getDocs(q);

    // if (querySnapshot.empty) {
    //   return null;
    // }

    // const doc = querySnapshot.docs[0];
    // return { id: doc.id, ...doc.data() } as T;
    return null;
  },
};
