import { getFirestore } from "@react-native-firebase/firestore";
import { getApp } from "@react-native-firebase/app";

const app = getApp();
const db = getFirestore(app);

const toggleCache = (value: boolean) => {
  if (value) {
    console.log("Disabling network");
    db.disableNetwork();
  } else {
    console.log("Enabling network");
    db.enableNetwork();
  }
};

export default db;
export { toggleCache };
