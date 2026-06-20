// pages/_app.js
import '../styles/globals.css';
import { initializeApp } from "firebase/app";
import firebaseConfig from '../firebase/firebaseConfig';

// Initialize Firebase
initializeApp(firebaseConfig);

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />
}

export default MyApp;
