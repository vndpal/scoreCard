import firestore from "@react-native-firebase/firestore";

const db = firestore();

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
