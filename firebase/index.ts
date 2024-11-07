import firestore from "@react-native-firebase/firestore";

const db = firestore();

let isNetworkEnabled = true;

const toggleCache = () => {
  if (isNetworkEnabled) {
    console.log("Disabling network");
    db.disableNetwork();
  } else {
    console.log("Enabling network");
    db.enableNetwork();
  }
  isNetworkEnabled = !isNetworkEnabled;
};

export default db;
export { toggleCache, isNetworkEnabled };
