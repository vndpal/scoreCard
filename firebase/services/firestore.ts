import db from "../index";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  getDocsFromCache,
  getDocsFromServer,
  FirebaseFirestoreTypes,
  getDocFromCache,
} from "@react-native-firebase/firestore";

type WhereFilterOp = FirebaseFirestoreTypes.WhereFilterOp;

export const firestoreService = {
  create: async <T extends FirebaseFirestoreTypes.DocumentData>(
    collectionName: string,
    id: string,
    data: T
  ): Promise<void> => {
    try {
      setDoc(doc(db, collectionName, id), data);
    } catch (error: any) {
      console.log("error in creating doc", error);
    }
  },

  createWithAutoId: async <T extends FirebaseFirestoreTypes.DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> => {
    const docRef = doc(collection(db, collectionName));
    setDoc(docRef, data);
    return docRef.id;
  },

  get: async <T>(collectionName: string, id: string): Promise<T | null> => {
    const docSnap = await getDoc(doc(db, collectionName, id));
    return docSnap.exists ? (docSnap.data() as T) : null;
  },

  getAll: async <T>(collectionName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as T)
    );
  },

  getAllFromCache: async <T>(collectionName: string): Promise<T[]> => {
    const querySnapshot = await getDocsFromCache(
      collection(db, collectionName)
    );
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as T)
    );
  },

  getAllOrderby: async <T>(
    collectionName: string,
    orderByField: string,
    direction: "asc" | "desc",
    filters: { field: string; operator: WhereFilterOp; value: any }[]
  ): Promise<T[]> => {
    try {
      const q = query(
        collection(db, collectionName),
        orderBy(orderByField, direction),
        ...filters.map(({ field, operator, value }) =>
          where(field, operator, value)
        )
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as T)
      );
    } catch (error: any) {
      throw error;
    }
  },

  update: async (
    collectionName: string,
    id: string,
    updates: Record<string, any>
  ): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    updateDoc(docRef, updates);
  },

  upsert: async (
    collectionName: string,
    id: string,
    updates: Record<string, any>
  ): Promise<void> => {
    const docRef = doc(db, collectionName, id);
    setDoc(docRef, updates);
  },

  delete: async (collectionName: string, id: string): Promise<void> => {
    deleteDoc(doc(db, collectionName, id));
  },

  query: async <T>(
    collectionName: string,
    filters: { field: string; operator: WhereFilterOp; value: any }[],
    orderByField?: string,
    direction?: "asc" | "desc"
  ): Promise<T[]> => {
    let q: FirebaseFirestoreTypes.Query<FirebaseFirestoreTypes.DocumentData> =
      collection(db, collectionName);
    filters.forEach(({ field, operator, value }) => {
      q = query(q, where(field, operator, value));
    });
    if (orderByField) {
      q = query(q, orderBy(orderByField, direction));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as T)
    );
  },

  getLatest: async <T>(
    collectionName: string,
    filters: { field: string; operator: WhereFilterOp; value: any }[],
    orderByField: string,
    direction: "asc" | "desc"
  ): Promise<T | null> => {
    const q = query(
      collection(db, collectionName),
      ...filters.map(({ field, operator, value }) =>
        where(field, operator, value)
      ),
      orderBy(orderByField, direction),
      limit(1)
    );
    try {
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as T;
    } catch (error: any) {
      console.log("error in getting latest", error);
      return null;
    }
  },

  clearDatabase: async (): Promise<void> => {
    try {
      // Predefined list of collections to clear
      const collections = [
        "matches",
        "matchScores",
        "players",
        "playerCareerStats",
        "playerMatchStats",
        "teams",
        "teamPlayerMapping",
        "clubs",
      ];

      // Clear each collection
      for (const collectionName of collections) {
        await firestoreService.clearCollection(collectionName);
      }

      console.log("Database and local cache reset successfully");
    } catch (error) {
      console.error("Error resetting database:", error);
      throw error;
    }
  },

  clearCollection: async (collectionName: string): Promise<void> => {
    try {
      // Get all documents in batches
      while (true) {
        const snapshot = await getDocs(
          query(collection(db, collectionName), limit(500))
        );

        if (snapshot.empty) {
          break;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          if (collectionName === "matchScores") {
            doc.ref
              .collection("balls")
              .get()
              .then((subSnapshot) => {
                subSnapshot.docs.forEach((subDoc) => {
                  subDoc.ref.delete();
                });
              });
          }
          batch.delete(doc.ref);
        });

        await batch.commit();

        if (snapshot.docs.length < 500) {
          break;
        }
      }

      console.log(`Cleared collection: ${collectionName}`);
    } catch (error) {
      console.error(`Error clearing collection ${collectionName}:`, error);
      throw error;
    }
  },
};
