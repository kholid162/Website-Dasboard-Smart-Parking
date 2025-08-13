var firebaseConfig = {
  apiKey: "AIzaSyD6iG5dJCegr5fmz8jcB4H5vE4-zulMxXQ",
  projectId: "smart-parking-48642"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();